import UICard from '~~/components/ui/Card';
import useMarketActivity from '~~/walymarket/hooks/useMarketActivity';
import { shortId, formatSui } from '~~/walymarket/helpers/format';

export const MarketActivity = ({ marketId, resolution }: { marketId: string; resolution: boolean | null }) => {
    const { events, loading, error, reload } = useMarketActivity(marketId, resolution);

    return (
        <UICard className="p-4">
            <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                    <h3 className="text-base font-bold text-white">Recent Activity</h3>
                    <button className="text-xs text-gray-400 cursor-pointer hover:text-white" onClick={reload}>↻</button>
                </div>
                {loading && <p className="text-sm text-gray-400">Loading activity…</p>}
                {error && <p className="text-sm text-red-400">Failed to load activity</p>}
                {!loading && !error && events.length === 0 && <p className="text-sm text-gray-400">No recent activity</p>}
                {!loading && !error && events.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-[#535353]">
                                <tr>
                                    <th className="text-left py-2 text-xs font-medium text-gray-400">Time</th>
                                    <th className="text-left py-2 text-xs font-medium text-gray-400">Actor</th>
                                    <th className="text-left py-2 text-xs font-medium text-gray-400">Action</th>
                                    <th className="text-left py-2 text-xs font-medium text-gray-400">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.slice(0, 25).map((e, idx) => (
                                    <tr key={idx} className="border-b border-[#535353]/50">
                                        <td className="py-2 text-white">{new Date(e.ts).toLocaleTimeString()}</td>
                                        <td className="py-2 text-white">{shortId(e.address)}</td>
                                        <td className="py-2">
                                            <span className={e.kind === 'TRADE' ? (e.buy ? (e.yes ? 'text-emerald-400' : 'text-rose-400') : 'text-gray-400') : 'text-gray-400'}>
                                                {e.kind === 'TRADE' ? (e.buy ? (e.yes ? 'Buy YES' : 'Buy NO') : (e.yes ? 'Sell YES' : 'Sell NO')) : 'Redeem'}
                                            </span>
                                        </td>
                                        <td className="py-2 text-white">
                                            {e.kind === 'TRADE' ? (
                                                <span>{e.shares} shares • {formatSui(e.cost)} SUI</span>
                                            ) : (
                                                <span>{formatSui(e.payout)} SUI</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </UICard>
    );
};

export default MarketActivity;