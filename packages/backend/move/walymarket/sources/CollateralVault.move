module walymarket::collateral_vault;

use sui::balance::Balance;
use sui::coin::Coin;
use sui::sui::SUI;

/// Collateral vault attached to a market. Holds SUI for now (can be generalized later).
public struct Vault has key, store {
    id: sui::object::UID,
    market_id: sui::object::ID,
    collateral: Balance<SUI>,
}

public fun new(market_id: sui::object::ID, ctx: &mut sui::tx_context::TxContext): Vault {
    Vault { id: sui::object::new(ctx), market_id, collateral: sui::balance::zero<SUI>() }
}

public fun deposit(v: &mut Vault, coin: Coin<SUI>) {
    let bal = coin.into_balance();
    v.collateral.join(bal);
}

public fun withdraw_balance(
    v: &mut Vault,
    amount: u64,
    ctx: &mut sui::tx_context::TxContext,
): Coin<SUI> {
    let bal = v.collateral.split(amount);
    bal.into_coin(ctx)
}

public fun balance_of(v: &Vault): u64 { v.collateral.value() }

public fun market_of(v: &Vault): sui::object::ID { v.market_id }
