import { useReadContracts, useWriteContract, useAccount, useChainId } from "wagmi";
import { readContract } from "wagmi/actions";
import { useState } from "react";
import { formatEther, parseEther } from "viem";
import ModulsSalesManagerABI from "@/lib/abi/ModulsSalesManager.json";
import config from "../config";
import { config as wagmiConfig } from "../../wagmi";
import { toast } from "sonner";

export const useModulsSalesManager = (tokenAddress) => {
    const { address: connectedAddress } = useAccount();
    const chainId = useChainId();

    // Get contract address based on chain
    const getContractAddress = () => {
        if (chainId === 1328) { // Sei Testnet
            return config.contractAddresses.testnet.modulsSalesManager;
        } else if (chainId === 1329) { // Sei Mainnet
            return config.contractAddresses.mainnet.modulsSalesManager;
        }
        return config.contractAddresses.testnet.modulsSalesManager; // Default to testnet
    };

    const contractAddress = getContractAddress();

    // Contract configuration
    const contract = {
        address: contractAddress,
        abi: ModulsSalesManagerABI,
    };

    // Read contracts configuration for multiple simultaneous reads
    const contracts = [
        {
            ...contract,
            functionName: "marketConfigs",
            args: [tokenAddress],
        },
        {
            ...contract,
            functionName: "marketStats",
            args: [tokenAddress],
        },
        {
            ...contract,
            functionName: "tradeStats",
            args: [tokenAddress],
        },
        {
            ...contract,
            functionName: "getCurrentPrice",
            args: [tokenAddress],
        },
        {
            ...contract,
            functionName: "maxEthCap",
        },
        {
            ...contract,
            functionName: "initialPrice",
        },
        {
            ...contract,
            functionName: "priceSlope",
        },
        {
            ...contract,
            functionName: "cooldownTime",
        },
        {
            ...contract,
            functionName: "paused",
        },
    ];

    // Fetch all contract data
    const { data: contractData, isLoading, error } = useReadContracts({
        contracts,
        query: {
            enabled: !!tokenAddress,
            refetchInterval: 10000, // Refetch every 10 seconds
        },
    });


    // Track current operation type
    const [currentOperation, setCurrentOperation] = useState(null); // "buy" or "sell" or null

    // Write contract functions
    const { writeContract, isPending: isWritePending, isError: isWriteError, error: writeError } = useWriteContract({


        mutation: {

            onSuccess: (data) => {
                console.log("Write contract success:", data);

                if (currentOperation === "buy") {
                    toast.success('Buy transaction confirmed')
                } else if (currentOperation === "sell") {
                    toast.success('Sell transaction confirmed')
                }

                setCurrentOperation(null);
            },
            onError: (error) => {
                // Extract a plain error message from the error object (Metamask and others)
                let plainMessage = '';
                if (typeof error === 'string') {
                    plainMessage = error;
                } else if (error?.data?.message) {
                    plainMessage = error.data.message;
                } else if (error?.message) {
                    plainMessage = error.message;
                } else if (error?.error?.message) {
                    plainMessage = error.error.message;
                } else {
                    plainMessage = 'An unknown error occurred';
                }

                if (currentOperation === "buy") {
                    toast.error('Buy transaction failed: ' + plainMessage);
                } else if (currentOperation === "sell") {
                    toast.error('Sell transaction failed: ' + plainMessage);
                }

                setCurrentOperation(null);
            }
        }
    });


    // Parse contract data
    const parseContractData = () => {
        if (!contractData || contractData.length < contracts.length) {
            return null;
        }

        const [
            marketConfig,
            marketStats,
            tradeStats,
            currentPrice,
            maxEthCap,
            initialPrice,
            priceSlope,
            cooldownTime,
            isPaused,
        ] = contractData;



        return {
            // Market configuration
            marketConfig: marketConfig.result ? {
                token: marketConfig.result[0],
                agentWallet: marketConfig.result[1],
                devWallet: marketConfig.result[2],
                taxPercent: Number(marketConfig.result[3]),
                agentSplit: Number(marketConfig.result[4]),
                exists: marketConfig.result[5],
            } : null,

            // Market statistics
            marketStats: marketStats.result ? {
                ethCollected: formatEther(marketStats.result[0]),
                tokensSold: formatEther(marketStats.result[1]),
                lastBuyTime: Number(marketStats.result[2]),
                lastSellTime: Number(marketStats.result[3]),
            } : null,

            // Trade statistics
            tradeStats: tradeStats.result ? {
                totalVolumeETH: formatEther(tradeStats.result[0]),
                totalVolumeToken: Number(tradeStats.result[1]),
                totalBuys: Number(tradeStats.result[2]),
                totalSells: Number(tradeStats.result[3]),
            } : null,

            // Current price
            currentPrice: currentPrice.result ? formatEther(currentPrice.result) : "0",

            // Global parameters
            maxEthCap: maxEthCap.result ? formatEther(maxEthCap.result) : "0",
            initialPrice: initialPrice.result ? formatEther(initialPrice.result) : "0",
            priceSlope: priceSlope.result ? formatEther(priceSlope.result) : "0",
            cooldownTime: cooldownTime.result ? Number(cooldownTime.result) : 0,
            isPaused: isPaused.result || false,
        };
    };

    // Computed values
    const data = parseContractData();
    const isTokenRegistered = data?.marketConfig?.exists || false;
    const isTradingEnabled = isTokenRegistered && !data?.isPaused;



    // Write functions
    const registerToken = async (params) => {
        if (!writeContract) return;

        const { token, agentWallet, devWallet, taxPercent, agentSplit } = params;

        return writeContract({
            ...contract,
            functionName: "registerToken",
            args: [token, agentWallet, devWallet, taxPercent, agentSplit],
        });
    };

    const buyToken = async (params) => {
        if (!writeContract) return;

        console.log(params)

        const { tokenAmount, maxCost } = params;


        setCurrentOperation("buy");

        return writeContract({
            ...contract,
            functionName: "buyToken",
            args: [tokenAddress, tokenAmount, maxCost],
            value: maxCost,
        });
    };

    const sellToken = async (params) => {
        if (!writeContract) return;

        const { tokenAmount } = params;

        setCurrentOperation("sell");

        return writeContract({
            ...contract,
            functionName: "sellToken",
            args: [tokenAddress, tokenAmount],
        });
    };

    const getEtherCostForToken = async (tokenAmount) => {
        if (!tokenAddress || !tokenAmount) return null;

        try {
            const tokenAmountWei = parseEther(tokenAmount.toString());
            const result = await readContract(wagmiConfig, {

                ...contract,
                functionName: "getEtherCostForToken",
                args: [tokenAddress, tokenAmountWei],

            })

            return {
                cost: formatEther(result[0]),
                tax: formatEther(result[1]),
                totalCost: formatEther(result[2]),
            };
        } catch (error) {
            console.error("Error getting ether cost for token:", error);
            return null;
        }
    };

    const getEtherReturnForToken = async (tokenAmount) => {
        if (!tokenAddress || !tokenAmount) return null;

        try {
            const tokenAmountWei = parseEther(tokenAmount.toString());
            const result = await readContract(wagmiConfig, {
                ...contract,
                functionName: "getEtherReturnForToken",
                args: [tokenAddress, tokenAmountWei]
            });

            return formatEther(result);
        } catch (error) {
            console.error("Error getting ether return for token:", error);
            return null;
        }
    };

    const getTokenAmountForEther = async (ethAmount) => {
        if (!tokenAddress || !ethAmount) return null;

        try {
            const ethAmountWei = parseEther(ethAmount.toString());
            const result = await readContract(wagmiConfig, {
                ...contract,
                functionName: "getTokenAmountForEther",
                args: [tokenAddress, ethAmountWei]
            });

            return {
                tokenAmount: formatEther(result[0]),
                cost: formatEther(result[1]),
                tax: formatEther(result[2]),
                totalCost: formatEther(result[3]),
            };
        } catch (error) {
            console.error("Error getting token amount for ether:", error);
            return null;
        }
    };

    // Check user cooldowns
    const getUserCooldowns = async () => {
        if (!tokenAddress || !connectedAddress) return null;

        try {
            const [lastBuyTime, lastSellTime] = await Promise.all([
                readContract(wagmiConfig, {
                    ...contract,
                    functionName: "lastBuyTime",
                    args: [connectedAddress, tokenAddress]
                }),
                readContract(wagmiConfig, {
                    ...contract,
                    functionName: "lastSellTime",
                    args: [connectedAddress, tokenAddress]
                }),
            ]);

            return {
                lastBuyTime: Number(lastBuyTime),
                lastSellTime: Number(lastSellTime),
            };
        } catch (error) {
            console.error("Error getting user cooldowns:", error);
            return null;
        }
    };

    return {
        // Data
        data,
        isLoading,
        error,
        isTokenRegistered,
        isTradingEnabled,
        isWritePending,

        // Status flags for specific operations
        buyTokenStatus: {
            isPending: currentOperation === "buy" && isWritePending,
            isError: currentOperation === "buy" && isWriteError,
            error: currentOperation === "buy" ? writeError?.message : null
        },
        sellTokenStatus: {
            isPending: currentOperation === "sell" && isWritePending,
            isError: currentOperation === "sell" && isWriteError,
            error: currentOperation === "sell" ? writeError?.message : null
        },

        // Write functions
        registerToken,
        buyToken,
        sellToken,
        getEtherCostForToken,
        getEtherReturnForToken,
        getTokenAmountForEther,
        getUserCooldowns,

        // Contract info
        contractAddress: contractAddress,
    };
}; 