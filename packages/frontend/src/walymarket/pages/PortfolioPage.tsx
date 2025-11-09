import { Container, Flex, Heading, Card, Text, Button, Separator, TextField, Select, Badge, Link as RadixLink } from '@radix-ui/themes';
import { Link } from 'react-router-dom';
import Layout from '~~/components/layout/Layout';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import useNetworkConfig from '~~/hooks/useNetworkConfig';
import { CONTRACT_PACKAGE_VARIABLE_NAME } from '~~/config/network';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { fullStructName } from '~~/helpers/network';
import { formatSui, shortId } from '~~/walymarket/helpers/format';

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

    // filtered list of individual positions retained for potential future per-token detail views (currently unused)
    // const filtered = enriched;

    // placeholder for deprecated sorted logic after aggregation introduced

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
            <Container size="4" py="5">
                <Flex direction="column" gap="4">
                    <Heading size="5">Your Portfolio</Heading>
                    <Text size="2" color="gray">Track positions across legacy and v2 markets.</Text>
                    {!account && <Card className="market-card-sds" style={{ padding: 16 }}><Text color="gray">Connect wallet to view portfolio.</Text></Card>}
                    {account && (
                        <Card className="market-card-sds" style={{ padding: 16 }}>
                            <Flex direction="column" gap="3">
                                <Flex justify="between" align="center" wrap="wrap" gap="3">
                                    <Text weight="bold" style={{ fontSize: 16 }}>Positions</Text>
                                    <Flex align="center" gap="2">
                                        <TextField.Root className="input-sds" size="1" placeholder="Search markets" value={search} onChange={e => setSearch(e.target.value)} />
                                        <Select.Root value={filterSide} onValueChange={(v: any) => setFilterSide(v)}>
                                            <Select.Trigger placeholder="Side" />
                                            <Select.Content>
                                                <Select.Item value="all">All</Select.Item>
                                                <Select.Item value="yes">YES</Select.Item>
                                                <Select.Item value="no">NO</Select.Item>
                                            </Select.Content>
                                        </Select.Root>
                                        <Select.Root value={sortKey} onValueChange={(v: any) => setSortKey(v)}>
                                            <Select.Trigger placeholder="Sort" />
                                            <Select.Content>
                                                <Select.Item value="stake">Stake</Select.Item>
                                                <Select.Item value="outcome">Outcome</Select.Item>
                                                <Select.Item value="market">Market</Select.Item>
                                            </Select.Content>
                                        </Select.Root>
                                        <Button className="btn-sds-ghost" size="1" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>{sortDir === 'asc' ? 'Asc' : 'Desc'}</Button>
                                        <Button className="btn-sds-ghost" size="1" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</Button>
                                    </Flex>
                                </Flex>
                                <Separator my="2" size="1" />
                                <Flex gap="4" wrap="wrap">
                                    <Text size="1" color="gray">Total: <span className="text-[inherit] font-medium">{formatSui(totalStake)} SUI</span></Text>
                                    <Text size="1" color="gray">YES: <span className="text-[inherit] font-medium">{formatSui(totalYesStake)} SUI</span></Text>
                                    <Text size="1" color="gray">NO: <span className="text-[inherit] font-medium">{formatSui(totalNoStake)} SUI</span></Text>
                                </Flex>
                                {loading && <Text size="2" color="gray">Loading positions…</Text>}
                                {!loading && aggregated.length === 0 && <Text size="2" color="gray">No positions match criteria.</Text>}
                                {!loading && aggregated.length > 0 && (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {aggregated.map(row => {
                                            const meta = marketMeta[row.marketId];
                                            const total = row.yes + row.no;
                                            return (
                                                <Card key={row.marketId} className="market-card-sds" style={{ padding: 14 }}>
                                                    <Flex align="center" justify="between" gap="3" wrap="wrap">
                                                        <Flex align="center" gap="3">
                                                            {meta?.imageUrl && (
                                                                <img src={meta.imageUrl} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.15)' }} />
                                                            )}
                                                            <Flex direction="column" gap="1">
                                                                <Text weight="bold">{meta?.title || shortId(row.marketId)}</Text>
                                                                {meta?.description && (
                                                                    <Text size="1" color="gray" className="line-clamp-2" style={{ maxWidth: 520 }}>{meta.description}</Text>
                                                                )}
                                                                <Flex gap="2" align="center">
                                                                    <Badge variant="soft" color="green">YES {formatSui(row.yes)} SUI</Badge>
                                                                    <Badge variant="soft" color="red">NO {formatSui(row.no)} SUI</Badge>
                                                                    <Text size="1" color="gray">Total {formatSui(total)} SUI</Text>
                                                                </Flex>
                                                            </Flex>
                                                        </Flex>
                                                        <RadixLink asChild>
                                                            <Link to={`/market/${row.marketId}`}>Open</Link>
                                                        </RadixLink>
                                                    </Flex>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </Flex>
                        </Card>
                    )}
                </Flex>
            </Container>
        </Layout>
    );
};

export default PortfolioPage;