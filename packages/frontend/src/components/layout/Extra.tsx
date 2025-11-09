import { Toaster } from 'react-hot-toast'
import AnimatedBackground from '~~/components/AnimatedBackground'

const Extra = () => {
  return (
    <>
    <div className='pointer-events-none fixed inset-0 z-[60]'>
      <div className='absolute inset-y-0  left-10 w-0.5 bg-[#535353]'></div>
      <div className='absolute inset-y-0 right-10 w-0.5 bg-[#535353]'></div>
    </div>
      <Toaster
        toastOptions={{
          className:
            'dark:!bg-sds-dark !bg-sds-light !text-sds-dark dark:!text-sds-light w-full md:!max-w-xl !shadow-toast',
          style: {
            maxWidth: 'none',
          },
        }}
      />
    </>
  )
}
export default Extra
