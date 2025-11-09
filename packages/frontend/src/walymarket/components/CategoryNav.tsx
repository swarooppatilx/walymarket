import { Flex, Text } from '@radix-ui/themes';
import clsx from 'clsx';

const PRIMARY = ['Trending', 'New', 'Politics', 'Crypto', 'Sports', 'Finance', 'Resolved'] as const;

export type PrimaryCategory = typeof PRIMARY[number];

export const CategoryNav = ({
    value,
    onChange,
}: {
    value: PrimaryCategory;
    onChange: (v: PrimaryCategory) => void;
}) => {
    return (
        <Flex direction="column" gap="3">
            <Flex align="center" justify="between" wrap="wrap" gap="2">
                <Text weight="bold" size="4">Explore Markets</Text>
            </Flex>
            {/* Primary category chips */}
            <div className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {PRIMARY.map((p) => (
                    <button
                        key={p}
                        onClick={() => onChange(p)}
                        className={clsx(
                            'px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
                            'border',
                            value === p
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white/5 dark:bg-slate-900/40 border-white/10 text-gray-300 hover:bg-white/10'
                        )}
                        aria-pressed={value === p}
                    >
                        {p}
                    </button>
                ))}
            </div>
            {/* Secondary filters removed as requested */}
        </Flex>
    );
};

export default CategoryNav;
