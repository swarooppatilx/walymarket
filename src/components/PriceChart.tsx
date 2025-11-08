import { Flex, Text } from "@radix-ui/themes";

export function PriceChart() {
    return (
        <Flex
            style={{
                height: 220,
                border: "1px solid var(--gray-a4)",
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                background:
                    "repeating-linear-gradient(45deg, var(--gray-a2), var(--gray-a2) 6px, var(--gray-a3) 6px, var(--gray-a3) 12px)",
            }}
            my="3"
        >
            <Text color="gray">Chart will be displayed here</Text>
        </Flex>
    );
}

export default PriceChart;
