import { Card, Flex, Grid, Text } from '@radix-ui/themes';
import { Link } from 'react-router-dom';
import { Market } from '~~/walymarket/types';
import { formatSui } from '~~/walymarket/helpers/format';

const winnerLabel = (resolution: boolean | null) => {
    if (resolution === true) return 'YES';
    if (resolution === false) return 'NO';
    return 'Unknown';
};

export const ResolvedMarketList = ({ markets }: { markets: Market[] }) => {
    if (!markets.length) {
        return null;
    }

    return (
        <Card className="border border-white/10 bg-white/5 dark:bg-slate-900/40">
            <Flex direction="column" gap="4">
                <Text weight="bold" size="4">Recently Resolved</Text>
                <Grid columns={{ initial: '1', xs: '2', md: '3' }} gap="3">
                    {markets.map((m) => {
                        const totalPool = m.totalAtResolution ?? m.totalPool;
                        const winningPool = m.winningPoolAtResolution;
                        const multiplier = winningPool && winningPool > 0 ? (totalPool / winningPool).toFixed(2) : '—';
                        const color = m.resolution === true ? 'jade' : m.resolution === false ? 'crimson' : 'gray';
                        return (
                            <Card key={m.id} size="2" variant="surface">
                                <Flex direction="column" gap="2">
                                    <Flex justify="between" align="center" wrap="wrap" gap="2">
                                        <Link to={`/market/${m.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                                            <Text weight="bold" className="line-clamp-2">{m.question}</Text>
                                        </Link>
                                        <Text color={color} weight="medium" size="2">
                                            {winnerLabel(m.resolution)}
                                        </Text>
                                    </Flex>
                                    <Text size="1" color="gray">
                                        Volume {formatSui(totalPool)} SUI • Winner pool {formatSui(winningPool)} SUI • {multiplier}× return
                                    </Text>
                                </Flex>
                            </Card>
                        );
                    })}
                </Grid>
            </Flex>
        </Card>
    );
};
