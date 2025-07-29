const { createPublicClient, http } = require('viem');
const { mainnet } = require('viem/chains');
const { chainMode, contractAddresses } = require("../config")
const { watchContractEvent } = require('viem/actions');
const ModulsDeployerAbi = require('./abi/ModulsDeployer.json');

// Sei Mainnet settings
const seiMainnet = {
    ...mainnet,
    id: 1329,
    name: "Sei Mainnet",
    rpcUrls: {
        default: { http: ["https://evm-rpc.sei-apis.com"] },
    },
};

// Sei Testnet settings
const seiTestnet = {
    ...mainnet,
    id: 1328,
    name: "Sei Testnet",
    rpcUrls: {
        default: { http: ["https://evm-rpc-testnet.sei-apis.com"] },
    },
};

const seiMainnetClient = createPublicClient({
    chain: seiMainnet,
    transport: http(seiMainnet.rpcUrls.default.http[0]),
});

const seiTestnetClient = createPublicClient({
    chain: seiTestnet,
    transport: http(seiTestnet.rpcUrls.default.http[0]),
});


function getClient() {
    if (chainMode === 'mainnet') {
        return seiMainnetClient;
    } else {
        return seiTestnetClient;
    }
}


function getModulsDeployerAddress() {
    if (chainMode === 'mainnet') {
        return contractAddresses.mainnet.modulsDeployer;
    } else {
        return contractAddresses.testnet.modulsDeployer;
    }
}

function registerContractWatcher(contractAddress, eventName, onLogsCallback, onErrorCallback, onDisconnectCallback, onConnectCallback) {

    const publicClient = getClient();
    const unwatch = watchContractEvent(publicClient, {
        address: contractAddress,
        abi: ModulsDeployerAbi,
        // eventName: eventName,
        onLogs: onLogsCallback,
        args: undefined,
        batch: true,
        onError: (error) => {
            console.error('Error watching contract event:', error);
            if (onErrorCallback) {
                onErrorCallback(error);
            }
        },
        onDisconnect: () => {
            if (onDisconnectCallback) {
                onDisconnectCallback();
            }
        },
        onConnect: () => {
            console.log('Connected to contract event');
            if (onConnectCallback) {
                onConnectCallback();
            }
        },

        pollingInterval: 2_000,
    });

    return unwatch;

}

module.exports = {
    getClient,
    getModulsDeployerAddress,
    registerContractWatcher,
};