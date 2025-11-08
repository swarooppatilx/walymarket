import { useSuiClient } from '@mysten/dapp-kit';
import { useCallback, useEffect, useState } from 'react';
import useNetworkConfig from '~~/hooks/useNetworkConfig';
import { CONTRACT_PACKAGE_VARIABLE_NAME } from '~~/config/network';
import { fullStructName } from '~~/helpers/network';
import { Market } from '~~/walymarket/types';

const parseBalance = (obj: any): number => {
    if (!obj?.fields) return 0;
    const raw = obj.fields.value ?? obj.fields.balance ?? 0;
    return typeof raw === 'string' ? parseInt(raw, 10) : Number(raw);
};

const parseU64Field = (value: any): number => {
    if (value == null) return 0;
    return typeof value === 'string' ? parseInt(value, 10) : Number(value);
};

const parseFromObjectResponse = (resp: any): Market | undefined => {
    if (!resp?.data) return undefined;
    const fields = resp.data.content?.dataType === 'moveObject' ? resp.data.content.fields : undefined;
    if (!fields) return undefined;
    const yesPool = parseBalance(fields.yes_pool);
    const noPool = parseBalance(fields.no_pool);
    const totalPool = yesPool + noPool;
    const resolved = !!fields.resolved;
    const resolution = resolved ? Boolean(fields.resolution) : null;
    const totalAtResolution = resolved ? parseU64Field(fields.total_at_resolution) : null;
    const winningPoolAtResolution = resolved ? parseU64Field(fields.winning_pool_at_resolution) : null;
    return {
        id: resp.data.objectId,
        question: fields.question ?? '',
        yesPool,
        noPool,
        totalPool,
        yesChance: totalPool > 0 ? yesPool / totalPool : 0.5,
        noChance: totalPool > 0 ? noPool / totalPool : 0.5,
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
            const eventType = fullStructName(packageId, 'MarketCreated');
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
