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

export const prepareCreateMarketTx = (
    packageId: string,
    question: string
): Transaction => {
    const tx = new Transaction();
    tx.moveCall({
        target: fullFunctionName(packageId, 'create_market'),
        arguments: [
            tx.pure.string(question),
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
    tx.moveCall({
        target: fullFunctionName(packageId, 'resolve_market'),
        arguments: [
            tx.object(marketId),
            tx.pure.bool(winningOutcomeYes),
        ],
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