import { useState } from 'react';
import UIButton from '~~/components/ui/Button';
import UICard from '~~/components/ui/Card';
import useTransact from '@suiware/kit/useTransact';
import { SuiSignAndExecuteTransactionOutput } from '@mysten/wallet-standard';
import useNetworkConfig from '~~/hooks/useNetworkConfig';
import { CONTRACT_PACKAGE_VARIABLE_NAME, EXPLORER_URL_VARIABLE_NAME } from '~~/config/network';
import { Market } from '~~/walymarket/types';
import { prepareResolveMarketTx } from '~~/walymarket/helpers/transactions';
import { notification } from '~~/helpers/notification';
import { transactionUrl } from '~~/helpers/network';

export const MarketManager = ({ markets, onResolved }: { markets: Market[]; onResolved?: () => void }) => {
    const { useNetworkVariable } = useNetworkConfig();
    const packageId = useNetworkVariable(CONTRACT_PACKAGE_VARIABLE_NAME);
    const explorerUrl = useNetworkVariable(EXPLORER_URL_VARIABLE_NAME);
    const [pendingMarketId, setPendingMarketId] = useState<string | null>(null);

    const { transact } = useTransact({
        onSuccess: (result: SuiSignAndExecuteTransactionOutput) => {
            const link = explorerUrl ? transactionUrl(explorerUrl, result.digest) : null;
            if (link) {
                notification.txSuccess(link);
            } else {
                notification.success(`Transaction ${result.digest} submitted.`);
            }
            setPendingMarketId(null);
            onResolved?.();
        },
        onError: (err: Error) => {
            notification.txError(err);
            setPendingMarketId(null);
        },
    });

    const handleResolve = (marketId: string, winningYes: boolean) => {
        if (!packageId) return;
        const tx = prepareResolveMarketTx(packageId, marketId, winningYes);
        setPendingMarketId(marketId);
        transact(tx);
    };

    return (
        <UICard className="p-4">
            <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center flex-wrap gap-2">
                    <h3 className="text-base font-bold text-white">Active Markets</h3>
                    <p className="text-xs text-gray-400">Resolve once outcome is certain. This action is final.</p>
                </div>
                <div className="h-px bg-[#535353] my-2" />
                {markets.length === 0 && <p className="text-gray-400">No active markets.</p>}
                <div className="grid gap-3 md:grid-cols-2">
                    {markets.map((m) => (
                        <UICard key={m.id} className="p-3.5">
                            <div className="flex items-start gap-3 flex-wrap justify-between">
                                <div className="flex items-start gap-3 min-w-[260px] flex-1">
                                    {m.imageUrl ? (
                                        <img src={m.imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover border border-white/15" />
                                    ) : (
                                        <div className="w-14 h-14 rounded-lg bg-[#3a3a3a] flex items-center justify-center text-white font-bold">M</div>
                                    )}
                                    <div className="flex flex-col gap-2">
                                        <p className="font-bold text-white">{m.title || m.question}</p>
                                        {(m as any).description && (
                                            <p className="text-xs text-gray-400 line-clamp-2">{(m as any).description}</p>
                                        )}
                                        <div className="flex gap-2 items-center flex-wrap">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                YES {(m.yesChance * 100).toFixed(1)}%
                                            </span>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                                NO {(m.noChance * 100).toFixed(1)}%
                                            </span>
                                            <span className="text-xs text-gray-400">Y {formatPool(m.yesPool)} · N {formatPool(m.noPool)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <UIButton
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleResolve(m.id, true)}
                                        disabled={pendingMarketId === m.id}
                                    >
                                        {pendingMarketId === m.id ? 'Resolving…' : 'Resolve YES'}
                                    </UIButton>
                                    <UIButton
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleResolve(m.id, false)}
                                        disabled={pendingMarketId === m.id}
                                    >
                                        {pendingMarketId === m.id ? 'Resolving…' : 'Resolve NO'}
                                    </UIButton>
                                </div>
                            </div>
                        </UICard>
                    ))}
                </div>
            </div>
        </UICard>
    );
};

function formatPool(v: number): string {
    return (v / 1_000_000_000).toFixed(2) + ' SUI';
}
