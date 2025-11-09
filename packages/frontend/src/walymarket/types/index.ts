export type Market = {
    id: string;
    title?: string;
    question: string;
    description?: string;
    imageUrl?: string;
    b?: number;
    yesPool: number;
    noPool: number;
    totalPool: number;
    yesChance: number; // 0..1
    noChance: number; // 0..1
    resolved: boolean;
    resolution: boolean | null; // true for YES, false for NO when resolved
    totalAtResolution: number | null;
    winningPoolAtResolution: number | null;
};
