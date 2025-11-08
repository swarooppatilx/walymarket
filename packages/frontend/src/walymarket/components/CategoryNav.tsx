import { Badge, Flex, ScrollArea, SegmentedControl, Text } from '@radix-ui/themes';

const PRIMARY = ['Trending', 'New', 'Politics', 'Crypto', 'Sports', 'Finance'] as const;

export type PrimaryCategory = typeof PRIMARY[number];

export const CategoryNav = ({
    value,
    onChange,
}: {
    value: PrimaryCategory;
    onChange: (v: PrimaryCategory) => void;
}) => {
    return (
        <Flex direction="column" gap="3">
            <Flex align="center" justify="between" wrap="wrap" gap="2">
                <Text weight="bold" size="4">Explore Markets</Text>
            </Flex>
            <SegmentedControl.Root value={value} onValueChange={(v) => onChange(v as PrimaryCategory)} size="2">
                {PRIMARY.map((p) => (
                    <SegmentedControl.Item key={p} value={p}>{p}</SegmentedControl.Item>
                ))}
            </SegmentedControl.Root>
            <ScrollArea type="hover" scrollbars="horizontal">
                <Flex gap="2" py="1">
                    {/* Placeholder for secondary topic tags */}
                    <Badge variant="soft" size="2" style={{ cursor: 'pointer' }}>All</Badge>
                    <Badge variant="soft" size="2" style={{ cursor: 'pointer' }}>Hot</Badge>
                    <Badge variant="soft" size="2" style={{ cursor: 'pointer' }}>This week</Badge>
                </Flex>
            </ScrollArea>
        </Flex>
    );
};

export default CategoryNav;
