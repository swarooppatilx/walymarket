export type MarketOutcome = {
    name: string;
    chance: number;
};

export type Market = {
    id: string;
    question: string;
    outcomes: MarketOutcome[];
    totalVolume: number;
    category?: string;
};

export function formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
}

export function formatVolume(value: number): string {
    if (value >= 1_000_000) {
        return `$${(value / 1_000_000).toFixed(1)}M Vol.`;
    }
    if (value >= 1_000) {
        return `$${(value / 1_000).toFixed(1)}K Vol.`;
    }
    return `$${value.toLocaleString()} Vol.`;
}

export const mockMarkets: Market[] = [
    {
        id: "market-1",
        question: "Will BTC close above $80K on Dec 31, 2025?",
        outcomes: [
            { name: "Yes", chance: 0.42 },
            { name: "No", chance: 0.58 },
        ],
        totalVolume: 13_250_000,
        category: "Crypto",
    },
    {
        id: "market-2",
        question: "Will a new prime minister be appointed in Country X by Q2 2026?",
        outcomes: [
            { name: "Yes", chance: 0.31 },
            { name: "No", chance: 0.69 },
        ],
        totalVolume: 7_400_000,
        category: "Politics",
    },
    {
        id: "market-3",
        question: "Will the Sui network reach 50M daily transactions by July 2026?",
        outcomes: [
            { name: "Yes", chance: 0.55 },
            { name: "No", chance: 0.45 },
        ],
        totalVolume: 2_100_000,
        category: "Tech",
    },
    {
        id: "market-4",
        question: "Will global AI model training spend exceed $250B in 2026?",
        outcomes: [
            { name: "Yes", chance: 0.37 },
            { name: "No", chance: 0.63 },
        ],
        totalVolume: 21_850_000,
        category: "Tech",
    },
    {
        id: "market-5",
        question: "Will ETH stake percentage surpass 40% by end of 2025?",
        outcomes: [
            { name: "Yes", chance: 0.48 },
            { name: "No", chance: 0.52 },
        ],
        totalVolume: 5_600_000,
        category: "Crypto",
    },
];
