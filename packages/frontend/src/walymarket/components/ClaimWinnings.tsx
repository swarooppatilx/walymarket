import { useEffect, useState } from 'react';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { Button, Card, Flex, Text } from '@radix-ui/themes';
import useNetworkConfig from '~~/hooks/useNetworkConfig';
import { CONTRACT_PACKAGE_VARIABLE_NAME, EXPLORER_URL_VARIABLE_NAME } from '~~/config/network';
import { Market } from '~~/walymarket/types';
import useTransact from '@suiware/kit/useTransact';
import { SuiSignAndExecuteTransactionOutput } from '@mysten/wallet-standard';
import { prepareClaimWinningsTx } from '~~/walymarket/helpers/transactions';
import { notification } from '~~/helpers/notification';
import { fullStructName, transactionUrl } from '~~/helpers/network';

export const ClaimWinnings = ({ market, onClaimed }: { market: Market; onClaimed?: () => void }) => {
    const current = useCurrentAccount();
    const client = useSuiClient();
    const { useNetworkVariable } = useNetworkConfig();
    const packageId = useNetworkVariable(CONTRACT_PACKAGE_VARIABLE_NAME);
    const explorerUrl = useNetworkVariable(EXPLORER_URL_VARIABLE_NAME);

    const [tickets, setTickets] = useState<Array<{ id: string; amountPaid: number; outcome: boolean; payoutMist?: number | null }>>([]);
    const [loading, setLoading] = useState(false);
    const winningLabel = market.resolution === true ? 'YES' : market.resolution === false ? 'NO' : 'Unknown';
    const totalPoolSnapshotMist = (market.totalAtResolution ?? market.totalPool) ?? 0;
    const totalPoolDisplay = (totalPoolSnapshotMist / 1_000_000_000).toFixed(3);
    const winningPoolSnapshotMist = market.winningPoolAtResolution ?? null;


    const loadTickets = async () => {
        if (!current?.address || !packageId) return;
        setLoading(true);
        try {
            // Fetch owned ShareTicket objects
            const type = fullStructName(packageId, 'ShareTicket');
            const res = await client.getOwnedObjects({
                owner: current.address,
                filter: { StructType: type },
                options: { showContent: true },
            });
            const parsed = (res.data || []).map((o: any) => {
                const fields = o.data?.content?.fields;
                return fields ? {
                    id: o.data.objectId as string,
                    marketId: fields.market_id as string,
                    outcome: Boolean(fields.outcome),
                    amountPaid: typeof fields.amount_paid === 'string' ? parseInt(fields.amount_paid, 10) : Number(fields.amount_paid),
                } : undefined;
            }).filter(Boolean) as Array<{ id: string; marketId: string; outcome: boolean; amountPaid: number }>;

            const winningOutcome = market.resolution ?? null;
            const eligible = parsed.filter(
                (t) => t.marketId === market.id && (winningOutcome === null || t.outcome === winningOutcome)
            );

            const computed = eligible.map(({ id, amountPaid, outcome }) => {
                const payoutMist = winningPoolSnapshotMist && winningPoolSnapshotMist > 0
                    ? Math.floor((amountPaid * totalPoolSnapshotMist) / winningPoolSnapshotMist)
                    : null;
                return { id, amountPaid, outcome, payoutMist };
            });
            setTickets(computed);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTickets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current?.address, packageId, market.id, market.resolved, market.resolution]);

    const { transact } = useTransact({
        onSuccess: (result: SuiSignAndExecuteTransactionOutput) => {
            notification.txSuccess(transactionUrl(explorerUrl, result.digest));
            onClaimed?.();
            loadTickets();
        },
        onError: (err: Error) => {
            notification.txError(err);
        },
    });

    const claim = (ticketId: string) => {
        if (!packageId) return;
        const tx = prepareClaimWinningsTx(packageId, market.id, ticketId);
        transact(tx);
    };

    if (!market.resolved || !current) return null;

    return (
        <Card>
            <Flex direction="column" gap="3">
                <Text weight="bold">Claim winnings</Text>
                <Text size="1" color="gray">
                    Outcome resolved to {winningLabel}. Total pooled: {totalPoolDisplay} SUI
                </Text>
                {winningPoolSnapshotMist === 0 && (
                    <Text color="red" size="1">
                        Winning pool is empty; no payouts available for this outcome.
                    </Text>
                )}
                {loading && <Text color="gray">Loading your tickets…</Text>}
                {!loading && tickets.length === 0 && (
                    <Text color="gray">No winning tickets found for this market.</Text>
                )}
                {!loading && tickets.length > 0 && (
                    <Flex direction="column" gap="2">
                        {tickets.map((t) => (
                            <Flex key={t.id} align="center" justify="between" className="border-t pt-2 mt-2">
                                <Flex direction="column" gap="1">
                                    <Text size="2">Ticket {t.id.slice(0, 8)}… — Stake {(t.amountPaid / 1_000_000_000).toFixed(4)} SUI</Text>
                                    {t.payoutMist != null && (
                                        <Text size="1" color="gray">
                                            Est. payout {(t.payoutMist / 1_000_000_000).toFixed(4)} SUI (Profit {((t.payoutMist - t.amountPaid) / 1_000_000_000).toFixed(4)} SUI)
                                        </Text>
                                    )}
                                </Flex>
                                <Button onClick={() => claim(t.id)}>Claim</Button>
                            </Flex>
                        ))}
                    </Flex>
                )}
            </Flex>
        </Card>
    );
};
