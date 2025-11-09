module walymarket::market;

use std::string::String;
use sui::coin::Coin;
use sui::event;
use sui::sui::SUI;
use walymarket::collateral_vault::{Self as CollateralVault, Vault};
use walymarket::lmsr;
use walymarket::outcome_token::{Self as OutcomeToken, OutcomeToken as OutcomeTokenStruct};

// Errors
const EMarketResolved: u64 = 1;
const EWrongMarket: u64 = 2;

/// Market object with LMSR state and embedded collateral vault
public struct Market has key, store {
    id: sui::object::UID,
    title: String,
    question: String,
    description: String,
    image_url: String,
    b: u64, // liquidity parameter
    q_yes: u64,
    q_no: u64,
    expiry: u64, // unix seconds
    resolved: bool,
    resolution: bool,
    vault: Vault,
}

// Events for dapp consumption
public struct MarketCreated has copy, drop {
    market_id: sui::object::ID,
    title: String,
    question: String,
    image_url: String,
}
public struct Traded has copy, drop {
    market_id: sui::object::ID,
    trader: address,
    buy: bool, // true = buy, false = sell
    yes: bool,
    shares: u64,
    cost: u64, // buy: collateral spent, sell: collateral refunded
}
public struct MarketResolved has copy, drop { market_id: sui::object::ID, winner: bool }
public struct Redeemed has copy, drop { market_id: sui::object::ID, redeemer: address, payout: u64 }

/// Create a new market (callable by a factory or admin)
public fun create(
    title: String,
    description: String,
    image_url: String,
    b: u64,
    expiry: u64,
    ctx: &mut sui::tx_context::TxContext,
): Market {
    // Create a UID first so we can derive its ID for the child vault
    let uid = sui::object::new(ctx);
    let market_id = sui::object::uid_to_inner(&uid);
    let vault = CollateralVault::new(market_id, ctx);
    let m = Market {
        id: uid,
        title,
        // keep legacy question field populated for backward-compatibility
        question: title,
        description,
        image_url,
        b,
        q_yes: 0,
        q_no: 0,
        expiry,
        resolved: false,
        resolution: false,
        vault,
    };
    event::emit(MarketCreated {
        market_id,
        title: m.title,
        question: m.question,
        image_url: m.image_url,
    });
    m
}

/// Create and share a market object in a single call (callable from factory).
public entry fun create_and_share(
    title: String,
    description: String,
    image_url: String,
    b: u64,
    expiry: u64,
    ctx: &mut sui::tx_context::TxContext,
) {
    let m = create(title, description, image_url, b, expiry, ctx);
    sui::transfer::share_object(m);
}

/// View: current prices as fixed-point (1e6)
public fun price_yes_fp(m: &Market): u64 { lmsr::price_yes(m.q_yes, m.q_no, m.b) }

public fun price_no_fp(m: &Market): u64 { lmsr::price_no(m.q_yes, m.q_no, m.b) }

public fun id_of(m: &Market): sui::object::ID { sui::object::uid_to_inner(&m.id) }

/// Quote the approximate cost for buying `delta` shares on a side.
public fun quote_cost(m: &Market, yes: bool, delta: u64): u64 {
    lmsr::estimate_cost(m.q_yes, m.q_no, m.b, yes, delta)
}

/// Trade function: spend entire `payment` to buy YES/NO shares at LMSR price.
/// Returns an OutcomeToken of purchased side with the estimated shares.
public fun trade(
    m: &mut Market,
    payment: Coin<SUI>,
    yes: bool,
    ctx: &mut sui::tx_context::TxContext,
): OutcomeTokenStruct {
    assert!(!m.resolved, EMarketResolved);
    let amount = payment.value();
    // Deposit all collateral to vault
    CollateralVault::deposit(&mut m.vault, payment);
    // Binary-search number of shares purchasable for 'amount'
    let max_delta = solve_max_delta(m.q_yes, m.q_no, m.b, yes, amount);
    if (yes) { m.q_yes = m.q_yes + max_delta; } else { m.q_no = m.q_no + max_delta; };
    let token = OutcomeToken::new(sui::object::uid_to_inner(&m.id), yes, max_delta, ctx);
    event::emit(Traded {
        market_id: sui::object::uid_to_inner(&m.id),
        trader: ctx.sender(),
        buy: true,
        yes,
        shares: max_delta,
        cost: amount,
    });
    token
}

/// Entry-compatible wrapper to trade and transfer the resulting token to the caller.
entry fun trade_and_transfer(
    m: &mut Market,
    payment: Coin<SUI>,
    yes: bool,
    ctx: &mut sui::tx_context::TxContext,
) {
    let token = trade(m, payment, yes, ctx);
    walymarket::outcome_token::transfer_to(token, ctx.sender());
}

