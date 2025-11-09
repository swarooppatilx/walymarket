import '@mysten/dapp-kit/dist/index.css'
import '@radix-ui/themes/styles.css'
import '@suiware/kit/main.css'
import SuiProvider from '@suiware/kit/SuiProvider'
import { FC, StrictMode } from 'react'
import IndexPage from '~~/dapp/pages/IndexPage'
import MarketDetailPage from '~~/walymarket/pages/MarketDetailPage'
import AdminPage from '~~/walymarket/pages/AdminPage'
import PortfolioPage from '~~/walymarket/pages/PortfolioPage'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { APP_NAME } from '~~/config/main'
import { getThemeSettings } from '~~/helpers/theme'
import useNetworkConfig from '~~/hooks/useNetworkConfig'
import ThemeProvider from '~~/providers/ThemeProvider'
import '~~/styles/index.css'
import { ENetwork } from '~~/types/ENetwork'

const themeSettings = getThemeSettings()

const App: FC = () => {
  const { networkConfig } = useNetworkConfig()

  return (
    <StrictMode>
      <ThemeProvider>
        <SuiProvider
          customNetworkConfig={networkConfig}
          defaultNetwork={ENetwork.LOCALNET}
          walletAutoConnect={true}
          walletStashedName={APP_NAME}
          themeSettings={themeSettings}
        >
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<IndexPage />} />
              <Route path="/market/:marketId" element={<MarketDetailPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
            </Routes>
          </BrowserRouter>
        </SuiProvider>
      </ThemeProvider>
    </StrictMode>
  )
}

export default App
