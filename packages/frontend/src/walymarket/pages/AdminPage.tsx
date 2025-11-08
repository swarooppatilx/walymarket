import { Container, Flex, Heading, Text } from '@radix-ui/themes';
import Layout from '~~/components/layout/Layout';
import { useGetOwnedAdminCap } from '~~/walymarket/hooks/useGetOwnedAdminCap';
import { useGetMarkets } from '~~/walymarket/hooks/useGetMarkets';
import { CreateMarketForm } from '~~/walymarket/components/CreateMarketForm';
import { MarketManager } from '~~/walymarket/components/MarketManager';
import { useCurrentAccount } from '@mysten/dapp-kit';

const AdminPage = () => {
    const { isAdmin } = useGetOwnedAdminCap();
    const { markets, refetch } = useGetMarkets();
    const current = useCurrentAccount();

    return (
        <Layout>
            <Container py="6" size="3">
                <Flex direction="column" gap="6">
                    <Heading size="8">Admin Panel</Heading>
                    {!current && <Text color="red">Connect a wallet to continue.</Text>}
                    {current && !isAdmin && (
                        <Text color="red">Access denied. This page is restricted to the admin address.</Text>
                    )}
                    {current && isAdmin && (
                        <Flex direction="column" gap="5">
                            <CreateMarketForm onCreated={refetch} />
                            <MarketManager markets={markets} onResolved={refetch} />
                        </Flex>
                    )}
                </Flex>
            </Container>
        </Layout>
    );
};

export default AdminPage;
