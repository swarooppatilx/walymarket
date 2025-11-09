module walymarket::walrus_oracle_adapter;

use walymarket::market;

/// Errors
const EINVALID_PROOF: u64 = 1;

/// A lightweight proof object. In production this would be a signature/attestation verified on-chain.
public struct Proof has drop, store { data: vector<u8> }

/// Dummy verification for now. Replace with real Walrus verification logic.
fun verify(_market_id: sui::object::ID, _result: bool, _proof: &Proof): bool { true }

/// Submit oracle result; verifies proof and finalizes resolution in Market.
public fun submit_result(m: &mut market::Market, result: bool, proof: Proof) {
    assert!(verify(market::id_of(m), result, &proof), EINVALID_PROOF);
    // drop proof
    let Proof { data: _ } = proof;
    market::resolve(m, result);
}
