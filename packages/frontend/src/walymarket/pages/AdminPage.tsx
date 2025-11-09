import { Link } from 'react-router-dom';
import Layout from '~~/components/layout/Layout';
import { useGetOwnedAdminCap } from '~~/walymarket/hooks/useGetOwnedAdminCap';
import { useGetMarkets } from '~~/walymarket/hooks/useGetMarkets';
import { CreateMarketForm } from '~~/walymarket/components/CreateMarketForm';
import { MarketManager } from '~~/walymarket/components/MarketManager';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { ADMIN_ADDRESS } from '~~/walymarket/config/admin';
import UICard from '~~/components/ui/Card';

const AdminPage = () => {
    const { isAdmin } = useGetOwnedAdminCap();
    const { markets, resolvedMarkets, refetch } = useGetMarkets();
    const current = useCurrentAccount();

    return (
        <Layout>
            <div className="max-w-5xl mx-auto w-full px-6 py-5">
                <div className="flex flex-col gap-4">
                    <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
                    <UICard className="p-4">
                        <div className="flex flex-col gap-2">
                            <h3 className="font-bold text-white">Admin Status</h3>
                            {!current && <p className="text-red-400">Connect a wallet to continue.</p>}
                            {current && (
                                <>
                                    <p className="text-sm text-white">
                                        Connected: <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isAdmin ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>{current.address}</span>
                                    </p>
                                    <p className="text-xs text-gray-400">Allowed admin: {ADMIN_ADDRESS}</p>
                                </>
                            )}
                        </div>
                    </UICard>
                    {!current && <></>}
                    {current && !isAdmin && (
                        <p className="text-red-400">Access denied. This page is restricted to the admin address.</p>
                    )}
                    {current && isAdmin && (
                        <div className="flex flex-col gap-5">
                            <CreateMarketForm onCreated={refetch} />
                            <MarketManager markets={markets} onResolved={refetch} />
                            <UICard className="p-4">
                                <div className="flex flex-col gap-3">
                                    <h3 className="font-bold text-white">Recently Resolved</h3>
                                    <div className="h-px bg-[#535353] my-1" />
                                    {resolvedMarkets.length === 0 && <p className="text-gray-400">No resolved markets yet.</p>}
                                    {resolvedMarkets.map((m) => (
                                        <div key={m.id}>
                                            <div className="h-px bg-[#535353]" />
                                            <div className="flex justify-between items-center py-2 flex-wrap gap-2">
                                                <div className="flex flex-col gap-1 min-w-[260px] flex-1">
                                                    <p className="text-white">{m.title || m.question}</p>
                                                    <p className="text-xs text-gray-400">Outcome: {m.resolution === null ? '-' : m.resolution ? 'YES' : 'NO'}</p>
                                                </div>
                                                <Link
                                                    to={`/market/${m.id}`}
                                                    className="px-3 py-1.5 rounded-md bg-[#B6F34E] text-black text-sm font-medium hover:bg-[#9ED93A] transition-colors"
                                                >
                                                    Open
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </UICard>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default AdminPage;
