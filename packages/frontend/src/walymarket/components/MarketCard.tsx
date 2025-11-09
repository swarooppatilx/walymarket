import { Card, Flex, Text, Badge } from '@radix-ui/themes';
import { Link } from 'react-router-dom';
import { Market } from '~~/walymarket/types';
import { formatPercent, formatSui } from '~~/walymarket/helpers/format';
import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';

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
        <Card
            size="2"
            className={clsx(
                'market-card cursor-pointer min-h-[200px] rounded-xl border border-white/10 dark:border-white/10 bg-white/5 dark:bg-slate-900/40',
                'transition-transform hover:-translate-y-0.5 hover:shadow-lg'
            )}
        >
            <Flex direction="column" gap="3" justify="between" className="h-full">
                <Flex direction="column" gap="2">
                    <Flex justify="between" align="center" wrap="wrap" gap="2">
                        <Badge color={color} size="2">{status}</Badge>
                        <Text size="1" color="gray">{total} SUI</Text>
                    </Flex>
                    <Link to={`/market/${market.id}`} className="no-underline grow">
                        <Text weight="bold" size="3" className="line-clamp-2 min-h-12">{market.question}</Text>
                    </Link>
                    <Flex direction="column" gap="2">
                        <Flex
                            justify="between"
                            align="center"
                            className={clsx(
                                'rounded-md px-2 py-1 transition-colors',
                                flash === 'up' && 'bg-emerald-500/15',
                                flash === 'down' && 'bg-rose-500/15'
                            )}
                        >
                            <Text size="2" weight="medium" className="text-emerald-400">Yes {yesPct}</Text>
                            <Text size="2" weight="medium" className="text-rose-400">No {noPct}</Text>
                        </Flex>
                        <div className="h-2 w-full rounded-md overflow-hidden border border-white/10 bg-white/5" aria-label={`Yes ${yesPct}, No ${noPct}`}>
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                                style={{ width: `${bar.yes}%` }}
                            />
                        </div>
                    </Flex>
                </Flex>
                <div className="grid grid-cols-2 gap-2">
                    <Link
                        to={`/market/${market.id}?outcome=yes`}
                        className="inline-flex items-center justify-center rounded-md bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2 transition-colors"
                        aria-label={`Trade Yes on ${market.question}`}
                    >
                        Yes
                    </Link>
                    <Link
                        to={`/market/${market.id}?outcome=no`}
                        className="inline-flex items-center justify-center rounded-md bg-rose-500 hover:bg-rose-400 text-white font-semibold py-2 transition-colors"
                        aria-label={`Trade No on ${market.question}`}
                    >
                        No
                    </Link>
                </div>
            </Flex>
        </Card>
    );
};

export default MarketCard;
