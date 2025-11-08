import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import useNetworkConfig from '~~/hooks/useNetworkConfig';
import { CONTRACT_PACKAGE_VARIABLE_NAME } from '~~/config/network';
import { fullStructName } from '~~/helpers/network';

export const useGetAdminCapId = () => {
    const current = useCurrentAccount();
    const { useNetworkVariable } = useNetworkConfig();
    const packageId = useNetworkVariable(CONTRACT_PACKAGE_VARIABLE_NAME);

    const { data, isLoading, isError, refetch } = useSuiClientQuery(
        'getOwnedObjects',
        {
            owner: current?.address!,
            filter: {
                StructType: fullStructName(packageId, 'AdminCap'),
            },
            options: { showContent: true },
        },
        { enabled: !!current?.address && !!packageId }
    );

    const adminCapId: string | undefined = data?.data?.[0]?.data?.objectId;

    return { adminCapId, isLoading, isError, refetch };
};
