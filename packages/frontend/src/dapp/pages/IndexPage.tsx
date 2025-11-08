import { FC } from 'react'
// import GreetingForm from '~~/dapp/components/GreetingForm'
import Layout from '~~/components/layout/Layout'
import NetworkSupportChecker from '../../components/NetworkSupportChecker'
import { MarketList } from '~~/walymarket/components/MarketList'
import { useGetMarkets } from '~~/walymarket/hooks/useGetMarkets'

const IndexPage: FC = () => {
  const { markets } = useGetMarkets()
  return (
    <Layout>
      <NetworkSupportChecker />
      <div className="justify-content flex flex-grow flex-col gap-4 rounded-md p-3">
        <MarketList markets={markets} />
      </div>
    </Layout>
  )
}

export default IndexPage
