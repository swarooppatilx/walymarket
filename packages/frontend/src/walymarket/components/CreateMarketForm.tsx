import { useState } from 'react';
import { Button, Card, Flex, Text, TextField } from '@radix-ui/themes';
import useNetworkConfig from '~~/hooks/useNetworkConfig';
import { CONTRACT_PACKAGE_VARIABLE_NAME, EXPLORER_URL_VARIABLE_NAME } from '~~/config/network';
import useTransact from '@suiware/kit/useTransact';
import { SuiSignAndExecuteTransactionOutput } from '@mysten/wallet-standard';
import { notification } from '~~/helpers/notification';
import { transactionUrl } from '~~/helpers/network';
import { prepareCreateMarketTx } from '~~/walymarket/helpers/transactions';

export const CreateMarketForm = ({ onCreated }: { onCreated?: () => void }) => {
    const [question, setQuestion] = useState('');
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
            setQuestion('');
        },
        onError: (e: Error) => {
            setPending(false);
            notification.txError(e);
        },
    });

    const handleSubmit = () => {
        if (!question.trim() || !packageId) return;
        setPending(true);
        const tx = prepareCreateMarketTx(packageId, question.trim());
        transact(tx);
    };

    return (
        <Card>
            <Flex direction="column" gap="3">
                <Text weight="bold">Create New Market</Text>
                <TextField.Root placeholder="Enter a question..." value={question} onChange={(e) => setQuestion(e.target.value)} />
                <Button onClick={handleSubmit} disabled={!question.trim() || pending}>{pending ? 'Submitting...' : 'Create Market'}</Button>
            </Flex>
        </Card>
    );
};
