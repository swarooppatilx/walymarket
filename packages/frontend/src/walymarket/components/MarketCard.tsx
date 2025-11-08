import { Card, Flex, Button, Text, Badge } from '@radix-ui/themes';
import { Link } from 'react-router-dom';
import { Market } from '~~/walymarket/types';
import { formatPercent, formatSui } from '~~/walymarket/helpers/format';
import { useEffect, useMemo, useRef, useState } from 'react';

export const MarketCard = ({ market }: { market: Market }) => {
    const prevYesRef = useRef<number>(market.yesChance);
    const [flash, setFlash] = useState<'up' | 'down' | null>(null);
    useEffect(() => {
        const prev = prevYesRef.current;
        const diff = market.yesChance - prev;
        if (Math.abs(diff) >= 0.005) {
            setFlash(diff > 0 ? 'up' : 'down');
            const t = setTimeout(() => setFlash(null), 600);
            return () => clearTimeout(t);
        }
        prevYesRef.current = market.yesChance;
    }, [market.yesChance]);
    const yesPct = formatPercent(market.yesChance);
    const noPct = formatPercent(market.noChance);
    const total = formatSui(market.totalPool);
    const status = market.resolved ? 'Resolved' : 'Open';
    const color = market.resolved ? 'jade' : 'gray';
    const bar = useMemo(() => {
        const yes = Math.round((market.yesChance || 0) * 100);
        const no = 100 - yes;
        return { yes, no };
    }, [market.yesChance]);

    return (
        <Card size="2" style={{ minHeight: 200, transition: 'transform 150ms ease, box-shadow 150ms ease', cursor: 'pointer' }} className="market-card">
            <Flex direction="column" gap="3" justify="between" style={{ height: '100%' }}>
                <Flex direction="column" gap="2">
                    <Flex justify="between" align="center" wrap="wrap" gap="2">
                        <Badge color={color} size="2">{status}</Badge>
                        <Text size="1" color="gray">{total} SUI</Text>
                    </Flex>
                    <Link to={`/market/${market.id}`} style={{ textDecoration: 'none', flexGrow: 1 }}>
                        <Text weight="bold" size="3" className="line-clamp-2" style={{ minHeight: 48 }}>{market.question}</Text>
                    </Link>
                    <Flex direction="column" gap="2">
                        <Flex
                            justify="between"
                            align="center"
                            style={{
                                transition: 'background-color 300ms ease',
                                borderRadius: 6,
                                padding: '4px 6px',
                                backgroundColor: flash === 'up' ? 'rgba(70,167,88,0.15)' : flash === 'down' ? 'rgba(229,72,77,0.15)' : 'transparent'
                            }}
                        >
                            <Text size="2" color="jade" weight="medium">Yes {yesPct}</Text>
                            <Text size="2" color="crimson" weight="medium">No {noPct}</Text>
                        </Flex>
                        <div
                            style={{
                                height: 8,
                                width: '100%',
                                background: 'rgba(255,255,255,0.06)',
                                borderRadius: 4,
                                overflow: 'hidden',
                                border: '1px solid rgba(255,255,255,0.08)'
                            }}
                            aria-label={`Yes ${yesPct}, No ${noPct}`}
                        >
                            <div
                                style={{
                                    height: '100%',
                                    width: `${bar.yes}%`,
                                    background: 'linear-gradient(90deg, #46a758 0%, #5cb368 100%)',
                                    transition: 'width 300ms ease'
                                }}
                            />
                        </div>
                    </Flex>
                </Flex>
                <Button asChild size="2" style={{ width: '100%' }}>
                    <Link to={`/market/${market.id}`}>Trade</Link>
                </Button>
            </Flex>
        </Card>
    );
};

export default MarketCard;
