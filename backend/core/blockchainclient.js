const { createPublicClient, http } = require('viem');
const { sei, seiTestnet } = require('viem/chains');
const { chainMode, contractAddresses, rpcUrls } = require("../config")
const { watchContractEvent, getBlockNumber } = require('viem/actions');
const ModulsDeployerAbi = require('./abi/ModulsDeployer.json');


const seiMainnetClient = createPublicClient({
    chain: sei,
    transport: http(rpcUrls.mainnet.http[0]),
});

const seiTestnetClient = createPublicClient({
    chain: seiTestnet,
    transport: http(rpcUrls.testnet.http[0]),
});


function getClient() {
    return chainMode === 'mainnet' ? seiMainnetClient : seiTestnetClient;
}


function getModulsDeployerAddress() {
    return contractAddresses[chainMode].modulsDeployer;
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