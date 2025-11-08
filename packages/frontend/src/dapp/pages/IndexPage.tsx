import { FC, useState, useEffect } from 'react'
import { Card, Flex, Text, TextField, Select, Container, Switch } from '@radix-ui/themes'
import Layout from '~~/components/layout/Layout'
import NetworkSupportChecker from '../../components/NetworkSupportChecker'
// import { MarketList } from '~~/walymarket/components/MarketList'
import MarketGrid from '~~/walymarket/components/MarketGrid'
import CategoryNav from '~~/walymarket/components/CategoryNav'
import { ResolvedMarketList } from '~~/walymarket/components/ResolvedMarketList'
import { useGetMarkets } from '~~/walymarket/hooks/useGetMarkets'
// import Loading from '~~/components/Loading'

const IndexPage: FC = () => {
  const { markets, resolvedMarkets, isLoading, error, refetch } = useGetMarkets()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'liquidity' | 'recent'>('recent')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [category, setCategory] = useState<'Trending' | 'New' | 'Politics' | 'Crypto' | 'Sports' | 'Finance'>('Trending')
  const keywordMatch = (q: string, cats: string[]) => cats.some(k => q.includes(k));
  const filtered = markets.filter(m => {
    const q = m.question.toLowerCase();
    if (!query && (category === 'Trending' || category === 'New')) return true;
    if (category === 'Politics') return keywordMatch(q, ['election', 'vote', 'president', 'parliament', 'senate']);
    if (category === 'Crypto') return keywordMatch(q, ['crypto', 'bitcoin', 'btc', 'ethereum', 'eth', 'sui']);
    if (category === 'Sports') return keywordMatch(q, ['win', 'league', 'cup', 'match', 'game']);
    if (category === 'Finance') return keywordMatch(q, ['stock', 'rate', 'inflation', 'gdp', 'cpi']);
    return true;
  }).filter(m => m.question.toLowerCase().includes(query.toLowerCase()))
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'liquidity') return (b.totalPool - a.totalPool)
    // recent: preserve order from hook (already latest first) so just return 0
    return 0
  })
  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => refetch(), 15000)
    return () => clearInterval(id)
  }, [autoRefresh, refetch])
  return (
    <Layout>
      <NetworkSupportChecker />
      <Container size="4" py="6">
        <Flex direction="column" gap="6">
          {error && (
            <Card>
              <Text color="red">Failed to load markets: {error.message}</Text>
            </Card>
          )}
          <Card size="3">
            <Flex direction="column" gap="4">
              <CategoryNav value={category} onChange={setCategory} />
              <Flex gap="3" wrap="wrap" align="center">
                <TextField.Root
                  placeholder="Search markets..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search markets by question"
                  size="3"
                  style={{ flex: '1 1 280px' }}
                />
                <Select.Root value={sort} onValueChange={(v) => setSort(v as any)}>
                  <Select.Trigger aria-label="Sort markets" style={{ minWidth: 180 }} />
                  <Select.Content>
                    <Select.Item value="recent">Most Recent</Select.Item>
                    <Select.Item value="liquidity">Highest Liquidity</Select.Item>
                  </Select.Content>
                </Select.Root>
                <Flex align="center" gap="2">
                  <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} aria-label="Auto refresh" />
                  <Text size="2" color="gray">Auto-refresh</Text>
                </Flex>
              </Flex>
            </Flex>
          </Card>
          <Flex direction="column" gap="4">
            <MarketGrid markets={sorted} isLoading={isLoading} />
          </Flex>
          <ResolvedMarketList markets={resolvedMarkets} />
          {/* Optional fallback spinner; skeletons are shown above */}
        </Flex>
      </Container>
    </Layout>
  )
}

export default IndexPage
