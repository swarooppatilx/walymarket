import { useSuiClient } from '@mysten/dapp-kit';
import { useCallback, useEffect, useState } from 'react';
import useNetworkConfig from '~~/hooks/useNetworkConfig';
import { CONTRACT_PACKAGE_VARIABLE_NAME } from '~~/config/network';
import { Market } from '~~/walymarket/types';

// Legacy parseBalance removed (unused in LMSR v2).

const parseU64Field = (value: any): number => {
    if (value == null) return 0;
    return typeof value === 'string' ? parseInt(value, 10) : Number(value);
};

const parseFromObjectResponse = (resp: any): Market | undefined => {
    if (!resp?.data) return undefined;
    const fields = resp.data.content?.dataType === 'moveObject' ? resp.data.content.fields : undefined;
    if (!fields) return undefined;
    // v2 market fields (LMSR): q_yes, q_no
    const yesPool = parseU64Field(fields.q_yes ?? 0);
    const noPool = parseU64Field(fields.q_no ?? 0);
    const b = parseU64Field(fields.b ?? 0) || 1;
    const totalPool = yesPool + noPool;
    const resolved = !!fields.resolved;
    const resolution = resolved ? Boolean(fields.resolution) : null;
    const totalAtResolution = null;
    const winningPoolAtResolution = null;
    const pYes = lmsrYes(yesPool, noPool, b);
    return {
        id: resp.data.objectId,
        title: fields.title ?? undefined,
        question: (fields.title ?? fields.question ?? '') as string,
        description: fields.description ?? undefined,
        imageUrl: fields.image_url ?? undefined,
        yesPool,
        noPool,
        totalPool,
        b,
        yesChance: pYes,
        noChance: 1 - pYes,
        resolved,
        resolution,
        totalAtResolution,
        winningPoolAtResolution,
    };
};

export const useGetMarkets = () => {
    const client = useSuiClient();
    const { useNetworkVariable } = useNetworkConfig();
    const packageId = useNetworkVariable(CONTRACT_PACKAGE_VARIABLE_NAME);

    const [activeMarkets, setActiveMarkets] = useState<Market[]>([]);
    const [resolvedMarkets, setResolvedMarkets] = useState<Market[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const load = useCallback(async () => {
        if (!packageId) {
            setActiveMarkets([]);
            setResolvedMarkets([]);
            setIsLoading(false);
            setError(null);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            // New module name for v2 markets
            const eventType = `${packageId}::market::MarketCreated` as const;
            const events = await client.queryEvents({
                query: { MoveEventType: eventType },
                limit: 100,
                order: 'descending',
            });
            const ids = Array.from(
                new Set(
                    (events.data || [])
                        .map((e: any) => e.parsedJson?.market_id || e.parsedJson?.marketId)
                        .filter((x: any) => typeof x === 'string')
                )
            ) as string[];
            const order = new Map(ids.map((id, index) => [id, index]));

            if (!ids.length) {
                setActiveMarkets([]);
                setResolvedMarkets([]);
                return;
            }

            const objects = await client.multiGetObjects({ ids, options: { showContent: true } });
            const parsed = objects.map(parseFromObjectResponse).filter(Boolean) as Market[];
            const active = parsed.filter((m) => !m.resolved);
            const resolved = parsed
                .filter((m) => m.resolved)
                .sort((a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER));

            setActiveMarkets(active);
            setResolvedMarkets(resolved);
        } catch (err) {
            setError(err as Error);
        } finally {
            setIsLoading(false);
        }
    }, [client, packageId]);

    useEffect(() => {
        load();
    }, [load]);

    return {
        markets: activeMarkets,
        resolvedMarkets,
        isLoading,
        error,
        refetch: load,
    };
};

// Reuse client-side LMSR for initial list pricing.
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
