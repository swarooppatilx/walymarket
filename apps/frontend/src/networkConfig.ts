import { getFullnodeUrl } from "@mysten/sui/client";
import { createNetworkConfig } from "@mysten/dapp-kit";

// App is testnet-only for now
const { networkConfig, useNetworkVariable, useNetworkVariables } =
    createNetworkConfig({
        testnet: {
            url: getFullnodeUrl("testnet"),
        },
    });

export { useNetworkVariable, useNetworkVariables, networkConfig };
