import { Flex, Heading, Text } from "@radix-ui/themes";
import type { Market } from "../data/mock";
import { formatVolume } from "../data/mock";

export function MarketHeader({ market }: { market: Market }) {
    return (
        <Flex direction="column" gap="2" mb="3">
            <Heading size="6">{market.question}</Heading>
            <Text color="gray">{formatVolume(market.totalVolume)}</Text>
        </Flex>
    );
}

export default MarketHeader;
