import { Link } from 'react-router-dom';
import Layout from '~~/components/layout/Layout';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import useNetworkConfig from '~~/hooks/useNetworkConfig';
import { CONTRACT_PACKAGE_VARIABLE_NAME } from '~~/config/network';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { fullStructName } from '~~/helpers/network';
import { formatSui, shortId } from '~~/walymarket/helpers/format';
import UICard from '~~/components/ui/Card';
import UIButton from '~~/components/ui/Button';
import UIInput from '~~/components/ui/Input';

interface PositionRow { id: string; marketId: string; outcome: boolean; amountPaid: number; }

interface EnrichedPosition extends PositionRow {
    pnl: number;
}

export const PortfolioPage = () => {
    const account = useCurrentAccount();
    const client = useSuiClient();
    const { useNetworkVariable } = useNetworkConfig();
    const packageId = useNetworkVariable(CONTRACT_PACKAGE_VARIABLE_NAME);
    const [legacyTickets, setLegacyTickets] = useState<PositionRow[]>([]);
    const [outcomeTokens, setOutcomeTokens] = useState<PositionRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterSide, setFilterSide] = useState<'all' | 'yes' | 'no'>('all');
    const [sortKey, setSortKey] = useState<'stake' | 'outcome' | 'market'>('stake');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [marketMeta, setMarketMeta] = useState<Record<string, { title?: string; imageUrl?: string; description?: string }>>({});

    const load = useCallback(async () => {
        if (!account?.address || !packageId) return;
        setLoading(true);
        try {
            // Legacy ShareTicket positions
            const ticketType = fullStructName(packageId, 'ShareTicket');
            const legacyRes = await client.getOwnedObjects({ owner: account.address, filter: { StructType: ticketType }, options: { showContent: true } });
            const legacyParsed = (legacyRes.data || []).map((o: any) => {
                const f = o.data?.content?.fields;
                if (!f) return null;
                return { id: o.data.objectId, marketId: f.market_id, outcome: Boolean(f.outcome), amountPaid: Number(f.amount_paid) } as PositionRow;
            }).filter(Boolean) as PositionRow[];
            setLegacyTickets(legacyParsed);

            // V2 OutcomeToken positions
            const yesType = `${packageId}::outcome_token::OutcomeToken` as const;
            const outcomeRes = await client.getOwnedObjects({ owner: account.address, options: { showContent: true } });
            const outcomeParsed = (outcomeRes.data || []).map((o: any) => {
                const c = o.data?.content;
                if (c?.dataType !== 'moveObject' || c.type !== yesType) return null;
                const f = c.fields;
                return { id: o.data.objectId, marketId: f.market_id, outcome: Boolean(f.yes), amountPaid: Number(f.amount) } as PositionRow;
            }).filter(Boolean) as PositionRow[];
            setOutcomeTokens(outcomeParsed);

            // Fetch market metadata for all unique market ids
            const ids = Array.from(new Set([...legacyParsed.map(p => p.marketId), ...outcomeParsed.map(p => p.marketId)]));
            if (ids.length) {
                const markets = await client.multiGetObjects({ ids, options: { showContent: true } });
                const meta: Record<string, { title?: string; imageUrl?: string; description?: string }> = {};
                for (const m of markets) {
                    const id = m.data?.objectId;
                    const fields = m.data?.content?.dataType === 'moveObject' ? (m.data?.content?.fields as any) : undefined;
                    if (id && fields) {
                        meta[id] = {
                            title: (fields.title ?? fields.question) as string | undefined,
                            imageUrl: fields.image_url as string | undefined,
                            description: fields.description as string | undefined,
                        };
                    }
                }
                setMarketMeta(meta);
            }
        } finally {
            setLoading(false);
        }
    }, [account?.address, client, packageId]);

    useEffect(() => { load(); }, [load]);

    const allPositionsRaw = useMemo(() => [...legacyTickets, ...outcomeTokens], [legacyTickets, outcomeTokens]);

    const enriched: EnrichedPosition[] = useMemo(() => {
        return allPositionsRaw.map(p => ({ ...p, pnl: p.amountPaid }));
    }, [allPositionsRaw]);

    const totalStake = useMemo(() => enriched.reduce((acc, p) => acc + p.amountPaid, 0), [enriched]);
    const totalYesStake = useMemo(() => enriched.filter(p => p.outcome).reduce((a, p) => a + p.amountPaid, 0), [enriched]);
    const totalNoStake = useMemo(() => enriched.filter(p => !p.outcome).reduce((a, p) => a + p.amountPaid, 0), [enriched]);

    // Aggregate positions by market to render cards
    const aggregated = useMemo(() => {
        const map = new Map<string, { marketId: string; yes: number; no: number }>();
        for (const p of enriched) {
            const entry = map.get(p.marketId) || { marketId: p.marketId, yes: 0, no: 0 };
            if (p.outcome) entry.yes += p.amountPaid; else entry.no += p.amountPaid;
            map.set(p.marketId, entry);
        }
        let arr = Array.from(map.values());
        // Apply filters
        arr = arr.filter(row => {
            if (filterSide === 'yes') return row.yes > 0;
            if (filterSide === 'no') return row.no > 0;
            return true;
        }).filter(row => {
            if (!search.trim()) return true;
            const meta = marketMeta[row.marketId];
            const s = search.trim().toLowerCase();
            return row.marketId.toLowerCase().includes(s) || (meta?.title?.toLowerCase().includes(s) ?? false);
        });
        // Sort
        arr.sort((a, b) => {
            if (sortKey === 'stake') {
                const av = a.yes + a.no; const bv = b.yes + b.no; const cmp = av - bv; return sortDir === 'asc' ? cmp : -cmp;
            }
            if (sortKey === 'market') {
                const at = marketMeta[a.marketId]?.title || a.marketId;
                const bt = marketMeta[b.marketId]?.title || b.marketId;
                const cmp = at.localeCompare(bt); return sortDir === 'asc' ? cmp : -cmp;
            }
            // outcome sort: prioritize YES-heavy then NO-heavy
            const ad = a.yes - a.no; const bd = b.yes - b.no; const cmp = ad - bd; return sortDir === 'asc' ? cmp : -cmp;
        });
        return arr;
    }, [enriched, marketMeta, filterSide, search, sortDir, sortKey]);

    return (
        <Layout>
            <div className="max-w-7xl mx-auto w-full px-6 py-5">
                <div className="flex flex-col gap-4">
                    <h1 className="text-2xl font-bold text-white">Your Portfolio</h1>
                    <p className="text-sm text-gray-400">Track positions across legacy and v2 markets.</p>
                    {!account && <UICard className="p-4"><p className="text-gray-400">Connect wallet to view portfolio.</p></UICard>}
                    {account && (
                        <UICard className="p-4">
                            <div className="flex flex-col gap-3">
                                <div className="flex justify-between items-center flex-wrap gap-3">
                                    <h3 className="text-base font-bold text-white">Positions</h3>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <UIInput
                                            className="w-48"
                                            placeholder="Search markets"
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                        />
                                        <select
                                            value={filterSide}
                                            onChange={(e) => setFilterSide(e.target.value as any)}
                                            className="h-10 px-3 rounded-md border border-[#535353] bg-[#2B2B2B] text-sm text-white outline-none"
                                        >
                                            <option value="all">All</option>
                                            <option value="yes">YES</option>
                                            <option value="no">NO</option>
                                        </select>
                                        <select
                                            value={sortKey}
                                            onChange={(e) => setSortKey(e.target.value as any)}
                                            className="h-10 px-3 rounded-md border border-[#535353] bg-[#2B2B2B] text-sm text-white outline-none"
                                        >
                                            <option value="stake">Stake</option>
                                            <option value="outcome">Outcome</option>
                                            <option value="market">Market</option>
                                        </select>
                                        <UIButton size="sm" variant="ghost" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>
                                            {sortDir === 'asc' ? 'Asc' : 'Desc'}
                                        </UIButton>
                                        <UIButton size="sm" variant="ghost" onClick={load} disabled={loading}>
                                            {loading ? 'Loading…' : 'Refresh'}
                                        </UIButton>
                                    </div>
                                </div>
                                <div className="h-px bg-[#535353] my-2" />
                                <div className="flex gap-4 flex-wrap">
                                    <p className="text-xs text-gray-400">Total: <span className="text-white font-medium">{formatSui(totalStake)} SUI</span></p>
                                    <p className="text-xs text-gray-400">YES: <span className="text-white font-medium">{formatSui(totalYesStake)} SUI</span></p>
                                    <p className="text-xs text-gray-400">NO: <span className="text-white font-medium">{formatSui(totalNoStake)} SUI</span></p>
                                </div>
                                {loading && <p className="text-sm text-gray-400">Loading positions…</p>}
                                {!loading && aggregated.length === 0 && <p className="text-sm text-gray-400">No positions match criteria.</p>}
                                {!loading && aggregated.length > 0 && (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {aggregated.map(row => {
                                            const meta = marketMeta[row.marketId];
                                            const total = row.yes + row.no;
                                            return (
                                                <UICard key={row.marketId} className="p-3.5">
                                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                                        <div className="flex items-center gap-3">
                                                            {meta?.imageUrl && (
                                                                <img src={meta.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-white/15" />
                                                            )}
                                                            <div className="flex flex-col gap-1">
                                                                <p className="font-bold text-white">{meta?.title || shortId(row.marketId)}</p>
                                                                {meta?.description && (
                                                                    <p className="text-xs text-gray-400 line-clamp-2 max-w-[520px]">{meta.description}</p>
                                                                )}
                                                                <div className="flex gap-2 items-center flex-wrap">
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                                        YES {formatSui(row.yes)} SUI
                                                                    </span>
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                                                        NO {formatSui(row.no)} SUI
                                                                    </span>
                                                                    <span className="text-xs text-gray-400">Total {formatSui(total)} SUI</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Link
                                                            to={`/market/${row.marketId}`}
                                                            className="px-3 py-1.5 rounded-md bg-[#B6F34E] text-black text-sm font-medium hover:bg-[#9ED93A] transition-colors"
                                                        >
                                                            Open
                                                        </Link>
                                                    </div>
                                                </UICard>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </UICard>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default PortfolioPage;