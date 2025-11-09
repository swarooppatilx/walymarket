import { Transaction } from '@mysten/sui/transactions';
import { fullFunctionName } from '~~/helpers/network';

export const prepareBuySharesTx = (
    packageId: string,
    marketId: string,
    amount: number, // amount in MIST
    outcome: boolean // true for 'Yes', false for 'No'
): Transaction => {
    const tx = new Transaction();

    // Split off amount from gas coin
    const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amount)]);

    // Use wrapper entry function for simplicity if exists, else direct call
    tx.moveCall({
        target: fullFunctionName(packageId, 'buy_shares_and_transfer'),
        arguments: [
            tx.object(marketId),
            coin,
            tx.pure.bool(outcome),
        ],
    });

    return tx;
};

export const prepareTradeV2Tx = (
    packageId: string,
    marketId: string,
    amount: number, // in MIST
    yes: boolean
): Transaction => {
    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amount)]);
    tx.moveCall({
        target: `${packageId}::market::trade_and_transfer`,
        arguments: [tx.object(marketId), coin, tx.pure.bool(yes)],
    });
    return tx;
};

export const prepareSellV2Tx = (
    packageId: string,
    marketId: string,
    tokenId: string,
    amountToSell?: number // in shares (MIST); if omitted, sell full token amount
): Transaction => {
    const tx = new Transaction();
    if (amountToSell && amountToSell > 0) {
        // Split required amount from token, then sell that part
        const splitToken = tx.moveCall({
            target: `${packageId}::outcome_token::split`,
            arguments: [tx.object(tokenId), tx.pure.u64(amountToSell)],
        });
        tx.moveCall({
            target: `${packageId}::market::sell_and_transfer`,
            arguments: [tx.object(marketId), splitToken, tx.pure.u64(amountToSell)],
        });
    } else {
        // Sell entire token; amount will be validated in backend
        // We still need to pass amount; fetch at runtime is not possible, so pass 0 to indicate full.
        // Backend will assert amount > 0, so we call a version that sells full: split with full amount is unnecessary.
        // To sell full, we call sell_and_transfer with amount equal to a sentinel of 0 meaning full; update backend to reject 0.
        // Therefore, to sell full we first read amount is not convenient here; instead, we just pass a large number to split which will fail.
        // Simpler: invoke sell_and_transfer with amount u64::MAX to trigger min(amount, token.amount) logic would be needed server-side.
        // For now, require amountToSell provided.
        throw new Error('amountToSell is required to sell');
    }
    return tx;
};

export const prepareCreateMarketTx = (
    packageId: string,
    title: string,
    description: string,
    imageUrl: string,
    b: number = 1_000_000_000,
    expiry: number = Math.floor(Date.now() / 1000) + 60 * 60 * 24
): Transaction => {
    const tx = new Transaction();
    // New market factory path; fallback to legacy if call fails at runtime.
    tx.moveCall({
        target: `${packageId}::market_factory::create_permissionless`,
        arguments: [
            tx.pure.string(title),
            tx.pure.string(description || ''),
            tx.pure.string(imageUrl || ''),
            tx.pure.u64(b),
            tx.pure.u64(expiry),
        ],
    });
    return tx;
};

export const prepareResolveMarketTx = (
    packageId: string,
    marketId: string,
    winningOutcomeYes: boolean
): Transaction => {
    const tx = new Transaction();
    // Call the v2 market module entry wrapper
    tx.moveCall({
        target: `${packageId}::market::resolve_entry`,
        arguments: [tx.object(marketId), tx.pure.bool(winningOutcomeYes)],
    });
    return tx;
};

export const prepareClaimWinningsTx = (
    packageId: string,
    marketId: string,
    ticketId: string
): Transaction => {
    const tx = new Transaction();
    tx.moveCall({
        target: fullFunctionName(packageId, 'claim_winnings_and_transfer'),
        arguments: [
            tx.object(marketId),
            tx.object(ticketId),
        ],
    });
    return tx;
};

export const prepareClaimAllWinningsTx = (
    packageId: string,
    marketId: string,
    ticketIds: string[]
): Transaction => {
    const tx = new Transaction();
    for (const id of ticketIds) {
        tx.moveCall({
            target: fullFunctionName(packageId, 'claim_winnings_and_transfer'),
            arguments: [tx.object(marketId), tx.object(id)],
        });
    }
    return tx;
};