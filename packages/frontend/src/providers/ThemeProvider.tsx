import { Theme } from '@radix-ui/themes'
import { FC, PropsWithChildren } from 'react'

const ThemeProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <Theme className="w-full bg-[#2B2B2B] text-white">
      {children}
    </Theme>
  )
}

export default ThemeProvider
