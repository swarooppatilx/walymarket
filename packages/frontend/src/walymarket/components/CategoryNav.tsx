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
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-bold text-white">Explore Markets</h2>
            </div>
            <div className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {PRIMARY.map((p) => (
                    <button
                        key={p}
                        onClick={() => onChange(p)}
                        className={clsx(
                            'px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap border',
                            value === p
                                ? 'text-black bg-white'
                                : 'border-white/20 text-white hover:bg-white/10'
                        )}
                        aria-pressed={value === p}
                    >
                        {p}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default CategoryNav;
