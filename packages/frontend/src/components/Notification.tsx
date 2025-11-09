import c from 'clsx'
import { XIcon } from 'lucide-react'
import { FC, PropsWithChildren } from 'react'
import toast, { ToastType } from 'react-hot-toast'

interface INotification {
  id?: string
  type: ToastType
}

const Notification: FC<PropsWithChildren<INotification>> = ({
  children,
  id,
  type,
}) => {
  const isCloseButtonVisible = id !== null && type !== 'loading'

  return (
    <div className="flex w-full flex-row items-center justify-between gap-2">
      <div
        className={c('text-pretty', {
          'mr-2': isCloseButtonVisible,
        })}
        style={{
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
        }}
      >
        {children}
      </div>
      {isCloseButtonVisible && (
        <button
          className="-mr-3 cursor-pointer px-1 text-gray-400 hover:text-white transition-colors"
          onClick={() => toast.dismiss(id)}
        >
          <XIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}

export default Notification
