// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./ModulsSalesManager.sol";

contract ModulsToken is ERC20, Ownable, Pausable {
    address public platformAdmin;

    address public agentWallet;
    address public salesManager;
    address public devWallet; // Address of the token creator/developer
    uint8 public taxPercent; // Applied in SalesManager
    uint8 public agentSplit; // Percent of tax sent to agent
    uint256 public intentId;
    string public metadataURI;
    uint256 public launchDate; // Timestamp when trading opens (0 = immediate)

    mapping(address => bool) private _isAdmin;

    modifier onlyAdmin() {
        require(_isAdmin[msg.sender], "Not an admin");
        _;
    }

    event ModulsTokenInitialized(
        address indexed tokenAddress,
        address indexed agentWallet,
        address indexed creator,
        address salesManager,
        uint8 taxPercent,
        uint8 agentSplit,
        uint256 intentId,
        string metadataURI,
        address platformAdmin
    );

    event ModulsTokenPaused(address indexed by);
    event ModulsTokenUnpaused(address indexed by);

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply_,
        address agentWallet_,
        address devWallet_,
        address salesManager_,
        uint8 taxPercent_,
        uint8 agentSplit_,
        uint256 intentId_,
        string memory metadataURI_,
        uint256 launchDate_,
        address platformAdmin_
    ) ERC20(name_, symbol_) Ownable(platformAdmin_) {
        require(taxPercent_ <= 10, "Max tax is 10%");
        require(agentSplit_ <= 100, "Agent split must be <= 100");

        agentWallet = agentWallet_;
        salesManager = salesManager_;
        devWallet = devWallet_; // Set the developer wallet address
        taxPercent = taxPercent_;
        agentSplit = agentSplit_;
        intentId = intentId_;
        metadataURI = metadataURI_;
        platformAdmin = platformAdmin_;
        launchDate = launchDate_;

        _isAdmin[platformAdmin] = true;

        _mint(salesManager_, initialSupply_ * 10 ** decimals());

        emit ModulsTokenInitialized(
            address(this),
            agentWallet_,
            devWallet_,
            salesManager_,
            taxPercent_,
            agentSplit_,
            intentId_,
            metadataURI_,
            platformAdmin_
        );
    }

    function setAdmin(address admin, bool status) external onlyOwner {
        _isAdmin[admin] = status;
    }

    function isAdmin(address addr) external view returns (bool) {
        return _isAdmin[addr];
    }

    function pause() external onlyAdmin {
        _pause();
        emit ModulsTokenPaused(msg.sender);
    }

    function unpause() external onlyAdmin {
        _unpause();
        emit ModulsTokenUnpaused(msg.sender);
    }
}

