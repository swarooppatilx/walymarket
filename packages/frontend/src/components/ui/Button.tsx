import clsx from 'clsx'
import { ButtonHTMLAttributes, forwardRef } from 'react'

export type UIButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
}

const base =
    'inline-flex items-center justify-center font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-md'

const sizeMap = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-5 text-base',
} as const

const variantMap = {
    primary:
        'bg-[#B6F34E] text-black hover:bg-[#9ED93A] focus-visible:ring-[#B6F34E] ring-offset-0',
    secondary:
        'bg-[#2B2B2B] text-white hover:bg-[#3a3a3a] border border-[#535353] focus-visible:ring-white/30',
    ghost: 'bg-transparent text-white hover:bg-white/10 focus-visible:ring-white/30 border border-[#535353]',
} as const

export const Button = forwardRef<HTMLButtonElement, UIButtonProps>(
    ({ className, variant = 'primary', size = 'md', loading, children, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={clsx(base, sizeMap[size], variantMap[variant], className)}
                {...props}
            >
                {loading ? (
                    <span className="inline-flex items-center gap-2">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        {children}
                    </span>
                ) : (
                    children
                )}
            </button>
        )
    }
)
Button.displayName = 'UIButton'

export default Button