/// Quote approximate refund for selling `delta` shares of a side.
public fun quote_refund(m: &Market, yes: bool, delta: u64): u64 {
    if (delta == 0) return 0;
    // Refund equals cost difference when moving quantities backward.
    if (yes) {
        assert!(delta <= m.q_yes, 3);
        lmsr::estimate_cost(m.q_yes - delta, m.q_no, m.b, true, delta)
    } else {
        assert!(delta <= m.q_no, 3);
        lmsr::estimate_cost(m.q_yes, m.q_no - delta, m.b, false, delta)
    }
}

/// Sell outcome shares for refund. Burns portion of the token representing sold shares.
public fun sell(
    m: &mut Market,
    token: &mut OutcomeTokenStruct,
    amount: u64,
    ctx: &mut sui::tx_context::TxContext,
): Coin<SUI> {
    assert!(!m.resolved, EMarketResolved);
    assert!(OutcomeToken::market_of(token) == sui::object::uid_to_inner(&m.id), EWrongMarket);
    assert!(amount > 0 && amount <= OutcomeToken::amount_of(token), 4);
    let yes_side = OutcomeToken::is_yes(token);
    if (yes_side) { assert!(amount <= m.q_yes, 5); } else { assert!(amount <= m.q_no, 6); };
    let refund = if (yes_side) {
        lmsr::estimate_cost(m.q_yes - amount, m.q_no, m.b, true, amount)
    } else {
        lmsr::estimate_cost(m.q_yes, m.q_no - amount, m.b, false, amount)
    };
    // Adjust market pools
    if (yes_side) { m.q_yes = m.q_yes - amount; } else { m.q_no = m.q_no - amount; };
    // Split & burn sold portion
    let sold = OutcomeToken::split(token, amount, ctx);
    OutcomeToken::burn(sold);
    // Withdraw collateral refund
    let coin = CollateralVault::withdraw_balance(&mut m.vault, refund, ctx);
    event::emit(Traded {
        market_id: sui::object::uid_to_inner(&m.id),
        trader: ctx.sender(),
        buy: false,
        yes: yes_side,
        shares: amount,
        cost: refund,
    });
    coin
}

/// Entry wrapper for selling and transferring refund coin to caller.
entry fun sell_and_transfer(
    m: &mut Market,
    token: &mut OutcomeTokenStruct,
    amount: u64,
    ctx: &mut sui::tx_context::TxContext,
) {
    let coin = sell(m, token, amount, ctx);
    sui::transfer::public_transfer(coin, ctx.sender());
}

/// Resolve the market with the given winning side.
public fun resolve(m: &mut Market, winner_yes: bool) {
    assert!(!m.resolved, EMarketResolved);
    m.resolved = true;
    m.resolution = winner_yes;
    event::emit(MarketResolved { market_id: sui::object::uid_to_inner(&m.id), winner: winner_yes });
}

/// Entry wrapper to resolve a market from a transaction.
entry fun resolve_entry(m: &mut Market, winner_yes: bool) {
    resolve(m, winner_yes);
}

/// Redeem winning outcome tokens for collateral at 1:1.
public fun redeem(
    m: &mut Market,
    token: OutcomeTokenStruct,
    ctx: &mut sui::tx_context::TxContext,
): Coin<SUI> {
    assert!(m.resolved, EMarketResolved);
    assert!(OutcomeToken::market_of(&token) == sui::object::uid_to_inner(&m.id), EWrongMarket);
    assert!(OutcomeToken::is_yes(&token) == m.resolution, EWrongMarket);
    let payout = OutcomeToken::amount_of(&token);
    // burn token
    OutcomeToken::burn(token);
    let coin = CollateralVault::withdraw_balance(&mut m.vault, payout, ctx);
    event::emit(Redeemed {
        market_id: sui::object::uid_to_inner(&m.id),
        redeemer: ctx.sender(),
        payout,
    });
    coin
}

/// Helper: solve max delta via monotonic binary search s.t. estimated cost <= amount
fun solve_max_delta(qy: u64, qn: u64, b: u64, yes: bool, amount: u64): u64 {
    let mut lo: u64 = 0;
    let mut hi: u64 = amount; // cannot buy more shares than budget if price<=1
    let mut ans: u64 = 0;
    let mut i = 0;
    while (i < 20) {
        // 20 iterations
        let mid = (lo + hi) / 2;
        let cost = lmsr::estimate_cost(qy, qn, b, yes, mid);
        if (cost <= amount) {
            ans = mid;
            lo = mid + 1;
        } else {
            if (mid == 0) { break };
            hi = mid - 1;
        };
        i = i + 1;
    };
    ans
}
