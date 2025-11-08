import { Card, Flex } from '@radix-ui/themes';

const shimmer = {
    background:
        'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.12) 37%, rgba(255,255,255,0.04) 63%)',
    backgroundSize: '400% 100%',
    animation: 'shimmer 1.4s ease infinite',
};

export const MarketCardSkeleton = () => {
    return (
        <Card size="2" style={{ minHeight: 200 }}>
            <Flex direction="column" gap="3" justify="between" style={{ height: '100%' }}>
                <Flex direction="column" gap="2">
                    <Flex justify="between" align="center">
                        <div style={{ height: 20, width: 60, borderRadius: 12, ...shimmer }} />
                        <div style={{ height: 16, width: 80, borderRadius: 4, ...shimmer }} />
                    </Flex>
                    <div style={{ height: 20, width: '90%', borderRadius: 4, ...shimmer }} />
                    <div style={{ height: 20, width: '75%', borderRadius: 4, ...shimmer }} />
                    <div style={{ height: 16, width: '50%', borderRadius: 4, ...shimmer }} />
                    <div style={{ height: 6, width: '100%', borderRadius: 4, ...shimmer }} />
                </Flex>
                <div style={{ height: 36, width: '100%', borderRadius: 8, ...shimmer }} />
            </Flex>
        </Card>
    );
};

export default MarketCardSkeleton;
