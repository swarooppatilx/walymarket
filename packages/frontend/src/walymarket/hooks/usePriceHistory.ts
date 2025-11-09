import { useSuiClient } from '@mysten/dapp-kit';
import { useCallback, useEffect, useMemo, useState } from 'react';
import useNetworkConfig from '~~/hooks/useNetworkConfig';
import { CONTRACT_PACKAGE_VARIABLE_NAME } from '~~/config/network';

export type PricePoint = { ts: number; yes: number; no: number };

export type Timeframe = '1H' | '24H' | '7D' | '1M' | 'ALL';

const timeframeToMs: Record<Exclude<Timeframe, 'ALL'>, number> = {
    '1H': 60 * 60 * 1000,
    '24H': 24 * 60 * 60 * 1000,
    '7D': 7 * 24 * 60 * 60 * 1000,
    '1M': 30 * 24 * 60 * 60 * 1000,
};

export const usePriceHistory = (marketId: string, timeframe: Timeframe = '24H') => {
    const client = useSuiClient();
    const { useNetworkVariable } = useNetworkConfig();
    const packageId = useNetworkVariable(CONTRACT_PACKAGE_VARIABLE_NAME);

    const [points, setPoints] = useState<PricePoint[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const load = useCallback(async () => {
        if (!packageId || !marketId) return;
        setLoading(true);
        setError(null);
        try {
            const now = Date.now();
            const minTs = timeframe === 'ALL' ? 0 : now - timeframeToMs[(timeframe as Exclude<Timeframe, 'ALL'>)];

            // Fetch the market object to get current liquidity parameter b.
            const marketObj = await client.getObject({ id: marketId, options: { showContent: true } });
            const fields = (marketObj.data?.content as any)?.fields ?? {};
            const b = Number(fields.b ?? 0) || 1;

            // Try v2 events first (market::Traded); if none, fallback to legacy (walymarket::walymarket::SharesBought)
            const v2Type = `${packageId}::market::Traded` as const;
            let evts = await client.queryEvents({ query: { MoveEventType: v2Type }, order: 'descending', limit: 1000 });
            const getEvtMarketId = (e: any): string | null => {
                const v = e?.parsedJson?.market_id ?? e?.parsedJson?.marketId;
                if (!v) return null;
                if (typeof v === 'string') return v;
                if (typeof v === 'object' && typeof v.id === 'string') return v.id;
                return null;
            };
            let events = (evts.data || []).filter((e: any) => getEvtMarketId(e) === marketId);

            let series: PricePoint[] = [];
            if (events.length > 0) {
                // Build forward from genesis (q_yes = 0, q_no = 0) to show evolution naturally.
                const chronological = [...events].sort((a: any, bEvt: any) => {
                    const ta = typeof a.timestampMs === 'string' ? parseInt(a.timestampMs, 10) : a.timestampMs ?? 0;
                    const tb = typeof bEvt.timestampMs === 'string' ? parseInt(bEvt.timestampMs, 10) : bEvt.timestampMs ?? 0;
                    return ta - tb;
                });
                let qy = 0;
                let qn = 0;
                for (const e of chronological) {
                    const parsed: any = e.parsedJson || {};
                    const ts = typeof e.timestampMs === 'string' ? parseInt(e.timestampMs, 10) : e.timestampMs ?? 0;
                    if (ts < minTs) continue; // skip outside timeframe
                    const shares = Number(parsed.shares ?? parsed.amount ?? 0);
                    const isYes = Boolean(parsed.yes ?? parsed.outcome);
                    const isBuy = parsed.buy === undefined ? true : Boolean(parsed.buy);
                    const delta = isBuy ? shares : -shares;
                    if (isYes) { qy += delta; } else { qn += delta; }
                    const yes = lmsrYes(qy, qn, b);
                    const no = 1 - yes;
                    series.push({ ts, yes, no });
                }
            } else {
                // Legacy fallback: reconstruct pool ratios from SharesBought amounts.
                const legacyType = `${packageId}::walymarket::SharesBought` as const;
                const res = await client.queryEvents({ query: { MoveEventType: legacyType }, order: 'descending', limit: 500 });
                const legacy = (res.data || [])
                    .filter((e: any) => {
                        const parsed = e.parsedJson;
                        if (!parsed) return false;
                        const id = parsed.market_id || parsed.marketId;
                        const ts = typeof e.timestampMs === 'string' ? parseInt(e.timestampMs, 10) : e.timestampMs ?? 0;
                        return id === marketId && ts >= minTs;
                    })
                    .reverse();
                let yesPool = 0;
                let noPool = 0;
                legacy.forEach((e: any) => {
                    const parsed = e.parsedJson!;
                    const amount = typeof parsed.amount === 'string' ? parseInt(parsed.amount, 10) : Number(parsed.amount);
                    const outcome = Boolean(parsed.outcome);
                    if (outcome) yesPool += amount; else noPool += amount;
                    const total = yesPool + noPool;
                    const yes = total > 0 ? yesPool / total : 0.5;
                    const no = total > 0 ? noPool / total : 0.5;
                    const ts = typeof e.timestampMs === 'string' ? parseInt(e.timestampMs, 10) : e.timestampMs ?? 0;
                    series.push({ ts, yes, no });
                });
            }

            setPoints(series);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [client, marketId, packageId, timeframe]);

    useEffect(() => { load(); }, [load]);

    const last = points.at(-1);
    const firstIn24h = useMemo(() => {
        if (!points.length) return undefined;
        const boundary = Date.now() - 24 * 60 * 60 * 1000;
        for (let i = points.length - 1; i >= 0; i--) {
            if (points[i].ts <= boundary) return points[i];
        }
        return points[0];
    }, [points]);

    return { points, loading, error, reload: load, last, firstIn24h };
};

export default usePriceHistory;

// Local LMSR price calculation for UI: p_yes = exp(qy/b) / (exp(qy/b) + exp(qn/b))
function lmsrYes(qy: number, qn: number, b: number): number {
    if (!isFinite(qy) || !isFinite(qn) || !isFinite(b) || b <= 0) return 0.5;
    const y = qy / b;
    const n = qn / b;
    const m = Math.max(y, n);
    const ey = Math.exp(y - m);
    const en = Math.exp(n - m);
    const denom = ey + en;
    if (denom <= 0) return 0.5;
    return ey / denom;
}
