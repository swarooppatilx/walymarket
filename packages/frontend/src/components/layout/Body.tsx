import { FC, PropsWithChildren } from 'react'

const Body: FC<PropsWithChildren> = ({ children }) => {
  return (
    <main className="flex flex-grow w-full flex-col py-8 bg-[#101214]">
      {children}
    </main>
  )
}
export default Body
