import { Card, Flex } from '@radix-ui/themes';

export const MarketCardSkeleton = () => {
    return (
        <Card size="2" className="min-h-[200px]">
            <Flex direction="column" gap="3" justify="between" className="h-full animate-pulse">
                <Flex direction="column" gap="2">
                    <Flex justify="between" align="center">
                        <div className="h-5 w-16 rounded-full bg-white/10" />
                        <div className="h-4 w-20 rounded-md bg-white/10" />
                    </Flex>
                    <div className="h-5 w-[90%] rounded-md bg-white/10" />
                    <div className="h-5 w-[75%] rounded-md bg-white/10" />
                    <div className="h-4 w-1/2 rounded-md bg-white/10" />
                    <div className="h-1.5 w-full rounded-md bg-white/10" />
                </Flex>
                <div className="h-9 w-full rounded-md bg-white/10" />
            </Flex>
        </Card>
    );
};

export default MarketCardSkeleton;
