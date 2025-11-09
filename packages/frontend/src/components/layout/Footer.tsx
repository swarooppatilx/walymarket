import { useCurrentAccount } from '@mysten/dapp-kit'
import Faucet from '@suiware/kit/Faucet'
import { GithubIcon, SearchIcon, ZapIcon } from 'lucide-react'
import {
  CONTRACT_PACKAGE_VARIABLE_NAME,
  EXPLORER_URL_VARIABLE_NAME,
} from '~~/config/network'
import { packageUrl } from '~~/helpers/network'
import { notification } from '~~/helpers/notification'
import useNetworkConfig from '~~/hooks/useNetworkConfig'

const Footer = () => {
  const { useNetworkVariables } = useNetworkConfig()
  const networkVariables = useNetworkVariables()
  const explorerUrl = networkVariables[EXPLORER_URL_VARIABLE_NAME]
  const packageId = networkVariables[CONTRACT_PACKAGE_VARIABLE_NAME]
  const currentAccount = useCurrentAccount()

  return (
    <footer className="flex w-full flex-col items-center justify-between gap-4 py-6 px-20 sm:flex-row bg-[#101214] border-t-2 border-[#535353]">
      <div className="flex flex-row items-center gap-3 sm:w-1/3">
        {currentAccount != null && (
          <>
            <button
              onClick={() => {
                // Faucet component handles the actual faucet logic
                const faucetButton = document.querySelector('[data-faucet-button]') as HTMLButtonElement;
                faucetButton?.click();
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#B6F34E] text-black text-sm font-medium hover:bg-[#9ED93A] transition-colors border border-[#9ED93A]"
            >
              <ZapIcon className="h-4 w-4" />
              <span>Faucet</span>
            </button>
            <div className="hidden">
              <Faucet
                onError={notification.error}
                onSuccess={notification.success}
              />
            </div>
            <a
              href={packageUrl(explorerUrl, packageId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#2B2B2B] text-white text-sm font-medium hover:bg-[#3a3a3a] transition-colors border border-[#535353]"
            >
              <SearchIcon className="h-4 w-4" />
              <span>Explorer</span>
            </a>
          </>
        )}
      </div>

      <div className="flex flex-row items-center justify-center gap-2 text-sm text-gray-400 sm:w-1/3">
        <ZapIcon className="h-4 w-4 text-[#B6F34E]" />
        <span>Built for Haulout 2025</span>
      </div>

      <div className="flex flex-row items-center justify-end gap-3 sm:w-1/3">
        <a
          href="https://github.com/swarooppatilx/walymarket"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <GithubIcon className="h-4 w-4" />
          <span>GitHub</span>
        </a>
      </div>
    </footer>
  )
}
export default Footer
