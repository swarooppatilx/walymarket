import { useCallback, useEffect, useMemo, useState } from 'react';
import UICard from '~~/components/ui/Card';
import UIButton from '~~/components/ui/Button';
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
            // Legacy tickets
            const legacyType = fullStructName(packageId, 'ShareTicket');
            const legacyRes = await client.getOwnedObjects({
                owner: current.address,
                filter: { StructType: legacyType },
                options: { showContent: true },
            });
            const legacy = (legacyRes.data || []).map((o: any) => {
                const f = o.data?.content?.fields;
                if (!f) return null;
                return {
                    id: o.data.objectId,
                    marketId: f.market_id,
                    outcome: Boolean(f.outcome),
                    amountPaid: Number(f.amount_paid),
                } as TicketPosition;
            }).filter(Boolean) as TicketPosition[];

            // V2 outcome tokens
            const outcomeType = `${packageId}::outcome_token::OutcomeToken` as const;
            const outcomeRes = await client.getOwnedObjects({ owner: current.address, options: { showContent: true } });
            const v2 = (outcomeRes.data || []).map((o: any) => {
                const c = o.data?.content;
                if (c?.dataType !== 'moveObject' || c.type !== outcomeType) return null;
                const f = c.fields;
                return {
                    id: o.data.objectId,
                    marketId: f.market_id,
                    outcome: Boolean(f.yes),
                    amountPaid: Number(f.amount),
                } as TicketPosition;
            }).filter(Boolean) as TicketPosition[];

            const combined = [...legacy, ...v2].filter(t => t.marketId === market.id);
            setTickets(combined);
        } catch (e) {
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
        <UICard className="p-4">
            <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center flex-wrap gap-2">
                    <h3 className="text-base font-bold text-white">Your Positions</h3>
                    <UIButton size="sm" variant="ghost" onClick={load} disabled={loading}>
                        {loading ? 'Loading…' : 'Refresh'}
                    </UIButton>
                </div>

                {tickets.length === 0 && !loading && (
                    <p className="text-sm text-gray-400">You have no tickets for this market yet.</p>
                )}
                {loading && <p className="text-sm text-gray-400">Loading tickets…</p>}

                {!loading && tickets.length > 0 && (
                    <div className="flex flex-col gap-2">
                        {enriched.map(t => (
                            <div key={t.id} className="flex justify-between items-center border-t border-[#535353] pt-2 mt-2 flex-wrap gap-2">
                                <div className="flex flex-col gap-1">
                                    <p className="text-sm text-white">{shortId(t.id)} • Outcome {t.outcome ? 'YES' : 'NO'}</p>
                                    <p className="text-xs text-gray-400">
                                        Stake {formatSui(t.amountPaid)} SUI • Multiplier {t.multiplier.toFixed(2)}× • Projected Payout {formatSui(t.projectedPayout)} SUI
                                    </p>
                                </div>
                                {market.resolved && market.resolution != null && t.outcome === market.resolution && (
                                    <UIButton size="sm" onClick={() => {
                                        const single = prepareClaimWinningsTx(packageId!, market.id, t.id);
                                        transact(single);
                                    }}>
                                        Claim
                                    </UIButton>
                                )}
                            </div>
                        ))}
                        
                        <UICard className="p-3 mt-2">
                            <p className="text-xs text-gray-400">
                                Total stake {formatSui(totalStakeMist)} SUI • Total projected payout {formatSui(totalProjectedPayoutMist)} SUI
                            </p>
                        </UICard>

                        {market.resolved && market.resolution != null && enriched.filter(t => t.outcome === market.resolution).length > 1 && (
                            <UIButton
                                variant="primary"
                                className="w-full bg-[#B6F34E] hover:bg-[#9ED93A] text-black"
                                disabled={claimingAll}
                                loading={claimingAll}
                                onClick={claimAll}
                            >
                                {claimingAll ? 'Claiming…' : 'Claim All Winning Tickets'}
                            </UIButton>
                        )}
                    </div>
                )}
            </div>
        </UICard>
    );
};

export default UserPositions;
