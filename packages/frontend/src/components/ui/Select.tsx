import clsx from 'clsx'
import { SelectHTMLAttributes, forwardRef } from 'react'

export type UISelectProps = SelectHTMLAttributes<HTMLSelectElement>

const base =
    'w-full h-10 rounded-md border border-[#535353] bg-[#2B2B2B] px-3 pr-8 text-sm text-white outline-none transition-colors focus:border-[#B6F34E] focus:ring-2 focus:ring-[#B6F34E]/30 appearance-none cursor-pointer'

export const Select = forwardRef<HTMLSelectElement, UISelectProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <div className="relative">
                <select
                    ref={ref}
                    className={clsx(base, className)}
                    {...props}
                >
                    {children}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
        )
    }
)
Select.displayName = 'UISelect'

export default Select
