import { ArrowUpDown, BadgeDollarSign } from "lucide-react";
import { Input } from "./ui/input";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import SeiIcon from "@/components/sei-icon";
import { useBalance, useReadContract, useChainId } from "wagmi";
import { readContract, writeContract } from "wagmi/actions";
import { parseEther, formatEther } from "viem";
import { useRef, useState } from "react";
import ModulsSalesManagerABI from "@/lib/abi/ModulsSalesManager.json";
import config from "../shared/config";
import { toast } from "sonner";
import { useModulsSalesManager } from "@/shared/hooks/useModulsSalesManager";
import { wagmiConfig } from "../wagmi";

const AgentTradeTab = ({
  token,
  agent,
  activeTradeTab,
  setActiveTradeTab,
  handleBuyToken,
  handleSellToken,
  buyTokenStatus,
  sellTokenStatus,
  connectedAddress,
}) => {
  const [currentAmount, setCurrentAmount] = useState(0);
  const [amountType, setAmountType] = useState("sei"); // "sei" or "tokens"
  const [convertedAmount, setConvertedAmount] = useState(0);
  const [isApprovalPending, setIsApprovalPending] = useState(false);
  const setFieldValueRef = useRef(null);
  const chainId = useChainId();
  const modulsSalesManagerAddress =
    chainId === 1328
      ? config.contractAddresses.testnet.modulsSalesManager
      : chainId === 1329
        ? config.contractAddresses.mainnet.modulsSalesManager
        : config.contractAddresses.testnet.modulsSalesManager;

  // Use the hook for additional functionality
  const {
    getTokenAmountForEther,
    getTokenAmountForEtherReturn,
    getEtherReturnForToken,
  } = useModulsSalesManager(token.contractAddress);

  // Initial form values
  const initialValues = {
    slippage: 5,
    amount: "",
  };

  const { data: balanceData } = useBalance({
    address: connectedAddress,
  });

  // Get token balance for sell tab using balanceOf
  const { data: tokenBalanceData } = useReadContract({
    address: token.contractAddress,
    abi: [
      {
        inputs: [{ name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "balanceOf",
    args: [connectedAddress],
    query: {
      enabled: !!connectedAddress && !!token.contractAddress,
      refetchInterval: 10000,
    },
  });

  const buyCostDataQueryEnabled =
    !!currentAmount &&
    activeTradeTab === "buy" &&
    !!token.contractAddress &&
    !!connectedAddress;

  const sellReturnDataQueryEnabled =
    !!currentAmount &&
    activeTradeTab == "sell" &&
    !!token.contractAddress &&
    !!connectedAddress &&
    amountType === "tokens";

  const sellTokenAmountForSEIDataQueryEnabled =
    !!currentAmount &&
    activeTradeTab == "sell" &&
    !!token.contractAddress &&
    !!connectedAddress &&
    amountType === "sei";

  const parsedCurrentAmount =
    currentAmount && currentAmount !== null && currentAmount !== undefined
      ? parseEther(currentAmount.toString())
      : BigInt(0);

  // Internal contract calls for real-time price calculation
  const { data: buyCostData } = useReadContract({
    address: modulsSalesManagerAddress,
    abi: ModulsSalesManagerABI,
    functionName: "getEtherCostForToken",
    args: [token.contractAddress, parsedCurrentAmount],
    query: {
      enabled: buyCostDataQueryEnabled,
      refetchInterval: 10000,
    },
  });

  const { data: tokenAmountForSEIData } = useReadContract({
    address: modulsSalesManagerAddress,
    abi: ModulsSalesManagerABI,
    functionName: "getTokenAmountForEther",
    args: [token.contractAddress, parsedCurrentAmount],
    query: {
      enabled: buyCostDataQueryEnabled && amountType === "sei",
      refetchInterval: 10000,
    },
  });

  const { data: sellReturnData } = useReadContract({
    address: modulsSalesManagerAddress,
    abi: ModulsSalesManagerABI,
    functionName: "getEtherReturnForToken",
    args: [token.contractAddress, parsedCurrentAmount],
    query: {
      enabled: sellReturnDataQueryEnabled,
      refetchInterval: 10000,
    },
  });

  const { data: sellTokenAmountForSEIData } = useReadContract({
    address: modulsSalesManagerAddress,
    abi: ModulsSalesManagerABI,
    functionName: "getTokenAmountForEtherReturn",
    args: [token.contractAddress, parsedCurrentAmount],
    query: {
      enabled: sellTokenAmountForSEIDataQueryEnabled,
      refetchInterval: 10000,
    },
  });

  // Calculate expected outputs from internal contract calls
  const calculatedBuyCost = buyCostData
    ? {
        cost: formatEther(buyCostData[0]),
        tax: formatEther(buyCostData[1]),
        totalCost: formatEther(buyCostData[2]),
      }
    : null;

  const calculatedBuyCostWithSEI = tokenAmountForSEIData
    ? {
        tokenAmount: formatEther(tokenAmountForSEIData[0]),
        cost: formatEther(tokenAmountForSEIData[1]),
        tax: formatEther(tokenAmountForSEIData[2]),
        totalCost: formatEther(tokenAmountForSEIData[3]),
      }
    : null;

  const calculatedSellReturn = sellReturnData
    ? formatEther(sellReturnData)
    : null;

  const calculatedSellTokenAmountForSEI = sellTokenAmountForSEIData
    ? formatEther(sellTokenAmountForSEIData)
    : null;

  // Helper functions for amount conversion
  const getTokenAmountForSEI = async (seiAmount) => {
    if (!seiAmount || seiAmount <= 0) return 0;

    try {
      const result = await getTokenAmountForEther(seiAmount);
      return result ? parseFloat(result.tokenAmount) : 0;
    } catch (error) {
      console.error("Error calculating token amount for SEI:", error);
      return 0;
    }
  };

  const getTokenAmountForSEIReturn = async (seiAmount) => {
    if (!seiAmount || seiAmount <= 0) return 0;

    try {
      const result = await getTokenAmountForEtherReturn(seiAmount);
      return result ? parseFloat(result) : 0;
    } catch (error) {
      console.error("Error calculating token amount for SEI return:", error);
      return 0;
    }
  };

  // Check if approval is needed and handle approval
  const checkAndHandleApproval = async (tokenAmount) => {
    if (
      !tokenAmount ||
      !connectedAddress ||
      !token.contractAddress ||
      !modulsSalesManagerAddress
    ) {
      console.error("Missing required parameters for allowance check");
      return false;
    }

    try {
      // Fetch current allowance on demand
      const currentAllowance = await readContract(wagmiConfig, {
        address: token.contractAddress,
        abi: [
          {
            inputs: [
              { name: "owner", type: "address" },
              { name: "spender", type: "address" },
            ],
            name: "allowance",
            outputs: [{ name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function",
          },
        ],
        functionName: "allowance",
        args: [connectedAddress, modulsSalesManagerAddress],
      });

      console.log("Current allowance:", currentAllowance);

      const tokenAmountWei = parseEther(tokenAmount.toString());
      const allowanceWei = currentAllowance;

      // Check if current allowance is sufficient
      if (allowanceWei >= tokenAmountWei) {
        console.log("Allowance sufficient, no approval needed");
        return true; // No approval needed
      }

      console.log("Allowance insufficient, initiating approval");

      // Approval needed - initiate approval transaction
      toast.info(
        "Approval needed. Please approve the transaction in your wallet.",
      );

      // Set approval pending state
      setIsApprovalPending(true);

      try {
        const hash = await writeContract(wagmiConfig, {
          address: token.contractAddress,
          abi: [
            {
              inputs: [
                { name: "spender", type: "address" },
                { name: "amount", type: "uint256" },
              ],
              name: "approve",
              outputs: [{ name: "", type: "bool" }],
              stateMutability: "nonpayable",
              type: "function",
            },
          ],
          functionName: "approve",
          args: [modulsSalesManagerAddress, tokenAmountWei],
        });

        console.log("Approval transaction hash:", hash);
        toast.success("Approval transaction submitted successfully!");
        setIsApprovalPending(false);
        return true;
      } catch (approvalError) {
        console.error("Approval transaction failed:", approvalError);
        toast.error("Approval transaction failed");
        setIsApprovalPending(false);
        return false;
      }
    } catch (error) {
      console.error("Approval error:", error);
      toast.error("Approval transaction failed");
      return false;
    }
  };

  // Debug logging
  // console.log("Debug - buyCostDataQueryEnabled:", buyCostDataQueryEnabled);
  // console.log("Debug - sellReturnDataQueryEnabled:", sellReturnDataQueryEnabled);
  // console.log("Debug - currentAmount:", currentAmount);
  // console.log("Debug - amountType:", amountType);
  // console.log("Debug - activeTradeTab:", activeTradeTab);
  // console.log("Debug - buyCostData:", buyCostData);
  // console.log("Debug - tokenAmountForSEIData:", tokenAmountForSEIData);
  // console.log("Debug - calculatedBuyCost:", calculatedBuyCost);
  // console.log("Debug - calculatedBuyCostWithSEI:", calculatedBuyCostWithSEI);
  // console.log("Debug - sellReturnData:", sellReturnData);
  // console.log("Debug - calculatedSellReturn:", calculatedSellReturn);
  // console.log("Debug - modulsSalesManagerAddress:", modulsSalesManagerAddress);
  // console.log("Debug - isApprovalPending:", isApprovalPending);

  // Handle form submission
  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    if (activeTradeTab === "buy") {
      if (amountType === "tokens" && calculatedBuyCost) {
        const totalCostWei = parseEther(calculatedBuyCost.totalCost);

        const slippagePercentage = BigInt(values.slippage) / BigInt(100);
        const maxCost = totalCostWei + totalCostWei * slippagePercentage;

        handleBuyToken(parseEther(currentAmount.toString()), maxCost);
        resetForm({ values: { ...initialValues, amount: "" } });
      } else if (amountType === "sei" && calculatedBuyCostWithSEI) {
        const totalCostWei = parseEther(calculatedBuyCostWithSEI.totalCost);

        const slippagePercentage = BigInt(values.slippage) / BigInt(100);
        const maxCost = totalCostWei + totalCostWei * slippagePercentage;
        handleBuyToken(
          parseEther(calculatedBuyCostWithSEI.tokenAmount),
          maxCost,
        );
        resetForm({ values: { ...initialValues, amount: "" } });
      } else {
        toast.error("Please enter amount and ensure wallet is connected");
        return;
      }
    } else {
      if (amountType === "tokens" && calculatedSellReturn) {
        // Check and handle approval before selling
        const approvalSuccess = await checkAndHandleApproval(currentAmount);
        if (approvalSuccess) {
          // Calculate minimum return based on slippage
          const slippagePercentage = BigInt(values.slippage) / BigInt(100);
          const minReturn =
            parseEther(calculatedSellReturn) -
            parseEther(calculatedSellReturn) * slippagePercentage;

          handleSellToken(parseEther(currentAmount.toString()), minReturn);
          resetForm({ values: { ...initialValues, amount: "" } });
        } else {
          toast.error("Approval failed. Please try again.");
          return;
        }
      } else if (amountType === "sei" && calculatedSellTokenAmountForSEI) {
        // Check and handle approval before selling
        const approvalSuccess = await checkAndHandleApproval(
          calculatedSellTokenAmountForSEI,
        );
        if (approvalSuccess) {
          // Calculate minimum return based on slippage
          const slippagePercentage = BigInt(values.slippage) / BigInt(100);
          const minReturn =
            parseEther(currentAmount) -
            parseEther(currentAmount) * slippagePercentage;

          handleSellToken(
            parseEther(calculatedSellTokenAmountForSEI),
            minReturn,
          );
          resetForm({ values: { ...initialValues, amount: "" } });
        } else {
          toast.error("Approval failed. Please try again.");
          return;
        }
      } else {
        toast.error("Please enter amount and ensure wallet is connected");
        return;
      }
    }
    // Reset form after submission

    setSubmitting(false);
  };

  // Handle amount change
  const handleAmountChange = async (value, setFieldValue) => {
    // Ensure value is not null or undefined
    if (value === null || value === undefined) {
      value = "";
    }

    // Convert to string for consistent handling
    const stringValue = value.toString();

    // test for number for value
    if (isNaN(stringValue) && stringValue !== "") return;

    // Store setFieldValue in ref for use in other functions
    if (setFieldValue) {
      setFieldValueRef.current = setFieldValue;
    }

    let adjustedValue = stringValue;

    // If amountType is "tokens", auto adjust to always be a positive integer
    if (amountType === "tokens") {
      // Remove non-digit characters, parse as integer, and ensure at least 1 if not empty
      const intValue = Math.max(1, parseInt(stringValue, 10) || 0);
      adjustedValue = stringValue === "" ? "" : intValue.toString();
    }

    if (setFieldValueRef.current) {
      setFieldValueRef.current("amount", adjustedValue);
    }

    // Convert amount based on type and update converted amount
    if (activeTradeTab === "buy") {
      if (amountType === "sei") {
        // User entered SEI amount, convert to token amount for contract call
        setCurrentAmount(adjustedValue);
        // Calculate equivalent token amount
        if (adjustedValue && adjustedValue > 0) {
          const tokenAmount = await getTokenAmountForSEI(adjustedValue);
          setConvertedAmount(tokenAmount);
        } else {
          setConvertedAmount(0);
        }
      } else {
        // User entered token amount, use directly
        setCurrentAmount(adjustedValue);
        setConvertedAmount(0); // No conversion needed
      }
    } else {
      // For sell tab
      if (amountType === "sei") {
        // User entered SEI amount, convert to token amount for contract call
        setCurrentAmount(adjustedValue);
        // Calculate equivalent token amount needed to sell
        if (adjustedValue && adjustedValue > 0) {
          const tokenAmount = await getTokenAmountForSEIReturn(adjustedValue);
          setConvertedAmount(tokenAmount);
        } else {
          setConvertedAmount(0);
        }
      } else {
        // User entered token amount, use directly
        setCurrentAmount(adjustedValue);
        setConvertedAmount(0); // No conversion needed
      }
    }

    // Contract calls will automatically recalculate when values change
  };

  // Handle set active trade tab
  const handleSetActiveTradeTab = (tab) => {
    setActiveTradeTab(tab);
    // Clear the amount when switching tabs

    if (setFieldValueRef.current) {
      setFieldValueRef.current("amount", "");
      setCurrentAmount(0);

      setConvertedAmount(0);
    }

    // Set default amount type based on tab
    if (tab === "sell") {
      setAmountType("tokens"); // Default to tokens for sell, but user can change
    } else if (tab === "buy") {
      setAmountType("sei"); // Default to SEI for buy, but user can change
    }
  };

  // Handle amountType change
  const handleAmountTypeChange = (value, setFieldValue) => {
    setAmountType(value);
    handleAmountChange("", setFieldValue);
  };

  // Handle MAX button click
  const handleMaxClick = async (setFieldValue) => {
    if (activeTradeTab === "buy") {
      if (amountType === "sei") {
        // For buy with SEI amount, use wallet balance
        const maxAmount = balanceData ? formatEther(balanceData.value) : "0";
        handleAmountChange(maxAmount, setFieldValue);
        // Calculate equivalent token amount
        if (maxAmount && maxAmount > 0) {
          const tokenAmount = await getTokenAmountForSEI(maxAmount);
          setConvertedAmount(tokenAmount || 0);
        }
      } else {
        // For buy with token amount, calculate max tokens from token balance data
        const maxSEI = balanceData ? formatEther(balanceData.value) : "0";
        const maxTokens = await getTokenAmountForSEI(maxSEI);
        if (maxTokens) {
          handleAmountChange(maxTokens, setFieldValue);
          setConvertedAmount(maxTokens);
        } else {
          handleAmountChange("0", setFieldValue);
          setConvertedAmount(0);
        }
      }
    } else {
      // For sell tab
      if (amountType === "sei") {
        // For sell with SEI amount, calculate max SEI from token balance
        const maxTokens = tokenBalanceData
          ? formatEther(tokenBalanceData)
          : "0";
        if (maxTokens && maxTokens > 0) {
          // Calculate how much SEI we can get from all tokens
          const maxSEI = await getEtherReturnForToken(maxTokens);
          if (maxSEI) {
            handleAmountChange(maxSEI, setFieldValue);
            setConvertedAmount(parseFloat(maxTokens));
          } else {
            // Fallback to 0 if calculation fails
            handleAmountChange("0", setFieldValue);
            setConvertedAmount(0);
          }
        }
      } else {
        // For sell with token amount, use token balance
        const maxAmount = tokenBalanceData
          ? formatEther(tokenBalanceData)
          : "0";
        handleAmountChange(maxAmount, setFieldValue);
        setConvertedAmount(0);
      }
    }
  };

  // Validation schema - moved inside component to access balanceData and activeTradeTab
  const TradeFormSchema = Yup.object().shape({
    slippage: Yup.number()
      .min(0.1, "Slippage must be at least 0.1%")
      .max(50, "Slippage cannot exceed 50%")
      .required("Slippage is required")
      .typeError("Slippage must be a number"),
    amount: Yup.mixed()
      .test("required", "Amount is required", function (value) {
        return value !== undefined && value !== null && value !== "";
      })
      .typeError("Amount must be a number")
      .test("type", "Amount must be a number", function (value) {
        return !isNaN(value);
      })
      .test("min", function (value) {
        if (!value) return true;
        if (activeTradeTab === "buy" && amountType === "tokens") {
          if (parseFloat(value) < 1) {
            return this.createError({
              message: "You must buy at least 1 token.",
            });
          }
        } else {
          if (parseFloat(value) < 0.000000000000000001) {
            return this.createError({
              message: "Amount must be at least 0.000000000000000001.",
            });
          }
        }
        return true;
      })
      .test("integer", function (value) {
        if (activeTradeTab === "buy" && amountType === "tokens") {
          if (!Number.isInteger(Number(value)) || Number(value) <= 0) {
            return this.createError({
              message:
                "For buying tokens, you must enter a whole number greater than 0.",
            });
          }
        }
        return true;
      })
      .test("min-msg", function (value) {
        if (!value) return true;
        if (activeTradeTab === "buy" && amountType === "tokens") {
          if (parseFloat(value) < 1) {
            return this.createError({
              message: "You must buy at least 1 token.",
            });
          }
        } else {
          if (parseFloat(value) < 0.000000000000000001) {
            return this.createError({
              message: "Amount must be at least 0.000000000000000001.",
            });
          }
        }
        return true;
      })
      .test("insufficient-balance", function (value) {
        if (!value) return true;

        if (activeTradeTab === "buy") {
          if (amountType === "sei") {
            if (!balanceData?.value) return true;
            if (
              parseFloat(value) > parseFloat(formatEther(balanceData.value))
            ) {
              return this.createError({
                message: "You do not have enough SEI to complete this trade.",
              });
            }
          } else if (amountType === "tokens") {
            if (!balanceData?.value) return true;

            if (!calculatedBuyCost) return true;
            if (
              parseFloat(calculatedBuyCost.totalCost) >
              parseFloat(formatEther(balanceData.value))
            ) {
              return this.createError({
                message: "You do not have enough SEI to complete this trade.",
              });
            }
          }
        } else {
          if (amountType === "sei") {
            if (!balanceData?.value) return true;
            if (
              parseFloat(value) > parseFloat(formatEther(balanceData.value))
            ) {
              return this.createError({
                message: "You do not have enough SEI to complete this trade.",
              });
            }
          } else if (amountType === "tokens") {
            if (!tokenBalanceData) return true;
            if (parseFloat(value) > parseFloat(formatEther(tokenBalanceData))) {
              return this.createError({
                message:
                  "You do not have enough tokens to complete this trade.",
              });
            }
          }
        }
        return true;
      }),
  });

  return (
    <div className="w-full">
      {!token.isAddressValid ? (
        <div className="pt-4 text-center">
          <div
            className={`p-4 border rounded-lg ${
              token.status === "PENDING"
                ? "bg-yellow-500/10 border-yellow-500/20"
                : token.status === "INACTIVE"
                  ? "bg-red-500/10 border-red-500/20"
                  : "bg-gray-500/10 border-gray-500/20"
            }`}
          >
            <div className="flex items-center gap-2 mb-2 justify-center">
              <BadgeDollarSign
                className={`size-4 ${
                  token.status === "PENDING"
                    ? "text-yellow-600 dark:text-yellow-400"
                    : token.status === "INACTIVE"
                      ? "text-red-600 dark:text-red-400"
                      : "text-gray-600 dark:text-gray-400"
                }`}
              />
              <h3
                className={`font-medium ${
                  token.status === "PENDING"
                    ? "text-yellow-600 dark:text-yellow-400"
                    : token.status === "INACTIVE"
                      ? "text-red-600 dark:text-red-400"
                      : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {token.status === "PENDING"
                  ? "Token Deployment in Progress"
                  : token.status === "INACTIVE"
                    ? "Agent Deactivated"
                    : "No Token Contract"}
              </h3>
            </div>
            <p
              className={`text-sm ${
                token.status === "PENDING"
                  ? "text-yellow-600/80 dark:text-yellow-400/80"
                  : token.status === "INACTIVE"
                    ? "text-red-600/80 dark:text-red-400/80"
                    : "text-gray-600/80 dark:text-gray-400/80"
              }`}
            >
              {token.status === "PENDING"
                ? "Your agent token is being deployed to the blockchain. This usually takes a few minutes. Trading will be available once the deployment is confirmed."
                : token.status === "INACTIVE"
                  ? "This agent has been deactivated by administrators. The token contract exists but trading has been disabled. Contact support if you believe this is an error."
                  : "This agent doesn't have a valid token contract address. Trading functionality is not available."}
            </p>
          </div>
        </div>
      ) : !token.isRegistered ? (
        <div className="pt-4 text-center">
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2 justify-center">
              <BadgeDollarSign className="size-4 text-yellow-600 dark:text-yellow-400" />
              <h3 className="font-medium text-yellow-600 dark:text-yellow-400">
                Token Not Registered
              </h3>
            </div>
            <p className="text-sm text-yellow-600/80 dark:text-yellow-400/80">
              This token is not yet registered for trading on the sales manager
              contract.
            </p>
          </div>
        </div>
      ) : !token.isTradingEnabled ? (
        <div className="pt-4 text-center">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2 justify-center">
              <BadgeDollarSign className="size-4 text-red-600 dark:text-red-400" />
              <h3 className="font-medium text-red-600 dark:text-red-400">
                Trading Paused
              </h3>
            </div>
            <p className="text-sm text-red-600/80 dark:text-red-400/80">
              Trading for this token is currently paused by the contract owner.
            </p>
          </div>
        </div>
      ) : (
        <div className="pt-4">
          <div className="w-full flex gap-2 bg-primary-foreground">
            <button
              data-active={activeTradeTab === "buy"}
              className="py-2 flex-1 border-2 data-[active=true]:border-green-600 data-[active=true]:text-green-600 rounded-lg font-semibold cursor-pointer"
              onClick={() => handleSetActiveTradeTab("buy")}
            >
              Buy
            </button>
            <button
              data-active={activeTradeTab === "sell"}
              className="py-2 flex-1 border-2 data-[active=true]:border-red-600 data-[active=true]:text-red-600 rounded-lg font-semibold cursor-pointer"
              onClick={() => handleSetActiveTradeTab("sell")}
            >
              Sell
            </button>
          </div>

          <Formik
            initialValues={initialValues}
            validationSchema={TradeFormSchema}
            onSubmit={handleSubmit}
            enableReinitialize={false}
          >
            {({ values, setFieldValue, isValid, dirty }) => (
              <Form className="mt-3 px-2 py-4 bg-neutral-850 border rounded-lg flex flex-col gap-4">
                <div className="w-full flex flex-col gap-1">
                  <label
                    htmlFor="slippage"
                    className="ml-1 text-sm font-semibold"
                  >
                    Slippage (%)
                  </label>
                  <Field
                    as={Input}
                    type="number"
                    id="slippage"
                    name="slippage"
                    className="py-2"
                    min="0.1"
                    max="50"
                    step="0.1"
                  />
                  <ErrorMessage
                    name="slippage"
                    component="div"
                    className="text-red-500 text-xs mt-1"
                  />
                </div>

                {/* Subtle Tax Information */}
                {activeTradeTab === "buy" && token.tradeFees > 0 && (
                  <div className="text-xs text-neutral-500 text-center">
                    Includes {token.tradeFees}% tax
                  </div>
                )}

                <div className="w-full flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <label
                      htmlFor="amount"
                      className="ml-1 text-sm font-semibold"
                    >
                      Amount
                    </label>
                    <span className="text-xs text-neutral-400">
                      Balance:{" "}
                      {activeTradeTab === "buy"
                        ? `${balanceData ? formatEther(balanceData.value) : "0"} SEI`
                        : amountType === "sei"
                          ? `${balanceData ? formatEther(balanceData.value) : "0"} SEI`
                          : `${tokenBalanceData ? formatEther(tokenBalanceData) : "0"} ${agent?.tokenSymbol?.toUpperCase() || token.name.toUpperCase()}`}
                    </span>
                  </div>

                  {/* Amount Type Toggle */}
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleAmountTypeChange("sei", setFieldValue)
                      }
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        amountType === "sei"
                          ? "bg-blue-600 text-white"
                          : "bg-neutral-700 text-neutral-400 hover:text-neutral-300"
                      }`}
                    >
                      SEI
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleAmountTypeChange("tokens", setFieldValue)
                      }
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        amountType === "tokens"
                          ? "bg-blue-600 text-white"
                          : "bg-neutral-700 text-neutral-400 hover:text-neutral-300"
                      }`}
                    >
                      {agent?.tokenSymbol?.toUpperCase() ||
                        token.name.toUpperCase()}
                    </button>
                  </div>
                  <div className="relative">
                    <Field
                      as={Input}
                      type="text"
                      id="amount"
                      name="amount"
                      className="py-2 pr-28"
                      placeholder="0"
                      min="0"
                      step="0.000001"
                      onChange={(e) =>
                        handleAmountChange(e.target.value, setFieldValue)
                      }
                    />
                    <div className="absolute top-[50%] translate-y-[-50%] right-4 flex items-center gap-2 text-neutral-400">
                      <div className="flex items-center gap-2">
                        {amountType === "sei" ? (
                          <SeiIcon className="size-4" />
                        ) : (
                          <span className="text-xs uppercase">
                            {agent?.tokenSymbol?.toUpperCase() ||
                              token.name.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="h-4 w-0.5 bg-neutral-400" />
                      <button
                        type="button"
                        className="text-xs text-neutral-400 hover:text-neutral-300 transition-colors"
                        onClick={() => handleMaxClick(setFieldValue)}
                      >
                        MAX
                      </button>
                    </div>
                  </div>
                  <ErrorMessage
                    name="amount"
                    component="div"
                    className="text-red-500 text-xs mt-1"
                  />

                  {/* Show converted amount for SEI input */}
                  {amountType === "sei" && convertedAmount > 0 && (
                    <div className="text-xs text-neutral-400 text-center">
                      ≈ {convertedAmount.toFixed(6)}{" "}
                      {agent?.tokenSymbol?.toUpperCase() ||
                        token.name.toUpperCase()}
                    </div>
                  )}
                </div>

                {activeTradeTab === "buy" &&
                  calculatedBuyCost &&
                  amountType === "tokens" && (
                    <div className="p-3 bg-green-500/5 border border-green-500/10 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span>Cost:</span>
                        <span>
                          {parseFloat(calculatedBuyCost.cost).toFixed(12)} SEI
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Tax:</span>
                        <span>
                          {parseFloat(calculatedBuyCost.tax).toFixed(12)} SEI
                        </span>
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span>Total:</span>
                        <span>
                          {parseFloat(calculatedBuyCost.totalCost).toFixed(12)}{" "}
                          SEI
                        </span>
                      </div>
                    </div>
                  )}

                {activeTradeTab === "buy" &&
                  calculatedBuyCostWithSEI &&
                  amountType === "sei" && (
                    <div className="p-3 bg-green-500/5 border border-green-500/10 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span>Cost:</span>
                        <span>
                          {parseFloat(calculatedBuyCostWithSEI.cost).toFixed(
                            12,
                          )}{" "}
                          SEI
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Tax:</span>
                        <span>
                          {parseFloat(calculatedBuyCostWithSEI.tax).toFixed(12)}{" "}
                          SEI
                        </span>
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span>Total:</span>
                        <span>
                          {parseFloat(
                            calculatedBuyCostWithSEI.totalCost,
                          ).toFixed(12)}{" "}
                          SEI
                        </span>
                      </div>
                    </div>
                  )}

                {activeTradeTab === "sell" && calculatedSellReturn && (
                  <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
                    <div className="flex justify-between text-sm font-medium">
                      <span>You will receive:</span>
                      <span>
                        {parseFloat(calculatedSellReturn).toFixed(12)} SEI
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={
                      (activeTradeTab === "buy"
                        ? buyTokenStatus.isPending
                        : sellTokenStatus.isPending) ||
                      isApprovalPending ||
                      !connectedAddress ||
                      !isValid ||
                      !dirty ||
                      !values.amount
                    }
                    className={`py-2 w-full capitalize rounded-lg font-semibold cursor-pointer flex items-center justify-center gap-2 ${
                      activeTradeTab === "buy" ? "bg-green-600" : "bg-red-600"
                    } ${
                      (activeTradeTab === "buy"
                        ? buyTokenStatus.isPending
                        : sellTokenStatus.isPending) ||
                      isApprovalPending ||
                      !connectedAddress ||
                      !isValid ||
                      !dirty ||
                      !values.amount
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {((activeTradeTab === "buy"
                      ? buyTokenStatus.isPending
                      : sellTokenStatus.isPending) ||
                      isApprovalPending) && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                    {(
                      activeTradeTab === "buy"
                        ? buyTokenStatus.isPending
                        : sellTokenStatus.isPending
                    )
                      ? "Processing..."
                      : isApprovalPending
                        ? "Approving..."
                        : activeTradeTab}
                  </button>
                  <div className="mt-1.25 text-neutral-400 text-xs flex items-center justify-center">
                    <p>
                      {activeTradeTab === "buy" ? (
                        <>
                          {amountType === "sei" ? (
                            <>
                              You will receive{" "}
                              <span>
                                {convertedAmount > 0
                                  ? convertedAmount.toFixed(6)
                                  : "0"}
                              </span>{" "}
                              {agent?.tokenSymbol?.toUpperCase() ||
                                token.name.toUpperCase()}
                            </>
                          ) : (
                            <>
                              You will pay{" "}
                              <span>
                                {values.amount && calculatedBuyCost
                                  ? parseFloat(
                                      calculatedBuyCost.totalCost,
                                    ).toFixed(12)
                                  : "0"}
                              </span>{" "}
                              SEI
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          You will receive{" "}
                          <span>{calculatedSellReturn || "0"}</span> SEI
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      )}

      {/* transactions */}
      <div className="mt-5 w-full">
        <div className="ml-2 flex items-center gap-2">
          <ArrowUpDown className="size-4" />
          <h2 className="text-lg font-semibold">Trade Statistics</h2>
        </div>
        <div className="mt-3 px-3 py-2 bg-primary-foreground border rounded-lg">
          {token.tradeStats ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {token.tradeStats.totalBuys}
                </div>
                <div className="text-sm text-muted-foreground">Total Buys</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {token.tradeStats.totalSells}
                </div>
                <div className="text-sm text-muted-foreground">Total Sells</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">
                  {parseFloat(token.tradeStats.totalVolumeETH).toFixed(12)} SEI
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Volume
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">
                  {parseFloat(
                    token.tradeStats.totalVolumeToken,
                  ).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  Tokens Traded
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No trading activity yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentTradeTab;
