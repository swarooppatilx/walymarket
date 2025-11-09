import { Card, Flex, Table, Text } from '@radix-ui/themes';
import { shortId, formatPercent } from '~~/walymarket/helpers/format';
import useMarketActivity from '~~/walymarket/hooks/useMarketActivity';

export const TopHolders = ({ marketId, resolution }: { marketId: string; resolution: boolean | null }) => {
    const { holders, loading, error, reload } = useMarketActivity(marketId, resolution);

    return (
        <Card>
            <Flex direction="column" gap="3">
                <Flex justify="between" align="center">
                    <Text weight="bold" size="3">Top Holders</Text>
                    <Text size="1" color="gray" className="cursor-pointer" onClick={reload}>↻</Text>
                </Flex>
                {loading && <Text size="2" color="gray">Loading holders…</Text>}
                {error && <Text size="2" color="red">Failed to load holders</Text>}
                {!loading && !error && holders.length === 0 && <Text size="2" color="gray">No positions yet</Text>}
                {!loading && !error && holders.length > 0 && (
                    <Table.Root variant="surface">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell>Address</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>YES</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>NO</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Total</Table.ColumnHeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {holders.map(h => {
                                const yesPct = h.total > 0 ? h.yes / h.total : 0;
                                const netYes = h.yes < 0 ? 0 : h.yes;
                                const netNo = h.no < 0 ? 0 : h.no;
                                return (
                                    <Table.Row key={h.address}>
                                        <Table.Cell><Text size="2">{shortId(h.address)}</Text></Table.Cell>
                                        <Table.Cell><Text size="2" color="jade">{netYes}</Text></Table.Cell>
                                        <Table.Cell><Text size="2" color="crimson">{netNo}</Text></Table.Cell>
                                        <Table.Cell>
                                            <Flex align="center" gap="2">
                                                <Text size="2" weight="medium">{h.total}</Text>
                                                <Text size="1" color="gray">YES {formatPercent(yesPct)}</Text>
                                            </Flex>
                                        </Table.Cell>
                                    </Table.Row>
                                );
                            })}
                        </Table.Body>
                    </Table.Root>
                )}
            </Flex>
        </Card>
    );
};

export default TopHolders;