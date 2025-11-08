import { useParams } from "react-router-dom";
import { Container, Flex, Text } from "@radix-ui/themes";
import { mockMarkets } from "../data/mock";
import MarketHeader from "../components/MarketHeader";
import PriceChart from "../components/PriceChart";
import TradeWidget from "../components/TradeWidget";

export function MarketDetailPage() {
    const { marketId } = useParams();
    const market = mockMarkets.find((m) => m.id === marketId);

    if (!market) {
        return (
            <Container py="5">
                <Text color="red">Market not found.</Text>
            </Container>
        );
    }

    return (
        <Container py="5" size="4">
            <Flex direction="column" gap="5">
                <MarketHeader market={market} />
                <PriceChart />
                <TradeWidget market={market} />
            </Flex>
        </Container>
    );
}

export default MarketDetailPage;
