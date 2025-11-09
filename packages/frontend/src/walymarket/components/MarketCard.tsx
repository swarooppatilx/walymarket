import { Link } from 'react-router-dom';
import { Market } from '~~/walymarket/types';
import { formatPercent, formatSui } from '~~/walymarket/helpers/format';
import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import UICard from '~~/components/ui/Card';

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
    const statusColor = market.resolved ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-gray-400 bg-gray-500/10 border-gray-500/20';

    const bar = useMemo(() => {
        const yes = Math.round((market.yesChance || 0) * 100);
        const no = 100 - yes;
        return { yes, no };
    }, [market.yesChance]);

    return (
        <UICard className="cursor-pointer min-h-[200px] p-4 hover:-translate-y-0.5 transition-transform">
            <div className="flex flex-col gap-3 justify-between h-full">
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${statusColor}`}>
                            {status}
                        </span>
                        <span className="text-xs text-gray-400">{total} SUI</span>
                    </div>
                    <div className="flex items-start gap-3">
                        {market.imageUrl && (
                            <img
                                src={market.imageUrl}
                                alt=""
                                className="w-14 h-14 object-cover rounded-lg border border-white/15"
                            />
                        )}
                        <div className="flex flex-col gap-1 flex-grow">
                            <Link to={`/market/${market.id}`} className="no-underline">
                                <h3 className="font-bold text-base text-white line-clamp-2 min-h-12 hover:text-gray-300 transition-colors">
                                    {market.title || market.question}
                                </h3>
                            </Link>
                            {market.description && (
                                <p className="text-xs text-gray-400 line-clamp-2">{market.description}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <div
                            className={clsx(
                                'flex justify-between items-center rounded-md px-2 py-1 transition-colors',
                                flash === 'up' && 'bg-[#B6F34E]/15',
                                flash === 'down' && 'bg-[#E5484D]/15'
                            )}
                        >
                            <span className="text-sm font-medium text-[#B6F34E]">Yes {yesPct}</span>
                            <span className="text-sm font-medium text-[#E5484D]">No {noPct}</span>
                        </div>
                        <div
                            className="h-2 w-full rounded-md overflow-hidden border border-white/10 bg-white/5"
                            aria-label={`Yes ${yesPct}, No ${noPct}`}
                        >
                            <div
                                className="h-full bg-gradient-to-r from-[#B6F34E] to-[#9ED93A] transition-all"
                                style={{ width: `${bar.yes}%` }}
                            />
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <Link
                        to={`/market/${market.id}?outcome=yes`}
                        className="inline-flex items-center justify-center rounded-md bg-[#B6F34E] hover:bg-[#9ED93A] text-black font-semibold py-2 transition-colors no-underline"
                        aria-label={`Trade Yes on ${market.question}`}
                    >
                        Yes
                    </Link>
                    <Link
                        to={`/market/${market.id}?outcome=no`}
                        className="inline-flex items-center justify-center rounded-md bg-[#E5484D] hover:bg-[#DC3E42] text-white font-semibold py-2 transition-colors no-underline"
                        aria-label={`Trade No on ${market.question}`}
                    >
                        No
                    </Link>
                </div>
            </div>
        </UICard>
    );
};

export default MarketCard;
