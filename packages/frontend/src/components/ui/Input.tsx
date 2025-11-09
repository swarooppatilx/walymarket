import clsx from 'clsx'
import { InputHTMLAttributes, forwardRef, ReactNode } from 'react'

export type UIInputProps = InputHTMLAttributes<HTMLInputElement> & {
    startIcon?: ReactNode
    endIcon?: ReactNode
}

const base =
    'w-full h-10 rounded-md border border-[#535353] bg-[#2B2B2B] px-3 text-sm text-white placeholder:text-gray-400 outline-none transition-colors focus:border-[#B6F34E] focus:ring-2 focus:ring-[#B6F34E]/30'

export const Input = forwardRef<HTMLInputElement, UIInputProps>(
    ({ className, startIcon, endIcon, ...props }, ref) => {
        return (
            <div className="relative">
                {startIcon && (
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                        {startIcon}
                    </span>
                )}
                <input
                    ref={ref}
                    className={clsx(base, startIcon && 'pl-9', endIcon && 'pr-9', className)}
                    {...props}
                />
                {endIcon && (
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                        {endIcon}
                    </span>
                )}
            </div>
        )
    }
)
Input.displayName = 'UIInput'

export default Input
