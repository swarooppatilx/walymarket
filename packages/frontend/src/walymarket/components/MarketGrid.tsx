import { Market } from '~~/walymarket/types';
import { MarketCard } from './MarketCard';
import { MarketCardSkeleton } from './MarketCardSkeleton';

export const MarketGrid = ({ markets, isLoading = false }: { markets: Market[]; isLoading?: boolean }) => {
    if (isLoading && markets.length === 0) {
        return (
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <MarketCardSkeleton key={i} />
                ))}
            </div>
        );
    }
    if (!markets.length) {
        return (
            <div className="grid grid-cols-1 gap-3 py-12">
                <p className="text-white text-base text-center">No markets found. Try a different category or search.</p>
            </div>
        );
    }
    return (
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3">
            {markets.map((m) => (
                <MarketCard key={m.id} market={m} />
            ))}
        </div>
    );
};

export default MarketGrid;