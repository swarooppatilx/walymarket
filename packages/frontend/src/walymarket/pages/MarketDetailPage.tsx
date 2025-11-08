import { useParams } from 'react-router-dom';
import { Container, Flex, Heading, Text } from '@radix-ui/themes';
import { useGetMarket } from '~~/walymarket/hooks/useGetMarket';
import Loading from '~~/components/Loading';
import { TradeWidget } from '~~/walymarket/components/TradeWidget';
import { ClaimWinnings } from '~~/walymarket/components/ClaimWinnings';

const MarketDetailPage = () => {
    const { marketId } = useParams<{ marketId: string }>();
    const { data: market, isLoading, isError, refetch } = useGetMarket(marketId!);

    if (isLoading) {
        return (
            <Container py="8">
                <Loading />
            </Container>
        );
    }

    if (isError || !market) {
        return (
            <Container py="8">
                <Text color="red">Market not found.</Text>
            </Container>
        );
    }

    return (
        <Container py="8" size="3">
            <Flex direction="column" gap="5">
                <Heading size="7">{market.question}</Heading>
                {/* Price chart placeholder */}
                <TradeWidget market={market} onTrade={refetch} />
                <ClaimWinnings market={market} onClaimed={refetch} />
            </Flex>
        </Container>
    );
};

export default MarketDetailPage;
