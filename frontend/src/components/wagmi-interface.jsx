import { useState } from "react";
import {
  useAccount,
  useConnect,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { parseEther, formatEther } from "viem";
import { ERC20_ABI, TOKEN_CONTRACT_ADDRESS } from "../shared/constants";

export function WagmiInterface() {
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");

  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();

  // For debugging
  console.log("Connection status:", { address, isConnected });

  // Read from contract
  const { data: name } = useReadContract({
    address: TOKEN_CONTRACT_ADDRESS,
    abi: ERC20_ABI,
    functionName: "name",
  });

  const { data: symbol } = useReadContract({
    address: TOKEN_CONTRACT_ADDRESS,
    abi: ERC20_ABI,
    functionName: "symbol",
  });

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: TOKEN_CONTRACT_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Write to contract
  const {
    writeContract,
    data: hash,
    isPending: isTransferring,
    error,
  } = useWriteContract();

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  // Connect wallet
  const connectWallet = async () => {
    try {
      connect({ connector: injected() });
    } catch (err) {
      console.error("Failed to connect:", err);
    }
  };

  // Transfer tokens
  const transferTokens = async () => {
    if (!recipientAddress || !amount) return;
    try {
      writeContract({
        address: TOKEN_CONTRACT_ADDRESS,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [recipientAddress, parseEther(amount)],
      });
    } catch (err) {
      console.error("Transfer failed:", err);
    }
  };

  // Handle successful transfer
  if (isConfirmed) {
    refetchBalance();
    setRecipientAddress("");
    setAmount("");
  }

  return (
    <div className="card">
      <h2>Wagmi Implementation</h2>
      {isConnected ? (
        <div>
          <h3>
            {name || "Loading..."} ({symbol || "..."})
          </h3>
          <p>
            Connected Address: {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>
          <p>
            Balance: {balance ? formatEther(balance) : "0"} {symbol || ""}
          </p>
          <div style={{ marginTop: "20px" }}>
            <input
              type="text"
              placeholder="Recipient Address"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              style={{ marginBottom: "10px", width: "300px" }}
            />
            <br />
            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ marginBottom: "10px", width: "300px" }}
            />
            <br />
            <button
              disabled={isTransferring || isConfirming}
              onClick={transferTokens}
            >
              {isTransferring
                ? "Preparing Transaction..."
                : isConfirming
                  ? "Confirming Transaction..."
                  : "Transfer Tokens"}
            </button>
            {error && (
              <p style={{ color: "red" }}>Error: {error.message}</p>
            )}
          </div>
        </div>
      ) : (
        <button onClick={connectWallet}>Connect with Wagmi</button>
      )}
    </div>
  );
} 