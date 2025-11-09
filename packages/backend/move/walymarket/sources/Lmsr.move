module walymarket::lmsr;

/// Fixed-point scale factor. All fractional values are represented as value * SCALE.
/// We choose 1e6 as a balance between precision and overflow safety in u128 intermediates.
const SCALE: u64 = 1_000_000;
const INV_SCALE: u128 = 1_000_000u128; // helper for division with u128

/// Multiply two fixed-point numbers (scaled by SCALE), returning fixed-point.
public fun mul_fp(a: u64, b: u64): u64 {
    (((a as u128) * (b as u128)) / (INV_SCALE)) as u64
}

/// Divide two fixed-point numbers (a/b), returning fixed-point.
public fun div_fp(a: u64, b: u64): u64 {
    if (b == 0) { 0 } else { (((a as u128) * INV_SCALE) / (b as u128)) as u64 }
}

/// Convert integer to fixed-point (x * SCALE)
public fun to_fp(x: u64): u64 { x * SCALE }

/// Convert fixed-point to integer by truncation (x / SCALE)
public fun from_fp(x: u64): u64 { x / SCALE }

/// Approximate exp(x) where x is fixed-point scaled by SCALE and x in [0, 8].
/// Uses a 5th-degree Taylor series with range reduction: exp(x) = (exp(x/k))^k, k=4.
/// WARNING: Deterministic approximation; adequate for pricing, not for scientific use.
public fun exp_fp(x_fp: u64): u64 {
    // Clamp to [0, 8]
    let eight_fp = 8 * SCALE;
    let x_clamped = if (x_fp > eight_fp) { eight_fp } else { x_fp };

    // Range reduction: exp(x) = (exp(x/4))^4
    let k: u64 = 4;
    let xk_fp: u64 = x_clamped / k;
    let e_xk = exp_taylor_5(xk_fp);
    // pow_int(e_xk, k)
    let mut acc = e_xk;
    let mut i = 1;
    while (i < k) {
        acc = mul_fp(acc, e_xk);
        i = i + 1;
    };
    acc
}

/// 5th order Taylor polynomial for exp(x) at 0 for fixed-point x in [0,2].
fun exp_taylor_5(x_fp: u64): u64 {
    // Terms: 1 + x + x^2/2! + x^3/6 + x^4/24 + x^5/120
    let one_fp: u64 = SCALE;
    let x1_fp: u64 = x_fp;
    let x2_fp: u64 = mul_fp(x1_fp, x1_fp);
    let x3_fp: u64 = mul_fp(x2_fp, x1_fp);
    let x4_fp: u64 = mul_fp(x3_fp, x1_fp);
    let x5_fp: u64 = mul_fp(x4_fp, x1_fp);

    let mut sum = one_fp;
    sum = sum + x1_fp; // + x
    sum = sum + x2_fp / 2; // + x^2/2
    sum = sum + x3_fp / 6; // + x^3/6
    sum = sum + x4_fp / 24; // + x^4/24
    sum = sum + x5_fp / 120; // + x^5/120
    sum
}

/// Compute softmax probability p_yes given q_yes, q_no and liquidity b.
/// Inputs are in integer "shares"; we map to fixed-point by dividing by b and scaling.
/// p_yes = exp(qy/b) / (exp(qy/b) + exp(qn/b))
public fun price_yes(q_yes: u64, q_no: u64, b: u64): u64 {
    if (b == 0) return SCALE;
    // x = (q/b) in fixed-point
    let qy_over_b_fp: u64 = (((q_yes as u128) * (SCALE as u128) / (b as u128)) as u64);
    let qn_over_b_fp: u64 = (((q_no as u128) * (SCALE as u128) / (b as u128)) as u64);

    let e_qy = exp_fp(qy_over_b_fp);
    let e_qn = exp_fp(qn_over_b_fp);
    let denom = e_qy + e_qn;
    if (denom == 0) return SCALE / 2;
    div_fp(e_qy, denom)
}

/// Price for NO is simply 1 - p_yes
public fun price_no(q_yes: u64, q_no: u64, b: u64): u64 { SCALE - price_yes(q_yes, q_no, b) }

/// Estimate cost for buying delta shares on a side using midpoint Riemann sum with fixed number of steps.
/// Returns cost in the same unit as "shares" (assume 1 share == 1 unit of collateral).
/// Deterministic and gas-bounded; accuracy increases with STEPS.
public fun estimate_cost(q_yes: u64, q_no: u64, b: u64, buy_yes: bool, delta: u64): u64 {
    if (delta == 0) return 0;
    let steps: u64 = 10; // trade-off accuracy/gas
    let step: u64 = if (delta < steps) { 1 } else { delta / steps };
    let mut consumed: u64 = 0;
    let mut cost_fp: u64 = 0;
    let mut qy = q_yes;
    let mut qn = q_no;
    while (consumed < delta) {
        let take = if (delta - consumed < step) { delta - consumed } else { step };
        let p_fp = if (buy_yes) { price_yes(qy, qn, b) } else { price_no(qy, qn, b) };
        // cost += p * take in fixed-point
        let take_fp = to_fp(take);
        cost_fp = cost_fp + mul_fp(p_fp, take_fp);
        // advance quantities
        if (buy_yes) { qy = qy + take; } else { qn = qn + take; };
        consumed = consumed + take;
    };
    from_fp(cost_fp)
}

/// Estimate refund for selling `delta` shares by reversing quantities.
/// For a YES sale, refund = C(qy, qn) - C(qy - delta, qn).
/// We approximate by summing prices as we move backward in `delta` steps.
public fun estimate_refund(q_yes: u64, q_no: u64, b: u64, sell_yes: bool, delta: u64): u64 {
    if (delta == 0) return 0;
    let steps: u64 = 10;
    let step: u64 = if (delta < steps) { 1 } else { delta / steps };
    let mut consumed: u64 = 0;
    let mut refund_fp: u64 = 0;
    let mut qy = q_yes;
    let mut qn = q_no;
    while (consumed < delta) {
        let take = if (delta - consumed < step) { delta - consumed } else { step };
        // Move state backward first, then take price at new state
        if (sell_yes) { qy = qy - take; } else { qn = qn - take; };
        let p_fp = if (sell_yes) { price_yes(qy, qn, b) } else { price_no(qy, qn, b) };
        let take_fp = to_fp(take);
        refund_fp = refund_fp + mul_fp(p_fp, take_fp);
        consumed = consumed + take;
    };
    from_fp(refund_fp)
}
