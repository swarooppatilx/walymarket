import { useCallback, useEffect, useState } from 'react';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import UIButton from '~~/components/ui/Button';
import UICard from '~~/components/ui/Card';
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


    const loadTickets = useCallback(async () => {
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
    }, [client, current?.address, packageId, market.id, market.resolution, totalPoolSnapshotMist, winningPoolSnapshotMist]);

    useEffect(() => {
        loadTickets();
    }, [loadTickets]);

    const { transact } = useTransact({
        onSuccess: (result: SuiSignAndExecuteTransactionOutput) => {
            const link = explorerUrl ? transactionUrl(explorerUrl, result.digest) : null;
            if (link) {
                notification.txSuccess(link);
            } else {
                notification.success(`Transaction ${result.digest} submitted.`);
            }
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
        <UICard className="p-4">
            <div className="flex flex-col gap-3">
                <h3 className="text-base font-bold text-white">Claim Winnings</h3>
                <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-400">
                        Outcome resolved to {winningLabel}. Total pooled: {totalPoolDisplay} SUI
                    </p>
                    <UIButton size="sm" variant="ghost" onClick={loadTickets} disabled={loading}>
                        Refresh tickets
                    </UIButton>
                </div>

                {winningPoolSnapshotMist !== null && winningPoolSnapshotMist === 0 && (
                    <p className="text-xs text-red-400">
                        Winning pool is empty; no payouts available for this outcome.
                    </p>
                )}

                {loading && <p className="text-sm text-gray-400">Loading your tickets…</p>}
                {!loading && tickets.length === 0 && (
                    <p className="text-sm text-gray-400">No winning tickets found for this market.</p>
                )}

                {!loading && tickets.length > 0 && (
                    <div className="flex flex-col gap-2">
                        {tickets.map((t) => (
                            <div key={t.id} className="flex items-center justify-between border-t border-[#535353] pt-2 mt-2">
                                <div className="flex flex-col gap-1">
                                    <p className="text-sm text-white">Ticket {t.id.slice(0, 8)}… — Stake {(t.amountPaid / 1_000_000_000).toFixed(4)} SUI</p>
                                    {t.payoutMist != null && (
                                        <p className="text-xs text-gray-400">
                                            Est. payout {(t.payoutMist / 1_000_000_000).toFixed(4)} SUI (Profit {((t.payoutMist - t.amountPaid) / 1_000_000_000).toFixed(4)} SUI)
                                        </p>
                                    )}
                                </div>
                                <UIButton size="sm" onClick={() => claim(t.id)}>Claim</UIButton>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </UICard>
    );
};
