import { ConnectModal, useCurrentAccount } from '@mysten/dapp-kit'
import { Button, DropdownMenu, Separator, Text, Avatar } from '@radix-ui/themes'
import { Link } from 'react-router-dom'
import { APP_NAME } from '~~/config/main'

const CustomConnectButton = () => {
  const currentAccount = useCurrentAccount()

  const logout = () => {
    try {
      localStorage.removeItem(APP_NAME)
    } catch { }
    // Reload to fully reset providers and clear connection state
    window.location.reload()
  }

  if (!currentAccount) {
    return (
      <div className="sds-connect-button-container">
        <ConnectModal
          trigger={
            <Button variant="ghost" size="2">Connect</Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="sds-connect-button-container">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="ghost" size="2" className="!px-2">
            <span className="flex items-center gap-2">
              <Avatar fallback="W" size="1" radius="full" />
              <span className="text-sm opacity-80">{currentAccount.address.slice(0, 6)}…{currentAccount.address.slice(-4)}</span>
              <span className="opacity-60">▾</span>
            </span>
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content sideOffset={8} align="end" className="min-w-[220px] dropdown-menu-sds">
          <DropdownMenu.Item asChild>
            <Link to="/portfolio">Portfolio</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link to="/admin">Admin Panel</Link>
          </DropdownMenu.Item>
          <Separator my="2" />
          <DropdownMenu.Item disabled>
            <Text size="1" color="gray">{currentAccount.address.slice(0, 10)}…</Text>
          </DropdownMenu.Item>
          <DropdownMenu.Item color="red" onSelect={logout}>Logout</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  )
}

export default CustomConnectButton
