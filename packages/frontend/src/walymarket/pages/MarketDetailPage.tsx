import { useParams } from 'react-router-dom';
import { useGetMarket } from '~~/walymarket/hooks/useGetMarket';
import Loading from '~~/components/Loading';
import { TradeWidget } from '~~/walymarket/components/TradeWidget';
import { ClaimWinnings } from '~~/walymarket/components/ClaimWinnings';
import { UserPositions } from '~~/walymarket/components/UserPositions';
import PriceHistoryChart from '~~/walymarket/components/PriceHistoryChart';
import TopHolders from '~~/walymarket/components/TopHolders';
import MarketActivity from '~~/walymarket/components/MarketActivity';
import { formatSui, formatPercent, formatCents } from '~~/walymarket/helpers/format';
import Layout from '~~/components/layout/Layout';
import UICard from '~~/components/ui/Card';

const MarketDetailPage = () => {
    const { marketId } = useParams<{ marketId: string }>();
    const { data: market, isLoading, isError, refetch } = useGetMarket(marketId!);

    if (isLoading) {
        return (
            <Layout>
                <div className="max-w-7xl mx-auto w-full px-6 py-8">
                    <Loading />
                </div>
            </Layout>
        );
    }

    if (isError || !market) {
        return (
            <Layout>
                <div className="max-w-7xl mx-auto w-full px-6 py-8">
                    <UICard className="p-4">
                        <p className="text-red-400">Market not found.</p>
                    </UICard>
                </div>
            </Layout>
        );
    }

    const statusLabel = market.resolved ? 'Resolved' : 'Open';
    const statusColor = market.resolved ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    const yesPercent = formatPercent(market.yesChance);
    const noPercent = formatPercent(market.noChance);
    const yesPrice = formatCents(market.yesChance);
    const noPrice = formatCents(market.noChance);
    const totalAtResolution = market.totalAtResolution ?? market.totalPool;

    return (
        <Layout>
            <div className="max-w-7xl mx-auto w-full px-6 py-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left column: 2/3 width on desktop */}
                    <div className="md:col-span-2">
                        <div className="flex flex-col gap-5">
                            {/* Header */}
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${statusColor}`}>
                                        {statusLabel}
                                    </span>
                                    <span className="text-gray-400">•</span>
                                    <span className="text-sm text-gray-400">{formatSui(market.totalPool)} SUI Volume</span>
                                </div>
                                <h1 className="text-3xl font-bold text-white leading-tight">{market.question}</h1>
                            </div>

                            {/* Chart */}
                            <PriceHistoryChart marketId={market.id} />

                            {/* Outcomes with stats */}
                            <UICard className="p-4">
                                <div className="flex flex-col gap-3">
                                    <h3 className="text-base font-bold text-white">Market Stats</h3>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-400">Yes</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-white">{yesPercent} • {yesPrice}</span>
                                                <span className="text-xs text-gray-400">({formatSui(market.yesPool)} SUI)</span>
                                            </div>
                                        </div>
                                        <div className="h-px bg-[#535353]" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-400">No</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-white">{noPercent} • {noPrice}</span>
                                                <span className="text-xs text-gray-400">({formatSui(market.noPool)} SUI)</span>
                                            </div>
                                        </div>
                                        {market.resolved && (
                                            <>
                                                <div className="h-px bg-[#535353]" />
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-400">Winner</span>
                                                    <span className={`text-sm font-bold ${market.resolution ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {market.resolution ? 'YES' : 'NO'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-400">
                                                    Snapshot total: {formatSui(totalAtResolution)} SUI
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </UICard>

                            {/* User positions */}
                            <UserPositions market={market} onAction={refetch} />

                            {/* Top holders & activity */}
                            <div className="flex flex-col gap-4">
                                <TopHolders marketId={market.id} resolution={market.resolution} />
                                <MarketActivity marketId={market.id} resolution={market.resolution} />
                            </div>
                        </div>
                    </div>

                    {/* Right column: 1/3 width on desktop, sticky */}
                    <div className="md:col-span-1">
                        <div className="flex flex-col gap-4 md:sticky md:top-24">
                            <TradeWidget market={market} onTrade={refetch} />
                            <ClaimWinnings market={market} onClaimed={refetch} />
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default MarketDetailPage;