contract ModulsDeployer is Ownable {
    address public salesManager;
    address[] public deployedTokens;
    mapping(address => address) public tokenCreators;
    mapping(uint256 => bool) public usedIntentIds; // Track used intentIds
    uint256 public deploymentFee = 1 wei; // Small deployment fee (1 wei)

    event SalesManagerUpdated(
        address indexed oldSalesManager,
        address indexed newSalesManager
    );

    constructor(address _salesManager) Ownable(msg.sender) {
        salesManager = _salesManager;
    }

    event ModulsTokenCreated(
        address indexed tokenAddress,
        string name,
        string symbol,
        uint256 initialSupply,
        address agentWallet,
        address salesManager,
        uint8 taxPercent,
        uint8 agentSplit,
        uint256 indexed intentId,
        string metadataURI,
        address indexed creator,
        uint256 launchDate
    );

    function deployToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address agentWallet,
        uint8 taxPercent,
        uint8 agentSplit,
        uint256 intentId,
        string memory metadataURI,
        uint256 launchDate,
        uint256 preBuyEthAmount
    ) external payable returns (address) {
        // Ensure intentId is unique
        require(!usedIntentIds[intentId], "IntentId already exists");

        // Check deployment fee
        require(msg.value >= deploymentFee, "Insufficient deployment fee");

        // Mark this intentId as used
        usedIntentIds[intentId] = true;

        ModulsToken token = new ModulsToken(
            name,
            symbol,
            initialSupply,
            agentWallet,
            msg.sender,
            salesManager,
            taxPercent,
            agentSplit,
            intentId,
            metadataURI,
            launchDate,
            owner()
        );

        deployedTokens.push(address(token));
        tokenCreators[address(token)] = msg.sender;

        // Always register the token with the SalesManager
        ModulsSalesManager(payable(salesManager)).registerTokenFromDeployer(
            address(token)
        );

        // Handle pre-buy if specified (must happen after registration)
        if (preBuyEthAmount > 0) {
            uint256 remainingValue = msg.value - deploymentFee;
            require(
                remainingValue >= preBuyEthAmount,
                "Insufficient ETH for pre-buy"
            );

            // Buy tokens for the developer using the specified ETH amount
            ModulsSalesManager salesManagerContract = ModulsSalesManager(
                payable(salesManager)
            );

            // Calculate maximum buy amount (99% of initial supply)
            uint256 maxBuyAmount = (initialSupply * 99) / 100;

            // Get the cost for maximum buy amount to check if we exceed 99%
            (, , uint256 maxTotalCost) = salesManagerContract
                .getEtherCostForToken(
                    address(token),
                    maxBuyAmount * 10 ** 18 // Convert to wei
                );

            require(maxTotalCost > 0, "Invalid token pricing");

            uint256 actualTokenAmount;
            uint256 actualEthToSpend;
            uint256 totalCostWithTax;

            // If the pre-buy amount would exceed 99% of supply, cap it at 99%
            if (preBuyEthAmount > maxTotalCost) {
                actualTokenAmount = maxBuyAmount;
                actualEthToSpend = maxTotalCost;
                totalCostWithTax = maxTotalCost; // maxTotalCost already includes tax
            } else {
                // Calculate pre-tax amount: preBuyEthAmount / (1 + tax%)
                // If preBuyEthAmount = 105 ETH and tax = 5%, then preTaxAmount = 105 / 1.05 = 100 ETH
                uint256 preTaxAmount = (preBuyEthAmount * 100) /
                    (100 + taxPercent);

                // Use the pre-tax amount to calculate token amount
                (actualTokenAmount, , , totalCostWithTax) = salesManagerContract
                    .getTokenAmountForEther(address(token), preTaxAmount);
                // Convert from wei back to natural units for the buy function
                actualTokenAmount = actualTokenAmount / (10 ** 18);
                actualEthToSpend = totalCostWithTax; // Use total cost including tax
            }

            // Execute the buy
            require(actualTokenAmount > 0, "Token amount too small");
            require(
                actualEthToSpend <= remainingValue,
                "Insufficient ETH for total cost including tax"
            );

            salesManagerContract.buyToken{value: actualEthToSpend}(
                address(token),
                actualTokenAmount * 10 ** 18,
                actualEthToSpend // Set maxCost equal to the amount we're sending
            );

            // Verify we have enough tokens to transfer (safeguard against SalesManager bugs)
            uint256 contractBalance = IERC20(address(token)).balanceOf(
                address(this)
            );
            uint256 tokenDecimals = IERC20Metadata(address(token)).decimals();
            uint256 tokensToTransfer = actualTokenAmount *
                (10 ** tokenDecimals);
            require(
                contractBalance >= tokensToTransfer,
                "Insufficient tokens received from purchase"
            );

            // Transfer only the exact amount this user is entitled to
            SafeERC20.safeTransfer(
                IERC20(address(token)),
                msg.sender,
                tokensToTransfer
            );

            // Refund excess ETH
            uint256 excess = remainingValue - actualEthToSpend;
            if (excess > 0) {
                (bool sent, ) = payable(msg.sender).call{value: excess}("");
                require(sent, "Failed to refund excess ETH");
            }
        }

        emit ModulsTokenCreated(
            address(token),
            name,
            symbol,
            initialSupply,
            agentWallet,
            salesManager,
            taxPercent,
            agentSplit,
            intentId,
            metadataURI,
            msg.sender,
            launchDate
        );

        return address(token);
    }

    /**
     * @dev Manually register a deployed token with the SalesManager
     * @param tokenAddress The address of the token to register
     */
    function registerDeployedToken(address tokenAddress) external {
        require(
            tokenCreators[tokenAddress] == msg.sender,
            "Only token creator can register"
        );
        require(tokenAddress != address(0), "Invalid token address");
        require(
            tokenCreators[tokenAddress] != address(0),
            "Token not deployed by this contract"
        );

        ModulsSalesManager(payable(salesManager)).registerToken(tokenAddress);
    }

    function getDeployedTokens() external view returns (address[] memory) {
        return deployedTokens;
    }

    function getDeployedTokensCount() external view returns (uint256) {
        return deployedTokens.length;
    }

    /**
     * @dev Update the salesManager address. Only callable by the contract owner.
     * @param newSalesManager The new salesManager address
     */
    function updateSalesManager(address newSalesManager) external onlyOwner {
        require(newSalesManager != address(0), "Invalid salesManager address");
        require(newSalesManager != salesManager, "Same salesManager address");

        address oldSalesManager = salesManager;
        salesManager = newSalesManager;

        emit SalesManagerUpdated(oldSalesManager, newSalesManager);
    }

    /**
     * @dev Set the deployment fee. Only callable by the contract owner.
     * @param _deploymentFee The new deployment fee in wei
     */
    function setDeploymentFee(uint256 _deploymentFee) external onlyOwner {
        require(_deploymentFee <= 100 ether, "Deployment fee too high");
        deploymentFee = _deploymentFee;
    }

    /**
     * @dev Withdraw accumulated deployment fees and any refunded ETH. Only callable by the contract owner.
     */
    function withdrawDeploymentFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");

        (bool sent, ) = payable(owner()).call{value: balance}("");
        require(sent, "Failed to withdraw fees");
    }

    /**
     * @dev Allow the contract to receive ETH (needed for refunds from SalesManager)
     */
    receive() external payable {}
}
