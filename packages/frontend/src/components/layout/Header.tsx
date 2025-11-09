import { useCurrentAccount } from '@mysten/dapp-kit'
import CustomConnectButton from '~~/components/CustomConnectButton'
import { Link } from '@radix-ui/themes'
// import { Link as RouterLink } from 'react-router-dom'
import Balance from '@suiware/kit/Balance'
import NetworkType from '@suiware/kit/NetworkType'
import Logo from '~~/assets/logo.svg'

const Header = () => {
  // Keep hook loaded to ensure wallet state is initialized early (no direct usage here)
  useCurrentAccount()
  return (
    <header className="supports-backdrop-blur:bg-white/60 dark:border-slate-50/10 sticky top-0 z-40 flex w-full flex-row flex-wrap items-center justify-between gap-4 bg-white/95 px-6 py-3 backdrop-blur transition-colors duration-500 lg:z-50 lg:border-b lg:border-slate-900/10 dark:bg-transparent">
      <Link
        href="/"
        className="flex flex-row items-center justify-center gap-2 text-sds-dark outline-none hover:no-underline dark:text-sds-light"
      >
        <img src={Logo} alt="Walymarket Logo" className="h-8" />
      </Link>

      <div className="flex flex-row items-center justify-center gap-3">
        <Balance />
        <NetworkType />
        <div className="sds-connect-button-container">
          <CustomConnectButton />
        </div>
      </div>
    </header>
  )
}
export default Header
