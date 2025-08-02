const { createPublicClient, http } = require('viem');
const { mainnet } = require('viem/chains');
const { chainMode, contractAddresses, rpcUrls } = require("../config")
const { watchContractEvent, getBlockNumber } = require('viem/actions');
const ModulsDeployerAbi = require('./abi/ModulsDeployer.json');

// Sei Mainnet settings
const seiMainnet = {
    ...mainnet,
    id: 1329,
    name: "Sei Mainnet",
    rpcUrls: {
        default: {
            http: [rpcUrls.mainnet.http],
            webSocket: [rpcUrls.mainnet.webSocket]
        },
    },
};

// Sei Testnet settings
const seiTestnet = {
    ...mainnet,
    id: 1328,
    name: "Sei Testnet",
    rpcUrls: {
        default: {
            http: [rpcUrls.testnet.http],
            webSocket: [rpcUrls.testnet.webSocket]
        },
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

async function registerContractWatcher(contractAddress, onLogsCallback, onErrorCallback,) {

    const lastBlock = await getBlockNumber(getClient());

    const publicClient = getClient();
    const unwatch = watchContractEvent(publicClient, {
        address: contractAddress,
        abi: ModulsDeployerAbi,
        onLogs: onLogsCallback,
        batch: false,
        onError: (error) => {
            console.error('Error watching contract event:', error);
            if (onErrorCallback) {
                onErrorCallback(error);
            }
        },


        fromBlock: lastBlock - BigInt(100),

        pollingInterval: 1_000,
    });

    return unwatch;

}

module.exports = {
    getClient,
    getModulsDeployerAddress,
    registerContractWatcher,
};