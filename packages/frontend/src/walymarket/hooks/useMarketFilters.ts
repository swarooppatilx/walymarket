import { useMemo, useState } from 'react'
import { Market } from '~~/walymarket/types'

export type SortKey = 'liquidity' | 'recent'
export type PrimaryCategory = 'Trending' | 'New' | 'Politics' | 'Crypto' | 'Sports' | 'Finance' | 'Resolved'

const keywordMatch = (q: string, cats: string[]) => cats.some(k => q.includes(k))

export default function useMarketFilters(markets: Market[]) {
    const [query, setQuery] = useState('')
    const [sort, setSort] = useState<SortKey>('recent')
    const [category, setCategory] = useState<PrimaryCategory>('Trending')

    const filtered = useMemo(() => {
        const qLower = (s: string) => s.toLowerCase()
        const list = markets
            .filter((m) => {
                const q = qLower(m.question)
                if (!query && (category === 'Trending' || category === 'New')) return true
                if (category === 'Politics') return keywordMatch(q, ['election', 'vote', 'president', 'parliament', 'senate'])
                if (category === 'Crypto') return keywordMatch(q, ['crypto', 'bitcoin', 'btc', 'ethereum', 'eth', 'sui'])
                if (category === 'Sports') return keywordMatch(q, ['win', 'league', 'cup', 'match', 'game'])
                if (category === 'Finance') return keywordMatch(q, ['stock', 'rate', 'inflation', 'gdp', 'cpi'])
                if (category === 'Resolved') return !!m.resolved
                return true
            })
            .filter((m) => qLower(m.question).includes(qLower(query)))

        if (sort === 'liquidity') {
            return [...list].sort((a, b) => b.totalPool - a.totalPool)
        }
        return list
    }, [markets, query, sort, category])

    return {
        query,
        setQuery,
        sort,
        setSort,
        category,
        setCategory,
        filtered,
    }
}
