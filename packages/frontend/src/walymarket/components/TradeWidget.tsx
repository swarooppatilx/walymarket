import { useEffect, useMemo, useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Button, Card, Flex, Text, TextField, Spinner } from '@radix-ui/themes';
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
            const link = explorerUrl ? transactionUrl(explorerUrl, result.digest) : null;
            if (link) {
                notification.txSuccess(link);
            } else {
                notification.success(`Transaction ${result.digest} submitted.`);
            }
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
        const yesOddsAfter = simulatedYes / totalPoolAfter;
        const noOddsAfter = simulatedNo / totalPoolAfter;
        return { payoutSUI, profit, yesOddsAfter, noOddsAfter };
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
                <Text weight="bold" size="4">Place Bet</Text>

                {market.resolved && (
                    <Card variant="surface" style={{ background: 'rgba(229,72,77,0.1)', border: '1px solid rgba(229,72,77,0.2)' }}>
                        <Text size="2" color="red" weight="medium">
                            Market Resolved • Trading Closed
                        </Text>
                    </Card>
                )}

                {!currentAccount && !market.resolved && (
                    <Card variant="surface" style={{ background: 'rgba(255,200,0,0.1)', border: '1px solid rgba(255,200,0,0.2)' }}>
                        <Text size="2" weight="medium">
                            Connect wallet to trade
                        </Text>
                    </Card>
                )}

                <Flex direction="column" gap="2">
                    <Text size="2" color="gray" weight="medium">Select Outcome</Text>
                    <Flex gap="2">
                        <Button
                            style={{ flex: 1 }}
                            size="2"
                            color="green"
                            variant={selectedOutcome === 'Yes' ? 'solid' : 'soft'}
                            onClick={() => setSelectedOutcome('Yes')}
                            disabled={market.resolved || !currentAccount}
                        >
                            <Flex align="center" gap="2">
                                <Text weight="bold">Yes</Text>
                                <Text size="1">{formatPercent(market.yesChance)}</Text>
                            </Flex>
                        </Button>
                        <Button
                            style={{ flex: 1 }}
                            size="2"
                            color="red"
                            variant={selectedOutcome === 'No' ? 'solid' : 'soft'}
                            onClick={() => setSelectedOutcome('No')}
                            disabled={market.resolved || !currentAccount}
                        >
                            <Flex align="center" gap="2">
                                <Text weight="bold">No</Text>
                                <Text size="1">{formatPercent(market.noChance)}</Text>
                            </Flex>
                        </Button>
                    </Flex>
                </Flex>

                <Flex direction="column" gap="2">
                    <Text size="2" color="gray" weight="medium">Amount (SUI)</Text>
                    <TextField.Root
                        size="3"
                        placeholder="Enter amount..."
                        type="number"
                        value={amountSUI}
                        onChange={(e) => setAmountSUI(e.target.value)}
                        disabled={market.resolved || !currentAccount || !selectedOutcome}
                    />
                    <Flex justify="between" wrap="wrap" gap="1">
                        <Text size="1" color="gray">Liquidity: {(market.totalPool / 1_000_000_000).toFixed(2)} SUI</Text>
                        {selectedOutcome && (
                            <Text size="1" color="gray">
                                {selectedOutcome} pool: {((selectedOutcome === 'Yes' ? market.yesPool : market.noPool) / 1_000_000_000).toFixed(2)} SUI
                            </Text>
                        )}
                    </Flex>
                </Flex>

                {payoutEstimate && selectedOutcome && (
                    <Card variant="surface" style={{ background: 'rgba(70,167,88,0.08)' }}>
                        <Flex direction="column" gap="2">
                            <Text size="2" weight="medium">Expected Returns</Text>
                            <Flex direction="column" gap="1">
                                <Flex justify="between">
                                    <Text size="2" color="gray">If {selectedOutcome} wins:</Text>
                                    <Text size="2" weight="bold">{payoutEstimate.payoutSUI.toFixed(3)} SUI</Text>
                                </Flex>
                                <Flex justify="between">
                                    <Text size="2" color="gray">Profit:</Text>
                                    <Text size="2" weight="bold" color={payoutEstimate.profit >= 0 ? 'jade' : 'red'}>
                                        {payoutEstimate.profit >= 0 ? '+' : ''}{payoutEstimate.profit.toFixed(3)} SUI
                                    </Text>
                                </Flex>
                                <Flex justify="between">
                                    <Text size="1" color="gray">New price:</Text>
                                    <Text size="1" color="gray">
                                        {selectedOutcome === 'Yes'
                                            ? `${(payoutEstimate.yesOddsAfter * 100).toFixed(1)}%`
                                            : `${(payoutEstimate.noOddsAfter * 100).toFixed(1)}%`}
                                    </Text>
                                </Flex>
                            </Flex>
                        </Flex>
                    </Card>
                )}

                <Button
                    size="3"
                    onClick={handleTrade}
                    disabled={market.resolved || !currentAccount || !selectedOutcome || !amountSUI || pending}
                    style={{ width: '100%' }}
                >
                    {pending ? (
                        <Flex align="center" gap="2">
                            <Spinner /> Submitting...
                        </Flex>
                    ) : (
                        selectedOutcome && amountSUI
                            ? `Bet ${parseFloat(amountSUI).toFixed(2)} SUI on ${selectedOutcome}`
                            : 'Enter amount to trade'
                    )}
                </Button>
            </Flex>
        </Card>
    );
};