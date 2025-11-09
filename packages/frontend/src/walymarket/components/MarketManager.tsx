import { useState } from 'react';
import { Button, Card, Flex, Text, Tooltip, Separator, Avatar, Badge } from '@radix-ui/themes';
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
        <Card className="market-card-sds" style={{ padding: 16 }}>
            <Flex direction="column" gap="3">
                <Flex justify="between" align="center" wrap="wrap" gap="2">
                    <Text weight="bold" style={{ fontSize: 16 }}>Active Markets</Text>
                    <Text size="1" color="gray">Resolve once outcome is certain. This action is final.</Text>
                </Flex>
                <Separator my="2" size="4" />
                {markets.length === 0 && <Text color="gray">No active markets.</Text>}
                <div className="grid gap-3 md:grid-cols-2">
                    {markets.map((m) => (
                        <Card key={m.id} className="market-card-sds" style={{ padding: 14 }}>
                            <Flex align="start" gap="3" wrap="wrap" justify="between">
                                <Flex align="start" gap="3" style={{ minWidth: '260px', flex: '1 1 360px' }}>
                                    {m.imageUrl ? (
                                        <img src={m.imageUrl} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.15)' }} />
                                    ) : (
                                        <Avatar fallback="M" size="4" radius="medium" />
                                    )}
                                    <Flex direction="column" gap="2">
                                        <Text weight="bold">{m.title || m.question}</Text>
                                        {m as any && (
                                            <Text size="1" color="gray" className="line-clamp-2">
                                                {/* optional description if present */}
                                                {((m as any).description as string | undefined) || ''}
                                            </Text>
                                        )}
                                        <Flex gap="2" align="center" wrap="wrap">
                                            <Badge variant="soft" color="green">YES {(m.yesChance * 100).toFixed(1)}%</Badge>
                                            <Badge variant="soft" color="red">NO {(m.noChance * 100).toFixed(1)}%</Badge>
                                            <Text size="1" color="gray">Y {formatPool(m.yesPool)} · N {formatPool(m.noPool)}</Text>
                                        </Flex>
                                    </Flex>
                                </Flex>
                                <Flex gap="2" align="center">
                                    <Tooltip content="Resolve YES">
                                        <Button
                                            className="btn-sds-ghost"
                                            onClick={() => handleResolve(m.id, true)}
                                            disabled={pendingMarketId === m.id}
                                            size="1"
                                        >
                                            {pendingMarketId === m.id ? 'Resolving…' : 'Resolve YES'}
                                        </Button>
                                    </Tooltip>
                                    <Tooltip content="Resolve NO">
                                        <Button
                                            className="btn-sds-ghost"
                                            onClick={() => handleResolve(m.id, false)}
                                            disabled={pendingMarketId === m.id}
                                            size="1"
                                        >
                                            {pendingMarketId === m.id ? 'Resolving…' : 'Resolve NO'}
                                        </Button>
                                    </Tooltip>
                                </Flex>
                            </Flex>
                        </Card>
                    ))}
                </div>
            </Flex>
        </Card>
    );
};

function formatPool(v: number): string {
    return (v / 1_000_000_000).toFixed(2) + ' SUI';
}
