import { useSuiClientQuery } from '@mysten/dapp-kit';
import { getResponseContentField, getResponseObjectId } from '~~/helpers/network';
import { Market } from '~~/walymarket/types';

const parseBalance = (balanceObj: any): number => {
    if (!balanceObj || !balanceObj.fields) return 0;
    // Support both `value` and `balance` keys depending on SDK parsing
    const inner = balanceObj.fields;
    const raw = inner.value ?? inner.balance ?? 0;
    return typeof raw === 'string' ? parseInt(raw, 10) : Number(raw);
};

const parseU64Field = (value: any): number => {
    if (value == null) return 0;
    return typeof value === 'string' ? parseInt(value, 10) : Number(value);
};

const parseMarketObject = (response: any): Market | undefined => {
    if (!response?.data) return undefined;
    const objectId = getResponseObjectId(response);
    const question = getResponseContentField(response, 'question');
    const yesPoolObj = getResponseContentField(response, 'yes_pool');
    const noPoolObj = getResponseContentField(response, 'no_pool');

    const yesPool = parseBalance(yesPoolObj);
    const noPool = parseBalance(noPoolObj);
    const totalPool = yesPool + noPool;

    const resolved = !!getResponseContentField(response, 'resolved');
    const resolution = resolved ? Boolean(getResponseContentField(response, 'resolution')) : null;
    const totalAtResolution = resolved
        ? parseU64Field(getResponseContentField(response, 'total_at_resolution'))
        : null;
    const winningPoolAtResolution = resolved
        ? parseU64Field(getResponseContentField(response, 'winning_pool_at_resolution'))
        : null;

    return {
        id: objectId ?? getResponseContentField(response, 'id')?.id ?? '',
        question: question ?? '',
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

export const useGetMarket = (marketId: string) => {
    const { data, isLoading, isError, refetch } = useSuiClientQuery(
        'getObject',
        {
            id: marketId,
            options: { showContent: true },
        },
        { enabled: !!marketId }
    );

    return {
        data: data ? parseMarketObject(data) : undefined,
        isLoading,
        isError,
        refetch,
    };
};