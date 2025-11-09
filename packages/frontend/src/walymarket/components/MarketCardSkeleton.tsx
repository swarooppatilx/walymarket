import UICard from '~~/components/ui/Card';

export const MarketCardSkeleton = () => {
    return (
        <UICard className="min-h-[200px] p-4">
            <div className="flex flex-col gap-3 justify-between h-full animate-pulse">
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <div className="h-5 w-16 rounded-full bg-white/10" />
                        <div className="h-4 w-20 rounded-md bg-white/10" />
                    </div>
                    <div className="h-5 w-[90%] rounded-md bg-white/10" />
                    <div className="h-5 w-[75%] rounded-md bg-white/10" />
                    <div className="h-4 w-1/2 rounded-md bg-white/10" />
                    <div className="h-1.5 w-full rounded-md bg-white/10" />
                </div>
                <div className="h-9 w-full rounded-md bg-white/10" />
            </div>
        </UICard>
    );
};

export default MarketCardSkeleton;
