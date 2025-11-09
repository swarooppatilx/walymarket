import { FC } from 'react'

const Loading: FC = () => {
  return (
    <div className="flex flex-row items-center justify-center gap-2">
      <svg className="h-6 w-6 animate-spin text-[#B6F34E]" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <span className="text-white">Loading...</span>
    </div>
  )
}

export default Loading
