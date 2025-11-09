import UICard from '~~/components/ui/Card';
import { shortId, formatPercent } from '~~/walymarket/helpers/format';
import useMarketActivity from '~~/walymarket/hooks/useMarketActivity';

export const TopHolders = ({ marketId, resolution }: { marketId: string; resolution: boolean | null }) => {
    const { holders, loading, error, reload } = useMarketActivity(marketId, resolution);

    return (
        <UICard className="p-4">
            <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                    <h3 className="text-base font-bold text-white">Top Holders</h3>
                    <button className="text-xs text-gray-400 cursor-pointer hover:text-white" onClick={reload}>↻</button>
                </div>
                {loading && <p className="text-sm text-gray-400">Loading holders…</p>}
                {error && <p className="text-sm text-red-400">Failed to load holders</p>}
                {!loading && !error && holders.length === 0 && <p className="text-sm text-gray-400">No positions yet</p>}
                {!loading && !error && holders.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-[#535353]">
                                <tr>
                                    <th className="text-left py-2 text-xs font-medium text-gray-400">Address</th>
                                    <th className="text-left py-2 text-xs font-medium text-gray-400">YES</th>
                                    <th className="text-left py-2 text-xs font-medium text-gray-400">NO</th>
                                    <th className="text-left py-2 text-xs font-medium text-gray-400">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {holders.map(h => {
                                    const yesPct = h.total > 0 ? h.yes / h.total : 0;
                                    const netYes = h.yes < 0 ? 0 : h.yes;
                                    const netNo = h.no < 0 ? 0 : h.no;
                                    return (
                                        <tr key={h.address} className="border-b border-[#535353]/50">
                                            <td className="py-2 text-white">{shortId(h.address)}</td>
                                            <td className="py-2 text-emerald-400">{netYes}</td>
                                            <td className="py-2 text-rose-400">{netNo}</td>
                                            <td className="py-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-white font-medium">{h.total}</span>
                                                    <span className="text-xs text-gray-400">YES {formatPercent(yesPct)}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </UICard>
    );
};

export default TopHolders;