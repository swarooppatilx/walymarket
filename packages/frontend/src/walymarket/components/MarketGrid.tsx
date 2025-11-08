import { Grid, Text } from '@radix-ui/themes';
import { Market } from '~~/walymarket/types';
import { MarketCard } from './MarketCard';
import { MarketCardSkeleton } from './MarketCardSkeleton';

export const MarketGrid = ({ markets, isLoading = false }: { markets: Market[]; isLoading?: boolean }) => {
    if (isLoading && markets.length === 0) {
        return (
            <Grid columns={{ initial: '1', xs: '2', md: '3' }} gap="3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <MarketCardSkeleton key={i} />
                ))}
            </Grid>
        );
    }
    if (!markets.length) {
        return (
            <Grid columns={{ initial: '1' }} gap="3" style={{ padding: '3rem 0' }}>
                <Text color="gray" size="3" align="center">No markets found. Try a different category or search.</Text>
            </Grid>
        );
    }
    return (
        <Grid columns={{ initial: '1', xs: '2', md: '3' }} gap="3">
            {markets.map((m) => (
                <MarketCard key={m.id} market={m} />
            ))}
        </Grid>
    );
};

export default MarketGrid;