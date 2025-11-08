import { useState } from 'react';
import { Button, Card, Flex, Text } from '@radix-ui/themes';
import useTransact from '@suiware/kit/useTransact';
import { SuiSignAndExecuteTransactionOutput } from '@mysten/wallet-standard';
import useNetworkConfig from '~~/hooks/useNetworkConfig';
import { CONTRACT_PACKAGE_VARIABLE_NAME, EXPLORER_URL_VARIABLE_NAME } from '~~/config/network';
import { Market } from '~~/walymarket/types';
import { prepareResolveMarketTx } from '~~/walymarket/helpers/transactions';
import { notification } from '~~/helpers/notification';
import { transactionUrl } from '~~/helpers/network';

export const MarketManager = ({ markets, onResolved }: { markets: Market[]; onResolved?: () => void }) => {
    const { useNetworkVariable } = useNetworkConfig();
    const packageId = useNetworkVariable(CONTRACT_PACKAGE_VARIABLE_NAME);
    const explorerUrl = useNetworkVariable(EXPLORER_URL_VARIABLE_NAME);
    const [pendingMarketId, setPendingMarketId] = useState<string | null>(null);

    const { transact } = useTransact({
        onSuccess: (result: SuiSignAndExecuteTransactionOutput) => {
            const link = explorerUrl ? transactionUrl(explorerUrl, result.digest) : null;
            if (link) {
                notification.txSuccess(link);
            } else {
                notification.success(`Transaction ${result.digest} submitted.`);
            }
            setPendingMarketId(null);
            onResolved?.();
        },
        onError: (err: Error) => {
            notification.txError(err);
            setPendingMarketId(null);
        },
    });

    const handleResolve = (marketId: string, winningYes: boolean) => {
        if (!packageId) return;
        const tx = prepareResolveMarketTx(packageId, marketId, winningYes);
        setPendingMarketId(marketId);
        transact(tx);
    };

    return (
        <Card>
            <Flex direction="column" gap="3">
                <Text weight="bold">Active Markets</Text>
                {markets.length === 0 && <Text color="gray">No active markets.</Text>}
                {markets.map((m) => (
                    <Flex key={m.id} align="center" justify="between" className="border-t pt-2 mt-2">
                        <Flex direction="column" gap="1" style={{ maxWidth: '65%' }}>
                            <Text>{m.question}</Text>
                            <Text size="1" color="gray">
                                Yes {(m.yesChance * 100).toFixed(1)}% ({(m.yesPool / 1_000_000_000).toFixed(2)} SUI) • No {(m.noChance * 100).toFixed(1)}% ({(m.noPool / 1_000_000_000).toFixed(2)} SUI)
                            </Text>
                        </Flex>
                        <Flex gap="2">
                            <Button
                                variant="solid"
                                onClick={() => handleResolve(m.id, true)}
                                disabled={pendingMarketId === m.id}
                            >
                                {pendingMarketId === m.id ? 'Resolving...' : 'Resolve YES'}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleResolve(m.id, false)}
                                disabled={pendingMarketId === m.id}
                            >
                                {pendingMarketId === m.id ? 'Resolving...' : 'Resolve NO'}
                            </Button>
                        </Flex>
                    </Flex>
                ))}
            </Flex>
        </Card>
    );
};
