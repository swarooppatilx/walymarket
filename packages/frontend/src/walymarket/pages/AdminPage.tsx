import { Container, Flex, Heading, Text, Card, Separator, Badge, Link as RadixLink } from '@radix-ui/themes';
import Layout from '~~/components/layout/Layout';
import { useGetOwnedAdminCap } from '~~/walymarket/hooks/useGetOwnedAdminCap';
import { useGetMarkets } from '~~/walymarket/hooks/useGetMarkets';
import { CreateMarketForm } from '~~/walymarket/components/CreateMarketForm';
import { MarketManager } from '~~/walymarket/components/MarketManager';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { ADMIN_ADDRESS } from '~~/walymarket/config/admin';
import { Link } from 'react-router-dom';

const AdminPage = () => {
    const { isAdmin } = useGetOwnedAdminCap();
    const { markets, resolvedMarkets, refetch } = useGetMarkets();
    const current = useCurrentAccount();

    return (
        <Layout>
            <Container py="5" size="3">
                <Flex direction="column" gap="4">
                    <Heading size="5">Admin Panel</Heading>
                    <Card className="market-card-sds" style={{ padding: 16 }}>
                        <Flex direction="column" gap="2">
                            <Text weight="bold">Admin Status</Text>
                            {!current && <Text color="red">Connect a wallet to continue.</Text>}
                            {current && (
                                <>
                                    <Text size="2">Connected: <Badge color={isAdmin ? 'green' : 'red'}>{current.address}</Badge></Text>
                                    <Text size="1" color="gray">Allowed admin: {ADMIN_ADDRESS}</Text>
                                </>
                            )}
                        </Flex>
                    </Card>
                    {!current && <></>}
                    {current && !isAdmin && (
                        <Text color="red">Access denied. This page is restricted to the admin address.</Text>
                    )}
                    {current && isAdmin && (
                        <Flex direction="column" gap="5">
                            <CreateMarketForm onCreated={refetch} />
                            <MarketManager markets={markets} onResolved={refetch} />
                            <Card className="market-card-sds" style={{ padding: 16 }}>
                                <Flex direction="column" gap="3">
                                    <Text weight="bold">Recently Resolved</Text>
                                    <Separator my="1" size="1" />
                                    {resolvedMarkets.length === 0 && <Text color="gray">No resolved markets yet.</Text>}
                                    {resolvedMarkets.map((m) => (
                                        <>
                                            <Separator size="1" />
                                            <Flex key={m.id} justify="between" align="center" className="py-2" wrap="wrap" gap="2">
                                                <Flex direction="column" gap="1" style={{ minWidth: '260px', flex: '1 1 320px' }}>
                                                    <Text>{m.title || m.question}</Text>
                                                    <Text size="1" color="gray">Outcome: {m.resolution === null ? '-' : m.resolution ? 'YES' : 'NO'}</Text>
                                                </Flex>
                                                <RadixLink asChild>
                                                    <Link to={`/market/${m.id}`}>Open</Link>
                                                </RadixLink>
                                            </Flex>
                                        </>
                                    ))}
                                </Flex>
                            </Card>
                        </Flex>
                    )}
                </Flex>
            </Container>
        </Layout>
    );
};

export default AdminPage;
