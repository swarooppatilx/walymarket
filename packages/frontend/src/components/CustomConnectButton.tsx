import { ConnectModal, useCurrentAccount } from '@mysten/dapp-kit'
import { Link } from 'react-router-dom'
import { APP_NAME } from '~~/config/main'
import { useState, useRef, useEffect } from 'react'

const pillClasses =
  'inline-flex items-center gap-3 rounded-full border border-white/20 text-white shadow-sm h-10 px-5 transition-colors hover:bg-white/95 cursor-pointer font-medium'
const indicator =
  'inline-flex h-3.5 w-10 rounded-full border border-[#9ED93A] bg-[#B6F34E] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]'
const label =
  'text-[11px] font-semibold tracking-[0.35em] uppercase'

const CustomConnectButton = () => {
  const currentAccount = useCurrentAccount()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const logout = () => {
    try {
      localStorage.removeItem(APP_NAME)
    } catch { }
    // Reload to fully reset providers and clear connection state
    window.location.reload()
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!currentAccount) {
    return (
      <div className="sds-connect-button-container">
        <ConnectModal
          trigger={
            <button className={pillClasses} aria-label="Connect wallet">
              <span className={indicator} />
              <span className={label}>CONNECT</span>
            </button>
          }
        />
      </div>
    )
  }

  const short = `${currentAccount.address.slice(0, 6)}…${currentAccount.address.slice(-4)}`

  return (
    <div className="sds-connect-button-container relative" ref={dropdownRef}>
      <button
        className={pillClasses}
        aria-label="Wallet menu"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={indicator} />
        <span className={label}>{short}</span>
        <span className="ml-1 text-white">▾</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 min-w-[220px] rounded-md border border-white/10 bg-[#1a1d21] shadow-lg z-50">
          <div className="py-1">
            <Link
              to="/portfolio"
              className="block px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Portfolio
            </Link>
            <Link
              to="/admin"
              className="block px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Admin Panel
            </Link>
            <div className="h-px bg-white/10 my-2" />
            <div className="px-4 py-2 text-sm text-gray-400 cursor-not-allowed flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#3a3a3a] flex items-center justify-center text-white text-xs font-bold">
                W
              </div>
              <span className="text-xs">{currentAccount.address.slice(0, 10)}…</span>
            </div>
            <button
              onClick={() => {
                logout()
                setIsOpen(false)
              }}
              className="block border-none w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomConnectButton
