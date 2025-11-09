import { FC, PropsWithChildren } from 'react'
import Body from '~~/components/layout/Body'
import Extra from '~~/components/layout/Extra'
import Footer from '~~/components/layout/Footer'
import Header from '~~/components/layout/Header'

const Layout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="flex min-h-screen w-full flex-col items-center gap-6">
      <Header />
      <Body>{children}</Body>
      <Footer />
      <Extra />
    </div>
  )
}

export default Layout
