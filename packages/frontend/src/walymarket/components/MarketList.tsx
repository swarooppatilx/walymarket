import { Link } from 'react-router-dom';
import { Button, Card, Flex, Text } from '@radix-ui/themes';
import { Market } from '~~/walymarket/types';
import { formatPercent, formatSui } from '~~/walymarket/helpers/format';

export const MarketList = ({
    markets,
    title = 'Active Markets',
    emptyMessage = 'No active markets yet.',
    onRefresh,
    isRefreshing,
}: {
    markets: Market[];
    title?: string;
    emptyMessage?: string;
    onRefresh?: () => void;
    isRefreshing?: boolean;
}) => {
    return (
        <Flex direction="column" gap="3">
            <Flex justify="between" align="center">
                <Text weight="bold" size="4">{title}</Text>
                {onRefresh && (
                    <Button size="1" variant="soft" onClick={onRefresh} disabled={isRefreshing}>
                        {isRefreshing ? 'Refreshing…' : 'Refresh'}
                    </Button>
                )}
            </Flex>
            {markets.length === 0 ? (
                <Card>
                    <Text color="gray">{emptyMessage}</Text>
                </Card>
            ) : (
                markets.map((m) => (
                    <Card key={m.id} size="2">
                        <Flex direction="column" gap="2">
                            <Flex justify="between" align="center" wrap="wrap" gap="2">
                                <Link to={`/market/${m.id}`} style={{ textDecoration: 'none' }}>
                                    <Text weight="bold">{m.question}</Text>
                                </Link>
                                <Text size="1" color="jade">Open</Text>
                            </Flex>
                            <Text size="1" color="gray">
                                Yes {formatPercent(m.yesChance)} ({formatSui(m.yesPool)} SUI) • No {formatPercent(m.noChance)} ({formatSui(m.noPool)} SUI) • Total {formatSui(m.totalPool)} SUI
                            </Text>
                        </Flex>
                    </Card>
                ))
            )}
        </Flex>
    );
};