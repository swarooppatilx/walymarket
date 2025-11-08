import { useParams } from 'react-router-dom';
import { Badge, Box, Card, Container, Flex, Grid, Heading, Separator, Text } from '@radix-ui/themes';
import { useGetMarket } from '~~/walymarket/hooks/useGetMarket';
import Loading from '~~/components/Loading';
import { TradeWidget } from '~~/walymarket/components/TradeWidget';
import { ClaimWinnings } from '~~/walymarket/components/ClaimWinnings';
import { UserPositions } from '~~/walymarket/components/UserPositions';
import PriceHistoryChart from '~~/walymarket/components/PriceHistoryChart';
import { formatSui, formatPercent } from '~~/walymarket/helpers/format';
import Layout from '~~/components/layout/Layout';

const MarketDetailPage = () => {
    const { marketId } = useParams<{ marketId: string }>();
    const { data: market, isLoading, isError, refetch } = useGetMarket(marketId!);

    if (isLoading) {
        return (
            <Layout>
                <Container py="8">
                    <Loading />
                </Container>
            </Layout>
        );
    }

    if (isError || !market) {
        return (
            <Layout>
                <Container py="8">
                    <Card>
                        <Text color="red">Market not found.</Text>
                    </Card>
                </Container>
            </Layout>
        );
    }

    const statusLabel = market.resolved ? 'Resolved' : 'Open';
    const statusColor = market.resolved ? 'jade' : 'gray';
    const yesPercent = formatPercent(market.yesChance);
    const noPercent = formatPercent(market.noChance);
    const totalAtResolution = market.totalAtResolution ?? market.totalPool;

    return (
        <Layout>
            <Container size="4" py="6">
                <Grid columns={{ initial: '1', md: '3' }} gap="6">
                    {/* Left column: 2/3 width on desktop */}
                    <Box gridColumn={{ initial: '1', md: 'span 2' }}>
                        <Flex direction="column" gap="5">
                            {/* Header */}
                            <Flex direction="column" gap="3">
                                <Flex align="center" gap="2">
                                    <Badge color={statusColor} size="2">{statusLabel}</Badge>
                                    <Text size="1" color="gray">•</Text>
                                    <Text size="2" color="gray">{formatSui(market.totalPool)} SUI Volume</Text>
                                </Flex>
                                <Heading size="7" style={{ lineHeight: 1.2 }}>{market.question}</Heading>
                            </Flex>

                            {/* Chart */}
                            <PriceHistoryChart marketId={market.id} />

                            {/* Outcomes with stats */}
                            <Card>
                                <Flex direction="column" gap="3">
                                    <Text weight="bold" size="3">Market Stats</Text>
                                    <Flex direction="column" gap="2">
                                        <Flex justify="between" align="center">
                                            <Text size="2" color="gray">Yes</Text>
                                            <Flex align="center" gap="2">
                                                <Text size="2" weight="medium">{yesPercent}</Text>
                                                <Text size="1" color="gray">({formatSui(market.yesPool)} SUI)</Text>
                                            </Flex>
                                        </Flex>
                                        <Separator size="4" />
                                        <Flex justify="between" align="center">
                                            <Text size="2" color="gray">No</Text>
                                            <Flex align="center" gap="2">
                                                <Text size="2" weight="medium">{noPercent}</Text>
                                                <Text size="1" color="gray">({formatSui(market.noPool)} SUI)</Text>
                                            </Flex>
                                        </Flex>
                                        {market.resolved && (
                                            <>
                                                <Separator size="4" />
                                                <Flex justify="between" align="center">
                                                    <Text size="2" color="gray">Winner</Text>
                                                    <Text size="2" weight="bold" color={market.resolution ? 'jade' : 'crimson'}>
                                                        {market.resolution ? 'YES' : 'NO'}
                                                    </Text>
                                                </Flex>
                                                <Text size="1" color="gray">
                                                    Snapshot total: {formatSui(totalAtResolution)} SUI
                                                </Text>
                                            </>
                                        )}
                                    </Flex>
                                </Flex>
                            </Card>

                            {/* User positions */}
                            <UserPositions market={market} onAction={refetch} />
                        </Flex>
                    </Box>

                    {/* Right column: 1/3 width on desktop, sticky */}
                    <Box gridColumn={{ initial: '1', md: '3' }}>
                        <Flex direction="column" gap="4" style={{ position: 'sticky', top: 24 }}>
                            <TradeWidget market={market} onTrade={refetch} />
                            <ClaimWinnings market={market} onClaimed={refetch} />
                        </Flex>
                    </Box>
                </Grid>
            </Container>
        </Layout>
    );
};

export default MarketDetailPage;
