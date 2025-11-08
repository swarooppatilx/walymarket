import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Flex, Text, Button } from '@radix-ui/themes';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import useNetworkConfig from '~~/hooks/useNetworkConfig';
import { CONTRACT_PACKAGE_VARIABLE_NAME, EXPLORER_URL_VARIABLE_NAME } from '~~/config/network';
import { Market } from '~~/walymarket/types';
import { formatSui, shortId } from '~~/walymarket/helpers/format';
import useTransact from '@suiware/kit/useTransact';
import { prepareClaimAllWinningsTx, prepareClaimWinningsTx } from '~~/walymarket/helpers/transactions';
import { notification } from '~~/helpers/notification';
import { SuiSignAndExecuteTransactionOutput } from '@mysten/wallet-standard';
import { fullStructName, transactionUrl } from '~~/helpers/network';

interface TicketPosition {
    id: string;
    marketId: string;
    outcome: boolean;
    amountPaid: number; // mist
}

export const UserPositions = ({ market, onAction }: { market: Market; onAction?: () => void }) => {
    const current = useCurrentAccount();
    const client = useSuiClient();
    const { useNetworkVariable } = useNetworkConfig();
    const packageId = useNetworkVariable(CONTRACT_PACKAGE_VARIABLE_NAME);
    const explorerUrl = useNetworkVariable(EXPLORER_URL_VARIABLE_NAME);
    const [tickets, setTickets] = useState<TicketPosition[]>([]);
    const [loading, setLoading] = useState(false);
    const [claimingAll, setClaimingAll] = useState(false);

    const load = useCallback(async () => {
        if (!current?.address || !packageId) return;
        setLoading(true);
        try {
            const type = fullStructName(packageId, 'ShareTicket');
            const res = await client.getOwnedObjects({
                owner: current.address,
                filter: { StructType: type },
                options: { showContent: true },
            });
            const parsed = (res.data || []).map((o: any) => {
                const fields = o.data?.content?.fields;
                if (!fields) return undefined;
                return {
                    id: o.data.objectId as string,
                    marketId: fields.market_id as string,
                    outcome: Boolean(fields.outcome),
                    amountPaid: typeof fields.amount_paid === 'string' ? parseInt(fields.amount_paid, 10) : Number(fields.amount_paid),
                } as TicketPosition;
            }).filter(Boolean) as TicketPosition[];
            setTickets(parsed.filter(t => t.marketId === market.id));
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [client, current?.address, packageId, market.id]);

    useEffect(() => { load(); }, [load]);

    // Current projected payout if outcome wins (using current pools, not snapshot)
    const yesPool = market.yesPool;
    const noPool = market.noPool;
    const totalPool = yesPool + noPool;
    const projectedMultiplierYes = yesPool > 0 ? totalPool / yesPool : 1;
    const projectedMultiplierNo = noPool > 0 ? totalPool / noPool : 1;

    const enriched = useMemo(() => {
        return tickets.map(t => {
            const multiplier = t.outcome ? projectedMultiplierYes : projectedMultiplierNo;
            const projectedPayout = Math.floor(t.amountPaid * multiplier);
            return { ...t, projectedPayout, multiplier };
        });
    }, [tickets, projectedMultiplierYes, projectedMultiplierNo]);

    const totalStakeMist = useMemo(() => tickets.reduce((acc, t) => acc + t.amountPaid, 0), [tickets]);
    const totalProjectedPayoutMist = useMemo(() => enriched.reduce((acc, t) => acc + t.projectedPayout, 0), [enriched]);

    const { transact } = useTransact({
        onSuccess: (r: SuiSignAndExecuteTransactionOutput) => {
            const link = explorerUrl ? transactionUrl(explorerUrl, r.digest) : null;
            link ? notification.txSuccess(link) : notification.success(`Transaction ${r.digest} submitted.`);
            onAction?.();
            load();
        },
        onError: (err: Error) => notification.txError(err),
    });

    const claimAll = () => {
        if (!packageId || !market.resolved) return;
        const ids = enriched.filter(t => market.resolution != null && t.outcome === market.resolution).map(t => t.id);
        if (!ids.length) return;
        setClaimingAll(true);
        try {
            const tx = prepareClaimAllWinningsTx(packageId, market.id, ids);
            transact(tx);
        } finally {
            setClaimingAll(false);
        }
    };

    if (!current) return null;

    return (
        <Card>
            <Flex direction="column" gap="3">
                <Flex justify="between" align="center" wrap="wrap" gap="2">
                    <Text weight="bold">Your Positions</Text>
                    <Button size="1" variant="soft" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</Button>
                </Flex>
                {tickets.length === 0 && !loading && (
                    <Text color="gray" size="1">You have no tickets for this market yet.</Text>
                )}
                {loading && <Text color="gray" size="1">Loading tickets…</Text>}
                {!loading && tickets.length > 0 && (
                    <Flex direction="column" gap="2">
                        {enriched.map(t => (
                            <Flex key={t.id} justify="between" align="center" className="border-t pt-2 mt-2" wrap="wrap" gap="2">
                                <Flex direction="column" gap="1">
                                    <Text size="2">{shortId(t.id)} • Outcome {t.outcome ? 'YES' : 'NO'}</Text>
                                    <Text size="1" color="gray">Stake {formatSui(t.amountPaid)} SUI • Multiplier {t.multiplier.toFixed(2)}× • Projected Payout {formatSui(t.projectedPayout)} SUI</Text>
                                </Flex>
                                {market.resolved && market.resolution != null && t.outcome === market.resolution && (
                                    <Button size="1" onClick={() => {
                                        const single = prepareClaimWinningsTx(packageId!, market.id, t.id);
                                        transact(single);
                                    }}>Claim</Button>
                                )}
                            </Flex>
                        ))}
                        <Card asChild>
                            <div>
                                <Text size="1" color="gray">Total stake {formatSui(totalStakeMist)} SUI • Total projected payout {formatSui(totalProjectedPayoutMist)} SUI</Text>
                            </div>
                        </Card>
                        {market.resolved && market.resolution != null && enriched.filter(t => t.outcome === market.resolution).length > 1 && (
                            <Button size="2" variant="solid" color="jade" disabled={claimingAll} onClick={claimAll}>
                                {claimingAll ? 'Claiming…' : 'Claim All Winning Tickets'}
                            </Button>
                        )}
                    </Flex>
                )}
            </Flex>
        </Card>
    );
};

export default UserPositions;
