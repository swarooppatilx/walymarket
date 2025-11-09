import { useMemo, useState } from 'react';
import UIButton from '~~/components/ui/Button';
import UICard from '~~/components/ui/Card';
import UIInput from '~~/components/ui/Input';
import useNetworkConfig from '~~/hooks/useNetworkConfig';
import { CONTRACT_PACKAGE_VARIABLE_NAME, EXPLORER_URL_VARIABLE_NAME } from '~~/config/network';
import useTransact from '@suiware/kit/useTransact';
import { SuiSignAndExecuteTransactionOutput } from '@mysten/wallet-standard';
import { notification } from '~~/helpers/notification';
import { transactionUrl } from '~~/helpers/network';
import { prepareCreateMarketTx } from '~~/walymarket/helpers/transactions';

export const CreateMarketForm = ({ onCreated }: { onCreated?: () => void }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [bInput, setBInput] = useState('100000');
    const [expiryInput, setExpiryInput] = useState<string>(() => {
        const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
        return iso.slice(0, 16);
    });
    const [pending, setPending] = useState(false);
    const { useNetworkVariable } = useNetworkConfig();
    const packageId = useNetworkVariable(CONTRACT_PACKAGE_VARIABLE_NAME);
    const explorerUrl = useNetworkVariable(EXPLORER_URL_VARIABLE_NAME);

    const { transact } = useTransact({
        onSuccess: (result: SuiSignAndExecuteTransactionOutput) => {
            setPending(false);
            if (explorerUrl) {
                notification.txSuccess(transactionUrl(explorerUrl, result.digest));
            } else {
                notification.success(`Transaction ${result.digest} submitted.`);
            }
            onCreated?.();
            setTitle('');
            setDescription('');
            setImageUrl('');
        },
        onError: (e: Error) => {
            setPending(false);
            notification.txError(e);
        },
    });

    const b = useMemo(() => {
        const n = Number(bInput);
        return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1_000_000_000;
    }, [bInput]);

    const expiry = useMemo(() => {
        if (!expiryInput) return Math.floor(Date.now() / 1000) + 24 * 60 * 60;
        const ms = Date.parse(expiryInput);
        return isNaN(ms) ? Math.floor(Date.now() / 1000) + 24 * 60 * 60 : Math.floor(ms / 1000);
    }, [expiryInput]);

    const handleSubmit = () => {
        if (!title.trim() || !packageId) return;
        setPending(true);
        const tx = prepareCreateMarketTx(packageId, title.trim(), description.trim(), imageUrl.trim(), b, expiry);
        transact(tx);
    };

    return (
        <UICard className="p-6">
            <div className="flex flex-col gap-4">
                <h3 className="text-lg font-bold text-white">Create New Market</h3>
                <p className="text-sm text-gray-400 max-w-2xl">Define the title, description, image, liquidity b, and expiry. Higher b makes prices move slower.</p>
                
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-300">Title</label>
                    <UIInput
                        placeholder="e.g., Will BTC hit $100k by 2026?"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-300">Description</label>
                    <textarea
                        className="w-full rounded-md border border-[#535353] bg-[#2B2B2B] px-3 py-2 text-sm text-white placeholder:text-gray-400 outline-none transition-colors focus:border-[#B6F34E] focus:ring-2 focus:ring-[#B6F34E]/30 resize-vertical"
                        rows={3}
                        placeholder="Optional details, context, rules..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-300">Image URL</label>
                    <UIInput
                        placeholder="https://…"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                    />
                    {imageUrl && (
                        <img
                            src={imageUrl}
                            alt="Market"
                            className="max-w-[240px] mt-2 rounded-lg border border-[#535353]"
                            onError={() => setImageUrl('')}
                        />
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-300">Liquidity b (share scale)</label>
                        <UIInput
                            value={bInput}
                            onChange={(e) => setBInput(e.target.value)}
                        />
                        <p className="text-xs text-gray-400">Lower b = more volatile. Recommended: 10k–1M.</p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-300">Expiry</label>
                        <input
                            type="datetime-local"
                            value={expiryInput}
                            onChange={(e) => setExpiryInput(e.target.value)}
                            className="w-full h-10 rounded-md border border-[#535353] bg-[#2B2B2B] px-3 text-sm text-white outline-none transition-colors focus:border-[#B6F34E] focus:ring-2 focus:ring-[#B6F34E]/30"
                        />
                    </div>
                </div>

                <div className="h-px bg-[#535353] my-2" />

                <UIButton
                    onClick={handleSubmit}
                    disabled={!title.trim() || pending}
                    loading={pending}
                    className="w-full"
                >
                    {pending ? 'Submitting...' : 'Create Market'}
                </UIButton>
            </div>
        </UICard>
    );
};
