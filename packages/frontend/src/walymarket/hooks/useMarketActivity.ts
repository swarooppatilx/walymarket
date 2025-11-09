import { useSuiClient } from '@mysten/dapp-kit';
import { useCallback, useEffect, useState } from 'react';
import useNetworkConfig from '~~/hooks/useNetworkConfig';
import { CONTRACT_PACKAGE_VARIABLE_NAME } from '~~/config/network';

export type MarketEvent =
    | { kind: 'TRADE'; ts: number; address: string; yes: boolean; shares: number; cost: number; buy: boolean }
    | { kind: 'REDEEM'; ts: number; address: string; payout: number };

export type HolderRow = { address: string; yes: number; no: number; total: number };

export const useMarketActivity = (marketId: string, resolution: boolean | null) => {
    const client = useSuiClient();
    const { useNetworkVariable } = useNetworkConfig();
    const packageId = useNetworkVariable(CONTRACT_PACKAGE_VARIABLE_NAME);

    const [events, setEvents] = useState<MarketEvent[]>([]);
    const [holders, setHolders] = useState<HolderRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const load = useCallback(async () => {
        if (!packageId || !marketId) return;
        setLoading(true);
        setError(null);
        try {
            const tradedType = `${packageId}::market::Traded` as const;
            const redeemedType = `${packageId}::market::Redeemed` as const;
            const [tradedRes, redeemedRes] = await Promise.all([
                client.queryEvents({ query: { MoveEventType: tradedType }, order: 'descending', limit: 1000 }),
                client.queryEvents({ query: { MoveEventType: redeemedType }, order: 'descending', limit: 1000 }),
            ]);

            const mkId = marketId;
            const trds: MarketEvent[] = (tradedRes.data || [])
                .filter((e: any) => (e.parsedJson?.market_id || e.parsedJson?.marketId) === mkId)
                .map((e: any) => ({
                    kind: 'TRADE' as const,
                    ts: typeof e.timestampMs === 'string' ? parseInt(e.timestampMs, 10) : e.timestampMs ?? 0,
                    address: e.parsedJson?.trader ?? e.sender ?? '',
                    yes: Boolean(e.parsedJson?.yes),
                    shares: Number(e.parsedJson?.shares ?? 0),
                    cost: Number(e.parsedJson?.cost ?? 0),
                    buy: e.parsedJson?.buy === undefined ? true : Boolean(e.parsedJson?.buy),
                }));

            const reds: MarketEvent[] = (redeemedRes.data || [])
                .filter((e: any) => (e.parsedJson?.market_id || e.parsedJson?.marketId) === mkId)
                .map((e: any) => ({
                    kind: 'REDEEM' as const,
                    ts: typeof e.timestampMs === 'string' ? parseInt(e.timestampMs, 10) : e.timestampMs ?? 0,
                    address: e.parsedJson?.redeemer ?? e.sender ?? '',
                    payout: Number(e.parsedJson?.payout ?? 0),
                }));

            // Merge and sort desc
            const all = [...trds, ...reds].sort((a, b) => b.ts - a.ts);
            setEvents(all);

            // Aggregate holders by replaying trades minus redeems on winning side
            const map = new Map<string, { yes: number; no: number }>();
            for (const e of all.slice().reverse()) {
                if (e.kind === 'TRADE') {
                    const row = map.get(e.address) || { yes: 0, no: 0 };
                    const delta = e.buy ? e.shares : -e.shares;
                    if (e.yes) row.yes += delta; else row.no += delta;
                    map.set(e.address, row);
                } else if (e.kind === 'REDEEM' && resolution != null) {
                    const row = map.get(e.address) || { yes: 0, no: 0 };
                    if (resolution) row.yes = Math.max(0, row.yes - e.payout); else row.no = Math.max(0, row.no - e.payout);
                    map.set(e.address, row);
                }
            }
            const list: HolderRow[] = Array.from(map.entries()).map(([address, v]) => ({ address, yes: v.yes, no: v.no, total: v.yes + v.no }))
                .filter(r => r.total > 0)
                .sort((a, b) => b.total - a.total)
                .slice(0, 20);
            setHolders(list);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [client, marketId, packageId, resolution]);

    useEffect(() => { load(); }, [load]);

    return { events, holders, loading, error, reload: load };
};

export default useMarketActivity;