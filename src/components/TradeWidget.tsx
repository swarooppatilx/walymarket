import { Card, Flex, Button, Text } from "@radix-ui/themes";
import type { Market } from "../data/mock";
import { formatPercent } from "../data/mock";

export function TradeWidget({ market }: { market: Market }) {
    const [yes, no] = market.outcomes;
    return (
        <Card size="3" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Flex direction="column" gap="3">
                <Text weight="bold">Select Outcome</Text>
                <Flex gap="2">
                    <Button variant="solid" size="2" disabled>
                        Buy {yes.name} ({formatPercent(yes.chance)})
                    </Button>
                    <Button variant="outline" size="2" disabled>
                        Buy {no.name} ({formatPercent(no.chance)})
                    </Button>
                </Flex>
            </Flex>
            <Flex direction="column" gap="3">
                <Text weight="bold">Amount</Text>
                <Flex align="center" gap="2">
                    <Text color="gray">$</Text>
                    <input
                        type="number"
                        placeholder="0.00"
                        disabled
                        style={{
                            background: "var(--gray-a2)",
                            border: "1px solid var(--gray-a4)",
                            padding: "8px 12px",
                            borderRadius: 6,
                            width: "100%",
                            color: "var(--gray-11)",
                            fontSize: "14px",
                        }}
                    />
                </Flex>
            </Flex>
            <Button size="3" disabled>
                Trade
            </Button>
            <Text size="1" color="gray">
                Trading disabled in this version.
            </Text>
        </Card>
    );
}

export default TradeWidget;
