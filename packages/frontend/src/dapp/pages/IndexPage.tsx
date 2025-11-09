import { FC } from 'react'
import UICard from '~~/components/ui/Card'
import UIInput from '~~/components/ui/Input'
import UISelect from '~~/components/ui/Select'
import Layout from '~~/components/layout/Layout'
import NetworkSupportChecker from '../../components/NetworkSupportChecker'
import MarketGrid from '~~/walymarket/components/MarketGrid'
import CategoryNav from '~~/walymarket/components/CategoryNav'
import { useGetMarkets } from '~~/walymarket/hooks/useGetMarkets'
import useMarketFilters from '~~/walymarket/hooks/useMarketFilters'

const IndexPage: FC = () => {
  const { markets, resolvedMarkets, isLoading, error } = useGetMarkets()
  const { query, setQuery, sort, setSort, category, setCategory, filtered } = useMarketFilters(markets)
  const showingResolvedCategory = category === 'Resolved'
  
  return (
    <Layout>
      <NetworkSupportChecker />
      <div className="max-w-7xl mx-auto w-full px-6 py-6">
        <div className="flex flex-col gap-6">
          {error && (
            <UICard className="p-4 border-red-500/20 bg-red-500/10">
              <p className="text-red-400">Failed to load markets: {error.message}</p>
            </UICard>
          )}
          
          <UICard className="p-4">
            <div className="flex flex-col gap-4">
              <CategoryNav value={category} onChange={setCategory} />
              <div className="flex gap-3 flex-wrap items-center">
                <div className="flex-1 min-w-[280px]">
                  <UIInput
                    placeholder="Search markets..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Search markets by question"
                  />
                </div>
                <UISelect
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                  className="min-w-[180px]"
                  aria-label="Sort markets"
                >
                  <option value="recent">Most Recent</option>
                  <option value="liquidity">Highest Liquidity</option>
                </UISelect>
              </div>
            </div>
          </UICard>
          
          <div className="flex flex-col gap-4">
            <MarketGrid markets={showingResolvedCategory ? resolvedMarkets : filtered} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default IndexPage
