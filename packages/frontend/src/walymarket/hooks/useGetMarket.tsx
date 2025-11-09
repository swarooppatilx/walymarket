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
    const title = getResponseContentField(response, 'title');
    const description = getResponseContentField(response, 'description');
    const imageUrl = getResponseContentField(response, 'image_url');
    // Support legacy and v2 market structures.
    const hasV2 = getResponseContentField(response, 'q_yes') != null;
    let yesPool: number;
    let noPool: number;
    let totalPool: number;
    let yesChance: number;
    let noChance: number;
    let totalAtResolution: number | null = null;
    let winningPoolAtResolution: number | null = null;

    if (hasV2) {
        const qYes = parseU64Field(getResponseContentField(response, 'q_yes'));
        const qNo = parseU64Field(getResponseContentField(response, 'q_no'));
        const b = parseU64Field(getResponseContentField(response, 'b')) || 1;
        yesPool = qYes;
        noPool = qNo;
        totalPool = qYes + qNo;
        // Single softmax computation to keep consistency
        yesChance = lmsrYes(qYes, qNo, b);
        noChance = 1 - yesChance;
        return {
            id: objectId ?? getResponseContentField(response, 'id')?.id ?? '',
            title: (title ?? question) ?? '',
            question: (title ?? question) ?? '',
            description: description ?? undefined,
            imageUrl: imageUrl ?? undefined,
            b,
            yesPool,
            noPool,
            totalPool,
            yesChance,
            noChance,
            resolved: !!getResponseContentField(response, 'resolved'),
            resolution: !!getResponseContentField(response, 'resolved') ? Boolean(getResponseContentField(response, 'resolution')) : null,
            totalAtResolution: null,
            winningPoolAtResolution: null,
        };
    } else {
        const yesPoolObj = getResponseContentField(response, 'yes_pool');
        const noPoolObj = getResponseContentField(response, 'no_pool');
        yesPool = parseBalance(yesPoolObj);
        noPool = parseBalance(noPoolObj);
        totalPool = yesPool + noPool;
        // Legacy pool-ratio approximation retained for backward compatibility
        yesChance = totalPool > 0 ? yesPool / totalPool : 0.5;
        noChance = 1 - yesChance;
        const resolvedLegacy = !!getResponseContentField(response, 'resolved');
        if (resolvedLegacy) {
            totalAtResolution = parseU64Field(getResponseContentField(response, 'total_at_resolution'));
            winningPoolAtResolution = parseU64Field(getResponseContentField(response, 'winning_pool_at_resolution'));
        }
    }

    const resolved = !!getResponseContentField(response, 'resolved');
    const resolution = resolved ? Boolean(getResponseContentField(response, 'resolution')) : null;

    return {
        id: objectId ?? getResponseContentField(response, 'id')?.id ?? '',
        title: (title ?? question) ?? '',
        question: (title ?? question) ?? '',
        description: description ?? undefined,
        imageUrl: imageUrl ?? undefined,
        b: undefined,
        yesPool,
        noPool,
        totalPool,
        yesChance,
        noChance,
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

// Stable softmax LMSR probability using log-sum-exp to avoid saturation at 0 or 1
function lmsrYes(qy: number, qn: number, b: number): number {
    if (!isFinite(qy) || !isFinite(qn) || !isFinite(b) || b <= 0) return 0.5;
    const y = qy / b;
    const n = qn / b;
    // center by max for numerical stability
    const m = Math.max(y, n);
    const ey = Math.exp(y - m);
    const en = Math.exp(n - m);
    const denom = ey + en;
    if (denom <= 0) return 0.5;
    return ey / denom;
}