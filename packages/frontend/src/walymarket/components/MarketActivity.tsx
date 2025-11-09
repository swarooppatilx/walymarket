import { Card, Flex, Table, Text } from '@radix-ui/themes';
import useMarketActivity from '~~/walymarket/hooks/useMarketActivity';
import { shortId, formatSui } from '~~/walymarket/helpers/format';

export const MarketActivity = ({ marketId, resolution }: { marketId: string; resolution: boolean | null }) => {
    const { events, loading, error, reload } = useMarketActivity(marketId, resolution);

    return (
        <Card>
            <Flex direction="column" gap="3">
                <Flex justify="between" align="center">
                    <Text weight="bold" size="3">Recent Activity</Text>
                    <Text size="1" color="gray" className="cursor-pointer" onClick={reload}>↻</Text>
                </Flex>
                {loading && <Text size="2" color="gray">Loading activity…</Text>}
                {error && <Text size="2" color="red">Failed to load activity</Text>}
                {!loading && !error && events.length === 0 && <Text size="2" color="gray">No recent activity</Text>}
                {!loading && !error && events.length > 0 && (
                    <Table.Root variant="surface">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell>Time</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Actor</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Action</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Details</Table.ColumnHeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {events.slice(0, 25).map((e, idx) => (
                                <Table.Row key={idx}>
                                    <Table.Cell><Text size="2">{new Date(e.ts).toLocaleTimeString()}</Text></Table.Cell>
                                    <Table.Cell><Text size="2">{shortId(e.address)}</Text></Table.Cell>
                                    <Table.Cell>
                                        <Text size="2" color={e.kind === 'TRADE' ? (e.buy ? (e.yes ? 'jade' : 'crimson') : 'gray') : 'gray'}>
                                            {e.kind === 'TRADE' ? (e.buy ? (e.yes ? 'Buy YES' : 'Buy NO') : (e.yes ? 'Sell YES' : 'Sell NO')) : 'Redeem'}
                                        </Text>
                                    </Table.Cell>
                                    <Table.Cell>
                                        {e.kind === 'TRADE' ? (
                                            <Text size="2">{e.shares} shares • {formatSui(e.cost)} SUI</Text>
                                        ) : (
                                            <Text size="2">{formatSui(e.payout)} SUI</Text>
                                        )}
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                )}
            </Flex>
        </Card>
    );
};

export default MarketActivity;