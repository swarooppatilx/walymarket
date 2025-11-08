import { Container, Flex } from "@radix-ui/themes";
import { mockMarkets } from "../data/mock";
import CategoryFilter from "../components/CategoryFilter";
import MarketGrid from "../components/MarketGrid";

export function HomePage() {
    return (
        <Container size="4" py="4">
            <Flex direction="column" gap="4">
                <CategoryFilter />
                <MarketGrid markets={mockMarkets} />
            </Flex>
        </Container>
    );
}

export default HomePage;
