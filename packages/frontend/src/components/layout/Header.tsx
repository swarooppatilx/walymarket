import { useCurrentAccount } from '@mysten/dapp-kit'
import CustomConnectButton from '~~/components/CustomConnectButton'
import { Link } from '@radix-ui/themes'
import Balance from '@suiware/kit/Balance'
import NetworkType from '@suiware/kit/NetworkType'
import Logo from '~~/assets/logo.svg'

const Header = () => {
  // Keep hook loaded to ensure wallet state is initialized early (no direct usage here)
  useCurrentAccount()
  return (
    <header className="sticky top-0 z-40 flex w-full bg-[#101214]">
     <div className='mt-10 flex w-full flex-row flex-wrap items-center justify-between gap-4 px-20 py-3 bg-[#101214] border-y-2 border-[#535353]'>
      <Link
        href="/"
        className="flex flex-row items-center justify-center gap-2 text-white outline-none hover:no-underline"
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
      </div>
    </header>
  )
}
export default Header
