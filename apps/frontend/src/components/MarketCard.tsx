import { Card, Flex, Text, Heading, Button } from "@radix-ui/themes";
import { Link } from "react-router-dom";
import type { Market } from "../data/mock";
import { formatPercent, formatVolume } from "../data/mock";

export function MarketCard({ market }: { market: Market }) {
    const [first, second] = market.outcomes;
    return (
        <Card
            size="3"
            asChild
            style={{ display: "flex", flexDirection: "column", gap: 12, cursor: "pointer" }}
        >
            <Link to={`/market/${market.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <Flex direction="column" gap="2">
                    <Heading size="3">{market.question}</Heading>
                    <Flex gap="2" mt="1">
                        <Button variant="solid" size="2">
                            {first.name} {formatPercent(first.chance)}
                        </Button>
                        <Button variant="outline" size="2">
                            {second.name} {formatPercent(second.chance)}
                        </Button>
                    </Flex>
                </Flex>
                <Flex justify="between" mt="2" align="center">
                    <Text size="2" color="gray">
                        {formatVolume(market.totalVolume)}
                    </Text>
                    {market.category && (
                        <Text size="2" color="gray" style={{ fontStyle: "italic" }}>
                            {market.category}
                        </Text>
                    )}
                </Flex>
            </Link>
        </Card>
    );
}

export default MarketCard;
