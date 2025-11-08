import { Link } from 'react-router-dom';
import { Card, Flex, Text } from '@radix-ui/themes';
import { Market } from '~~/walymarket/types';

export const MarketList = ({ markets }: { markets: Market[] }) => {
    if (!markets.length) {
        return <Text color="gray">No active markets yet.</Text>;
    }
    return (
        <Flex direction="column" gap="3">
            {markets.map((m) => (
                <Card key={m.id} size="2">
                    <Flex direction="column" gap="2">
                        <Link to={`/market/${m.id}`} style={{ textDecoration: 'none' }}>
                            <Text weight="bold">{m.question}</Text>
                        </Link>
                        <Text size="1">Yes: {(m.yesChance * 100).toFixed(1)}% • No: {(m.noChance * 100).toFixed(1)}%</Text>
                    </Flex>
                </Card>
            ))}
        </Flex>
    );
};