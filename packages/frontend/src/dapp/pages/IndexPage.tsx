import { FC } from 'react'
import { Card, Flex, Text, TextField, Select, Container } from '@radix-ui/themes'
import Layout from '~~/components/layout/Layout'
import NetworkSupportChecker from '../../components/NetworkSupportChecker'
// import { MarketList } from '~~/walymarket/components/MarketList'
import MarketGrid from '~~/walymarket/components/MarketGrid'
import CategoryNav from '~~/walymarket/components/CategoryNav'
import { useGetMarkets } from '~~/walymarket/hooks/useGetMarkets'
import useMarketFilters from '~~/walymarket/hooks/useMarketFilters'
// import Loading from '~~/components/Loading'

const IndexPage: FC = () => {
  const { markets, resolvedMarkets, isLoading, error } = useGetMarkets()
  const { query, setQuery, sort, setSort, category, setCategory, filtered } = useMarketFilters(markets)
  const showingResolvedCategory = category === 'Resolved'
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
              </Flex>
            </Flex>
          </Card>
          <Flex direction="column" gap="4">
            <MarketGrid markets={showingResolvedCategory ? resolvedMarkets : filtered} isLoading={isLoading} />
          </Flex>
        </Flex>
      </Container>
    </Layout>
  )
}

export default IndexPage
