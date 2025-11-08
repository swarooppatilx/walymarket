import { useCurrentAccount } from '@mysten/dapp-kit';
import { ADMIN_ADDRESS } from '~~/walymarket/config/admin';

export const useGetOwnedAdminCap = () => {
    const currentAccount = useCurrentAccount();

    const isAdmin =
        !!currentAccount?.address &&
        currentAccount.address.toLowerCase() === ADMIN_ADDRESS.toLowerCase();

    return {
        isAdmin,
        address: currentAccount?.address,
    };
};
