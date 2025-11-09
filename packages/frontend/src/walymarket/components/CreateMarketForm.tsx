import { useMemo, useState } from 'react';
import { Button, Card, Flex, Text, TextField, Separator } from '@radix-ui/themes';
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
    // Lower default b to show price movement sooner (was 1e9 which kept price near 50/50 for small trades)
    const [bInput, setBInput] = useState('100000');
    const [expiryInput, setExpiryInput] = useState<string>(() => {
        // default expiry: +24h
        const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
        return iso.slice(0, 16); // yyyy-MM-ddTHH:mm for input type datetime-local
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
        <Card className="market-card-sds" style={{ padding: '22px' }}>
            <Flex direction="column" gap="3">
                <Text weight="bold" style={{ fontSize: 16 }}>Create New Market</Text>
                <Text size="1" color="gray" style={{ maxWidth: 640 }}>Define the title, description, image, liquidity b, and expiry. Higher b makes prices move slower.</Text>
                <TextField.Root className="input-sds" placeholder="Title (e.g., Will BTC hit $100k by 2026?)" value={title} onChange={(e) => setTitle(e.target.value)} />
                <div>
                    <Text size="1" color="gray" style={{ display: 'block', marginBottom: 4 }}>Description</Text>
                    <textarea
                        className="input-sds"
                        rows={3}
                        placeholder="Optional details, context, rules..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        style={{ width: '100%', resize: 'vertical' }}
                    />
                </div>
                <Flex direction="column" gap="1">
                    <Text size="1" color="gray">Image URL</Text>
                    <TextField.Root className="input-sds" placeholder="https://…" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                    {imageUrl && (
                        <img src={imageUrl} alt="Market" style={{ maxWidth: 240, marginTop: 8, borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)' }} onError={() => setImageUrl('')} />
                    )}
                </Flex>
                <Flex gap="3" wrap="wrap">
                    <Flex direction="column" gap="1" style={{ minWidth: 220 }}>
                        <Text size="1" color="gray">Liquidity b (share scale)</Text>
                        <TextField.Root className="input-sds" value={bInput} onChange={(e) => setBInput(e.target.value)} />
                        <Text size="1" color="gray">Lower b = more volatile. Recommended: 10k–1M.</Text>
                    </Flex>
                    <Flex direction="column" gap="1" style={{ minWidth: 240 }}>
                        <Text size="1" color="gray">Expiry</Text>
                        <input
                            type="datetime-local"
                            value={expiryInput}
                            onChange={(e) => setExpiryInput(e.target.value)}
                            className="input-sds"
                        />
                    </Flex>
                </Flex>
                <Separator my="2" size="4" />
                <Button className="btn-sds-ghost" onClick={handleSubmit} disabled={!title.trim() || pending}>{pending ? 'Submitting...' : 'Create Market'}</Button>
            </Flex>
        </Card>
    );
};
