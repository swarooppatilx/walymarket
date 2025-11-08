import { useSuiClient } from '@mysten/dapp-kit';
import { useCallback, useEffect, useMemo, useState } from 'react';
import useNetworkConfig from '~~/hooks/useNetworkConfig';
import { CONTRACT_PACKAGE_VARIABLE_NAME } from '~~/config/network';
import { fullStructName } from '~~/helpers/network';

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
            const type = fullStructName(packageId, 'SharesBought');
            // Fetch recent events (limited for now; TODO: paginate if needed)
            const res = await client.queryEvents({
                query: { MoveEventType: type },
                order: 'descending',
                limit: 500,
            });
            const now = Date.now();
            const minTs = timeframe === 'ALL' ? 0 : now - timeframeToMs[(timeframe as Exclude<Timeframe, 'ALL'>)];
            // Filter to this market and timeframe, then reverse to chronological
            const events = (res.data || [])
                .filter((e: any) => {
                    const parsed = e.parsedJson;
                    if (!parsed) return false;
                    const id = parsed.market_id || parsed.marketId;
                    const ts = typeof e.timestampMs === 'string' ? parseInt(e.timestampMs, 10) : e.timestampMs ?? 0;
                    return id === marketId && ts >= minTs;
                })
                .reverse();

            // Reconstruct pools over time and compute prices
            let yesPool = 0;
            let noPool = 0;
            const series: PricePoint[] = [];
            events.forEach((e: any) => {
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
