// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract ModulsSalesManager is Ownable, Pausable, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;

    // === Constants ===
    address public constant PLATFORM_ADMIN =
        0x2396d72C6Da898C43023f6C66344a143c0d6278f; // Replace with real admin address

    // === Bonding Curve Parameters ===
    uint256 public initialPrice = 0.0000000001 ether; // 0.0000001 ETH = ~$0.0002 at $2000/ETH
    uint256 public priceSlope = 0.000000000001 ether; // 0.000000001 ETH = ~$0.000002 at $2000/ETH
    uint256 public maxEthCap = 1000 ether; // $2M cap for 1B supply

    // === Market Data Structures ===
    struct MarketConfig {
        address token;
        address payable agentWallet;
        address payable devWallet;
        uint8 taxPercent;
        uint8 agentSplit;
        bool exists;
    }

    struct MarketStats {
        uint256 ethCollected;
        uint256 tokensSold;
        uint256 lastBuyTime;
        uint256 lastSellTime;
    }

    struct TradeStats {
        uint256 totalVolumeETH;
        uint256 totalVolumeToken;
        uint256 totalBuys;
        uint256 totalSells;
    }

    mapping(address => MarketConfig) public marketConfigs;
    mapping(address => MarketStats) public marketStats;
    mapping(address => TradeStats) public tradeStats;
    EnumerableSet.AddressSet private supportedTokens;

    // Per-user per-token cooldown tracking
    mapping(address => mapping(address => uint256)) public lastBuyTime; // token => user => timestamp
    mapping(address => mapping(address => uint256)) public lastSellTime; // token => user => timestamp
    uint256 public cooldownTime = 2; // seconds

    // === Events ===
    event ModulsTokenRegistered(
        address indexed token,
        address indexed agentWallet
    );
    event ModulsTokenPurchase(
        address indexed token,
        address indexed buyer,
        uint256 amount,
        uint256 ethSpent,
        uint256 price,
        uint256 timestamp
    );
    event ModulsTokenSell(
        address indexed token,
        address indexed seller,
        uint256 amount,
        uint256 ethReceived,
        uint256 price,
        uint256 timestamp
    );
    event ModulsTokenWithdraw(
        address indexed token,
        address indexed to,
        uint256 amount
    );
    event BondingCurveParametersUpdated(
        uint256 initialPrice,
        uint256 priceSlope,
        uint256 maxEthCap
    );

    constructor() Ownable(PLATFORM_ADMIN) {}

    // === Core ===

    function registerToken(
        address token,
        address payable agentWallet,
        address payable devWallet,
        uint8 taxPercent,
        uint8 agentSplit
    ) external {
        require(!marketConfigs[token].exists, "Token already registered");
        require(taxPercent <= 10, "Tax too high");
        require(agentSplit <= 100, "Invalid split");
        require(
            IERC20(token).balanceOf(address(this)) > 0,
            "SalesManager must hold token"
        );

        marketConfigs[token] = MarketConfig({
            token: token,
            agentWallet: agentWallet,
            devWallet: devWallet,
            taxPercent: taxPercent,
            agentSplit: agentSplit,
            exists: true
        });

        supportedTokens.add(token);

        emit ModulsTokenRegistered(token, agentWallet);
    }

    function getCurrentPrice(address token) public view returns (uint256) {
        return initialPrice + (marketStats[token].tokensSold * priceSlope);
    }

    function getEtherCostForToken(
        address token,
        uint256 tokenAmount
    ) public view returns (uint256 cost, uint256 tax, uint256 totalCost) {
        require(
            marketConfigs[token].token != address(0),
            "Token not registered"
        );
        require(tokenAmount > 0, "Amount must be greater than 0");

        MarketConfig memory config = marketConfigs[token];
        MarketStats memory stats = marketStats[token];

        // Convert tokenAmount from wei to natural units using token decimals
        uint256 tokenDecimals = IERC20Metadata(token).decimals();
        uint256 tokenAmountNatural = tokenAmount / (10 ** tokenDecimals);

        // Calculate ETH needed using linear bonding curve integration
        uint256 ethNeeded = calculateBondingCurveCost(
            stats.tokensSold,
            stats.tokensSold + tokenAmountNatural
        );

        cost = ethNeeded;
        tax = (cost * config.taxPercent) / 100;
        totalCost = cost + tax;

        return (cost, tax, totalCost);
    }

    function getEtherReturnForToken(
        address token,
        uint256 tokenAmount
    ) public view returns (uint256 ethReturn) {
        require(
            marketConfigs[token].token != address(0),
            "Token not registered"
        );
        require(tokenAmount > 0, "Amount must be greater than 0");

        MarketStats memory stats = marketStats[token];

        // Convert tokenAmount from wei to natural units using token decimals
        uint256 tokenDecimals = IERC20Metadata(token).decimals();
        uint256 tokenAmountNatural = tokenAmount / (10 ** tokenDecimals);

        require(
            stats.tokensSold >= tokenAmountNatural,
            "Insufficient tokens in market"
        );

        // Calculate ETH return using linear bonding curve integration
        ethReturn = calculateBondingCurveCost(
            stats.tokensSold - tokenAmountNatural,
            stats.tokensSold
        );

        return ethReturn;
    }

    function _calculateTokenAmountForEth(
        uint256 ethAmount,
        uint256 tokensSold
    )
        internal
        view
        returns (uint256 tokenAmountNatural, uint256 actualEthAmount)
    {
        uint256 price1 = initialPrice + (tokensSold * priceSlope);
        uint256 a = priceSlope;
        uint256 b = 2 * price1;
        uint256 c = 2 * ethAmount;

        uint256 discriminant = b * b + 4 * a * c;
        uint256 sqrtDiscriminant = sqrt(discriminant);
        tokenAmountNatural = (sqrtDiscriminant - b) / (2 * a);
        actualEthAmount = ethAmount;

        return (tokenAmountNatural, actualEthAmount);
    }

    function getTokenAmountForEther(
        address token,
        uint256 ethAmount
    )
        public
        view
        returns (
            uint256 tokenAmount,
            uint256 cost,
            uint256 tax,
            uint256 totalCost
        )
    {
        require(
            marketConfigs[token].token != address(0),
            "Token not registered"
        );
        require(ethAmount > 0, "Amount must be greater than 0");

        MarketConfig memory config = marketConfigs[token];
        MarketStats memory stats = marketStats[token];

        // Calculate how many tokens can be bought with this ETH amount
        (
            uint256 tokenAmountNatural,
            uint256 actualEthAmount
        ) = _calculateTokenAmountForEth(ethAmount, stats.tokensSold);

        // Check if this would exceed maxEthCap
        if (stats.ethCollected + ethAmount > maxEthCap) {
            uint256 remainingEth = maxEthCap - stats.ethCollected;
            (tokenAmountNatural, actualEthAmount) = _calculateTokenAmountForEth(
                remainingEth,
                stats.tokensSold
            );
        }

        // Convert tokenAmountNatural to wei
        uint256 tokenDecimals = IERC20Metadata(token).decimals();
        tokenAmount = tokenAmountNatural * (10 ** tokenDecimals);

        cost = actualEthAmount;
        tax = (cost * config.taxPercent) / 100;
        totalCost = cost + tax;

        return (tokenAmount, cost, tax, totalCost);
    }

    function calculateBondingCurveCost(
        uint256 fromTokens,
        uint256 toTokens
    ) internal view returns (uint256) {
        // Linear bonding curve integration: area under the line
        // Area = (base1 + base2) * height / 2 (trapezoid formula)
        // Where base1 = price at fromTokens, base2 = price at toTokens, height = token difference

        uint256 priceAtFrom = initialPrice + (fromTokens * priceSlope);
        uint256 priceAtTo = initialPrice + (toTokens * priceSlope);
        uint256 tokenDifference = toTokens - fromTokens;

        // Area under the linear curve = (price1 + price2) * tokenDifference / 2
        return ((priceAtFrom + priceAtTo) * tokenDifference) / 2;
    }

    function sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }

    function _calculateMaxTokenAmountForEth(
        uint256 remainingEth,
        uint256 tokensSold
    ) internal view returns (uint256) {
        uint256 price1 = initialPrice + (tokensSold * priceSlope);
        uint256 a = priceSlope;
        uint256 b = 2 * price1;
        uint256 c = 2 * remainingEth;
        uint256 discriminant = b * b + 4 * a * c;
        uint256 sqrtDiscriminant = sqrt(discriminant);
        return (sqrtDiscriminant - b) / (2 * a);
    }

    function buyToken(
        address token,
        uint256 tokenAmount,
        uint256 maxCost
    ) external payable nonReentrant {
        require(tokenAmount > 0, "Amount must be greater than 0");
        require(
            marketConfigs[token].token != address(0),
            "Token not registered"
        );

        MarketConfig memory config = marketConfigs[token];
        MarketStats storage stats = marketStats[token];

        // Check cooldown
        require(
            block.timestamp >= lastBuyTime[msg.sender][token] + cooldownTime,
            "Cooldown not met"
        );

        // Convert tokenAmount from wei to natural units using token decimals
        uint256 tokenDecimals = IERC20Metadata(token).decimals();
        uint256 tokenAmountNatural = tokenAmount / (10 ** tokenDecimals);

        // Calculate cost using linear bonding curve integration
        uint256 cost = calculateBondingCurveCost(
            stats.tokensSold,
            stats.tokensSold + tokenAmountNatural
        );
        uint256 tax = (cost * config.taxPercent) / 100;
        uint256 totalCost = cost + tax;

        // Check if this purchase would exceed maxEthCap
        if (stats.ethCollected + cost > maxEthCap) {
            uint256 remainingEth = maxEthCap - stats.ethCollected;
            uint256 actualTokenAmountNatural = _calculateMaxTokenAmountForEth(
                remainingEth,
                stats.tokensSold
            );
            require(actualTokenAmountNatural > 0, "No tokens to buy");

            // Recalculate cost and tax for the actual amount
            cost = calculateBondingCurveCost(
                stats.tokensSold,
                stats.tokensSold + actualTokenAmountNatural
            );
            tax = (cost * config.taxPercent) / 100;
            totalCost = cost + tax;

            // Update tokenAmount to the actual amount we can buy (convert back to wei)
            tokenAmount = actualTokenAmountNatural * (10 ** tokenDecimals);
            tokenAmountNatural = actualTokenAmountNatural;
        }

        // Slippage protection
        require(totalCost <= maxCost, "Slippage too high");
        require(msg.value >= totalCost, "Insufficient ETH");

        // Max ETH cap enforcement (now always satisfied due to above logic)
        require(stats.ethCollected + cost <= maxEthCap, "Max ETH cap reached");

        // Calculate shares
        uint256 agentShare = (tax * config.agentSplit) / 100;
        uint256 devShare = tax - agentShare;

        // Update state before external calls
        stats.tokensSold += tokenAmountNatural;
        stats.ethCollected += cost;
        stats.lastBuyTime = block.timestamp;
        lastBuyTime[msg.sender][token] = block.timestamp;

        _updateBuyStats(token, cost, tokenAmountNatural);

        // Transfer tokens to buyer (use original tokenAmount in wei)
        IERC20(config.token).safeTransfer(msg.sender, tokenAmount);

        // Send tax to agent wallet and dev wallet
        (bool sent1, ) = config.agentWallet.call{value: agentShare}("");
        require(sent1, "Failed to send agent share");

        (bool sent2, ) = config.devWallet.call{value: devShare}("");
        require(sent2, "Failed to send dev share");

        // Refund excess ETH
        uint256 excess = msg.value - totalCost;
        if (excess > 0) {
            (bool refundSent, ) = msg.sender.call{value: excess}("");
            require(refundSent, "Refund failed");
        }

        uint256 currentPrice = getCurrentPrice(token);

        emit ModulsTokenPurchase(
            token,
            msg.sender,
            tokenAmount, // Keep original wei amount for event
            cost,
            currentPrice,
            block.timestamp
        );
    }

    function _updateBuyStats(
        address token,
        uint256 cost,
        uint256 tokenAmountNatural
    ) internal {
        tradeStats[token].totalVolumeETH += cost;
        tradeStats[token].totalVolumeToken += tokenAmountNatural;
        tradeStats[token].totalBuys++;
    }

    function _updateSellStats(
        address token,
        uint256 ethToReturn,
        uint256 tokenAmountNatural
    ) internal {
        tradeStats[token].totalVolumeETH += ethToReturn;
        tradeStats[token].totalVolumeToken += tokenAmountNatural;
        tradeStats[token].totalSells++;
    }

    function sellToken(
        address token,
        uint256 tokenAmount
    ) external whenNotPaused nonReentrant {
        require(supportedTokens.contains(token), "Unsupported token");
        require(tokenAmount > 0, "Amount must be greater than 0");
        require(
            block.timestamp > lastSellTime[msg.sender][token] + cooldownTime,
            "Sell cooldown"
        );

        // Check approval first
        require(
            IERC20(token).allowance(msg.sender, address(this)) >= tokenAmount,
            "Insufficient allowance"
        );

        MarketConfig memory config = marketConfigs[token];
        MarketStats storage stats = marketStats[token];

        // Convert tokenAmount from wei to natural units using token decimals
        uint256 tokenDecimals = IERC20Metadata(token).decimals();
        uint256 tokenAmountNatural = tokenAmount / (10 ** tokenDecimals);

        // Calculate ETH to return using linear bonding curve integration
        uint256 ethToReturn = calculateBondingCurveCost(
            stats.tokensSold - tokenAmountNatural,
            stats.tokensSold
        );

        // Check for underflow protection
        require(
            stats.tokensSold >= tokenAmountNatural,
            "Underflow on tokensSold"
        );

        // Update state before external calls
        stats.ethCollected -= ethToReturn;
        stats.tokensSold -= tokenAmountNatural; // Reduce token depth for symmetric pricing
        stats.lastSellTime = block.timestamp;
        lastSellTime[msg.sender][token] = block.timestamp;

        _updateSellStats(token, ethToReturn, tokenAmountNatural);

        // External calls after state updates
        IERC20(config.token).safeTransferFrom(
            msg.sender,
            address(this),
            tokenAmount // Use original wei amount for transfer
        );
        (bool sent, ) = msg.sender.call{value: ethToReturn}("");
        require(sent, "ETH transfer failed");

        uint256 currentPrice = getCurrentPrice(token);

        emit ModulsTokenSell(
            token,
            msg.sender,
            tokenAmount, // Keep original wei amount for event
            ethToReturn,
            currentPrice,
            block.timestamp
        );
    }

    // === Admin ===

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function withdrawETH(
        address payable to,
        uint256 amount
    ) external onlyOwner {
        require(
            address(this).balance >= amount,
            "Insufficient contract balance"
        );
        (bool sent, ) = to.call{value: amount}("");
        require(sent, "Withdraw failed");
        emit ModulsTokenWithdraw(address(0), to, amount);
    }

    function setCooldownTime(uint256 _cooldownTime) external onlyOwner {
        require(_cooldownTime <= 3600, "Cooldown too high"); // Max 1 hour
        cooldownTime = _cooldownTime;
    }

    function setInitialPrice(uint256 _initialPrice) external onlyOwner {
        require(_initialPrice > 0, "Initial price must be greater than 0");
        require(_initialPrice <= 1 ether, "Initial price too high");
        initialPrice = _initialPrice;
        emit BondingCurveParametersUpdated(initialPrice, priceSlope, maxEthCap);
    }

    function setPriceSlope(uint256 _priceSlope) external onlyOwner {
        require(_priceSlope > 0, "Price slope must be greater than 0");
        require(_priceSlope <= 0.1 ether, "Price slope too high");
        priceSlope = _priceSlope;
        emit BondingCurveParametersUpdated(initialPrice, priceSlope, maxEthCap);
    }

    function setMaxEthCap(uint256 _maxEthCap) external onlyOwner {
        require(_maxEthCap > 0, "Max ETH cap must be greater than 0");
        require(_maxEthCap <= 1000 ether, "Max ETH cap too high");
        maxEthCap = _maxEthCap;
        emit BondingCurveParametersUpdated(initialPrice, priceSlope, maxEthCap);
    }

    function setBondingCurveParameters(
        uint256 _initialPrice,
        uint256 _priceSlope,
        uint256 _maxEthCap
    ) external onlyOwner {
        require(_initialPrice > 0, "Initial price must be greater than 0");
        require(_initialPrice <= 1 ether, "Initial price too high");
        require(_priceSlope > 0, "Price slope must be greater than 0");
        require(_priceSlope <= 0.1 ether, "Price slope too high");
        require(_maxEthCap > 0, "Max ETH cap must be greater than 0");
        require(_maxEthCap <= 1000 ether, "Max ETH cap too high");

        initialPrice = _initialPrice;
        priceSlope = _priceSlope;
        maxEthCap = _maxEthCap;

        emit BondingCurveParametersUpdated(initialPrice, priceSlope, maxEthCap);
    }

    function emergencyWithdrawToken(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
        emit ModulsTokenWithdraw(token, to, amount);
    }

    function removeToken(address token) external onlyOwner {
        require(marketConfigs[token].exists, "Token not registered");
        supportedTokens.remove(token);
        delete marketConfigs[token];
        delete marketStats[token];
        delete tradeStats[token];
    }

    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokens.values();
    }

    receive() external payable {}
}
