import { useEffect, useMemo, useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Button, Card, Flex, Text, TextField } from '@radix-ui/themes';
import useTransact from '@suiware/kit/useTransact';
import { SuiSignAndExecuteTransactionOutput } from '@mysten/wallet-standard';
import { Market } from '~~/walymarket/types';
import useNetworkConfig from '~~/hooks/useNetworkConfig';
import { CONTRACT_PACKAGE_VARIABLE_NAME, EXPLORER_URL_VARIABLE_NAME } from '~~/config/network';
import { notification } from '~~/helpers/notification';
import { transactionUrl } from '~~/helpers/network';
import { prepareBuySharesTx } from '~~/walymarket/helpers/transactions';

const formatPercent = (val: number) => `${Math.round(val * 100)}%`;

export const TradeWidget = ({ market, onTrade }: { market: Market; onTrade?: () => void }) => {
    const [selectedOutcome, setSelectedOutcome] = useState<'Yes' | 'No' | null>(null);
    const [amountSUI, setAmountSUI] = useState('');
    const [pending, setPending] = useState(false);
    const currentAccount = useCurrentAccount();
    const { useNetworkVariable } = useNetworkConfig();
    const packageId = useNetworkVariable(CONTRACT_PACKAGE_VARIABLE_NAME);
    const explorerUrl = useNetworkVariable(EXPLORER_URL_VARIABLE_NAME);
    const { transact } = useTransact({
        onSuccess: (result: SuiSignAndExecuteTransactionOutput) => {
            notification.txSuccess(transactionUrl(explorerUrl, result.digest));
            setPending(false);
            onTrade?.();
        },
        onError: (err: Error) => {
            notification.txError(err);
            setPending(false);
        },
    });

    const handleTrade = () => {
        if (!selectedOutcome || !amountSUI || !packageId) return;

        const amountMIST = Math.floor(parseFloat(amountSUI) * 1_000_000_000);
        if (isNaN(amountMIST) || amountMIST <= 0) {
            notification.error(null, 'Please enter a valid amount.');
            return;
        }

        const tx = prepareBuySharesTx(packageId, market.id, amountMIST, selectedOutcome === 'Yes');
        setPending(true);
        transact(tx);
    };

    // Derived payout estimate for the selected outcome
    const payoutEstimate = useMemo(() => {
        if (!selectedOutcome) return null;
        const stake = parseFloat(amountSUI || '0');
        if (isNaN(stake) || stake <= 0) return null;
        const mistStake = stake * 1_000_000_000;
        const yesPool = market.yesPool;
        const noPool = market.noPool;
        // Simulate pools after adding stake to chosen side for expected payout if it wins
        const simulatedYes = selectedOutcome === 'Yes' ? yesPool + mistStake : yesPool;
        const simulatedNo = selectedOutcome === 'No' ? noPool + mistStake : noPool;
        const totalPoolAfter = simulatedYes + simulatedNo;
        const winningPoolAfter = selectedOutcome === 'Yes' ? simulatedYes : simulatedNo;
        if (winningPoolAfter <= 0) return null;
        const payoutMist = (mistStake * totalPoolAfter) / winningPoolAfter;
        const payoutSUI = payoutMist / 1_000_000_000;
        const profit = payoutSUI - stake;
        return { payoutSUI, profit };
    }, [selectedOutcome, amountSUI, market.yesPool, market.noPool]);

    // Reset selection when market resolves (future-proof; if resolved prop added)
    useEffect(() => {
        if (market.resolved) {
            setSelectedOutcome(null);
            setAmountSUI('');
        }
    }, [market.resolved]);

    return (
        <Card size="3">
            <Flex direction="column" gap="4">
                <Text weight="bold">Place Bet</Text>
                <Flex gap="2">
                    <Button style={{ width: '100%' }} variant={selectedOutcome === 'Yes' ? 'solid' : 'outline'} onClick={() => setSelectedOutcome('Yes')}>Yes ({formatPercent(market.yesChance)})</Button>
                    <Button style={{ width: '100%' }} variant={selectedOutcome === 'No' ? 'solid' : 'outline'} onClick={() => setSelectedOutcome('No')}>No ({formatPercent(market.noChance)})</Button>
                </Flex>
                <Flex direction="column" gap="1">
                    <Text size="1" color="gray">Pool Yes: {(market.yesPool / 1_000_000_000).toFixed(3)} SUI • Pool No: {(market.noPool / 1_000_000_000).toFixed(3)} SUI • Total: {(market.totalPool / 1_000_000_000).toFixed(3)} SUI</Text>
                </Flex>

                <TextField.Root
                    size="3"
                    placeholder="0.0 SUI"
                    type="number"
                    value={amountSUI}
                    onChange={(e) => setAmountSUI(e.target.value)}
                />

                {payoutEstimate && (
                    <Text size="2" color="gray">
                        Est. payout: {payoutEstimate.payoutSUI.toFixed(4)} SUI (Profit {payoutEstimate.profit >= 0 ? '+' : ''}{payoutEstimate.profit.toFixed(4)} SUI)
                    </Text>
                )}
                <Button size="3" onClick={handleTrade} disabled={market.resolved || !currentAccount || !selectedOutcome || !amountSUI || pending}>
                    {pending ? 'Submitting...' : `Bet ${amountSUI || '0'} SUI on ${selectedOutcome || '...'}`}
                </Button>
            </Flex>
        </Card>
    );
};