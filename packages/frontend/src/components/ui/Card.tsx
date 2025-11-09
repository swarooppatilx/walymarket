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
                'rounded-md border border-[#535353] bg-[#2B2B2B] ',
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
