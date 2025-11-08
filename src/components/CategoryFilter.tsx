import { Flex, Button } from "@radix-ui/themes";

const CATEGORIES = ["Trending", "New", "Politics", "Crypto", "Tech"];

export function CategoryFilter() {
    return (
        <Flex gap="2" wrap="wrap" my="4">
            {CATEGORIES.map((c) => (
                <Button key={c} variant="soft" size="2" radius="full" disabled>
                    {c}
                </Button>
            ))}
        </Flex>
    );
}

export default CategoryFilter;
