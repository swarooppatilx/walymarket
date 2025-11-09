module walymarket::market_factory;

use std::string::String;
use walymarket::market as MarketModule;

/// Admin capability for permissioned creation in testnet
public struct AdminCap has key, store { id: sui::object::UID }

/// Module init: mint AdminCap to deployer
fun init(ctx: &mut sui::tx_context::TxContext) {
    sui::transfer::public_transfer(AdminCap { id: sui::object::new(ctx) }, ctx.sender());
}

/// Create a new market using the admin cap (shared object)
entry fun create_with_cap(
    _cap: &AdminCap,
    title: String,
    description: String,
    image_url: String,
    b: u64,
    expiry: u64,
    ctx: &mut sui::tx_context::TxContext,
) {
    MarketModule::create_and_share(title, description, image_url, b, expiry, ctx);
}

/// Permissionless creation variant.
entry fun create_permissionless(
    title: String,
    description: String,
    image_url: String,
    b: u64,
    expiry: u64,
    ctx: &mut sui::tx_context::TxContext,
) {
    MarketModule::create_and_share(title, description, image_url, b, expiry, ctx);
}
