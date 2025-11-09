module walymarket::outcome_token;

/// Outcome token represents redeemable YES/NO shares for a specific market.
public struct OutcomeToken has key, store {
    id: sui::object::UID,
    market_id: sui::object::ID,
    yes: bool,
    amount: u64,
}

public fun new(
    market_id: sui::object::ID,
    yes: bool,
    amount: u64,
    ctx: &mut sui::tx_context::TxContext,
): OutcomeToken {
    OutcomeToken { id: sui::object::new(ctx), market_id, yes, amount }
}

public fun amount_of(t: &OutcomeToken): u64 { t.amount }

public fun market_of(t: &OutcomeToken): sui::object::ID { t.market_id }

public fun is_yes(t: &OutcomeToken): bool { t.yes }

/// Split off an amount from the token, returning a new token.
public fun split(
    t: &mut OutcomeToken,
    amount: u64,
    ctx: &mut sui::tx_context::TxContext,
): OutcomeToken {
    assert!(amount <= t.amount, 0);
    t.amount = t.amount - amount;
    new(t.market_id, t.yes, amount, ctx)
}

/// Merge two tokens of the same market and side.
public fun merge(dst: &mut OutcomeToken, src: OutcomeToken) {
    let OutcomeToken { id, market_id, yes, amount } = src;
    assert!(dst.market_id == market_id && dst.yes == yes, 1);
    dst.amount = dst.amount + amount;
    sui::object::delete(id);
}

/// Transfer helper for convenience.
public fun transfer_to(t: OutcomeToken, recipient: address) {
    sui::transfer::public_transfer(t, recipient)
}

/// Burn the token (used when redeeming winning side).
public fun burn(t: OutcomeToken) {
    let OutcomeToken { id, market_id: _, yes: _, amount: _ } = t;
    sui::object::delete(id);
}
