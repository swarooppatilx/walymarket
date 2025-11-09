import clsx from 'clsx'
import { HTMLAttributes } from 'react'

export type UICardProps = HTMLAttributes<HTMLDivElement> & {
    interactive?: boolean
    padded?: boolean
}

export const Card = ({
    interactive,
    padded = true,
    className,
    ...props
}: UICardProps) => {
    return (
        <div
            className={clsx(
                'rounded-xl border border-white/10 bg-white/5 dark:bg-slate-900/40 backdrop-blur-sm',
                padded && 'p-4',
                interactive &&
                'transition-transform hover:-translate-y-0.5 hover:shadow-lg hover:border-white/20',
                className
            )}
            {...props}
        />
    )
}

export default Card
