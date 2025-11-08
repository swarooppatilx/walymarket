import { Box } from "@radix-ui/themes";
import MarketCard from "./MarketCard";
import type { Market } from "../data/mock";

export function MarketGrid({ markets }: { markets: Market[] }) {
    return (
        <Box
            style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 16,
            }}
        >
            {markets.map((m) => (
                <MarketCard key={m.id} market={m} />
            ))}
        </Box>
    );
}

export default MarketGrid;
