import { Button, Card, Flex, Text } from '@radix-ui/themes';
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

    const { transact } = useTransact({
        onSuccess: (result: SuiSignAndExecuteTransactionOutput) => {
            notification.txSuccess(transactionUrl(explorerUrl, result.digest));
            onResolved?.();
        },
        onError: (err: Error) => {
            notification.txError(err);
        },
    });

    const handleResolve = (marketId: string, winningYes: boolean) => {
        if (!packageId) return;
        const tx = prepareResolveMarketTx(packageId, marketId, winningYes);
        transact(tx);
    };

    return (
        <Card>
            <Flex direction="column" gap="3">
                <Text weight="bold">Active Markets</Text>
                {markets.length === 0 && <Text color="gray">No active markets.</Text>}
                {markets.map((m) => (
                    <Flex key={m.id} align="center" justify="between" className="border-t pt-2 mt-2">
                        <div>
                            <Text>{m.question}</Text>
                        </div>
                        <Flex gap="2">
                            <Button variant="solid" onClick={() => handleResolve(m.id, true)}>Resolve YES</Button>
                            <Button variant="outline" onClick={() => handleResolve(m.id, false)}>Resolve NO</Button>
                        </Flex>
                    </Flex>
                ))}
            </Flex>
        </Card>
    );
};
