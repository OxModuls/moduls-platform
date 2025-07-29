// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ModulsSalesManager is Ownable, Pausable {
    using EnumerableSet for EnumerableSet.AddressSet;

    // === Constants ===
    address public constant PLATFORM_ADMIN =
        0x2396d72C6Da898C43023f6C66344a143c0d6278f; // Replace with real admin address
    uint256 public constant INITIAL_PRICE = 0.001 ether;
    uint256 public constant PRICE_SLOPE = 0.00001 ether;
    uint256 public constant MAX_ETH_CAP = 100 ether;

    // === Market Data Structures ===
    struct MarketConfig {
        address token;
        address payable agentWallet;
        uint8 taxPercent;
        uint8 agentSplit;
        uint256 totalSupply;
        bool exists;
    }

    struct MarketStats {
        uint256 ethCollected;
        uint256 tokensSold;
        uint256 lastBuyBlock;
        uint256 lastSellBlock;
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

    mapping(address => uint256) public lastBuyBlock;
    mapping(address => uint256) public lastSellBlock;
    uint256 public cooldownBlocks = 2;

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

    constructor() Ownable(PLATFORM_ADMIN) {}

    // === Core ===

    function registerToken(
        address token,
        address payable agentWallet,
        uint8 taxPercent,
        uint8 agentSplit,
        uint256 totalSupply
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
            taxPercent: taxPercent,
            agentSplit: agentSplit,
            totalSupply: totalSupply,
            exists: true
        });

        supportedTokens.add(token);

        emit ModulsTokenRegistered(token, agentWallet);
    }

    function getCurrentPrice(address token) public view returns (uint256) {
        MarketStats memory stats = marketStats[token];
        return INITIAL_PRICE + (PRICE_SLOPE * stats.tokensSold);
    }

    function buyToken(
        address token,
        uint256 tokenAmount
    ) external payable whenNotPaused {
        require(supportedTokens.contains(token), "Unsupported token");
        require(
            block.number > lastBuyBlock[msg.sender] + cooldownBlocks,
            "Buy cooldown"
        );

        MarketConfig memory config = marketConfigs[token];
        MarketStats storage stats = marketStats[token];

        uint256 pricePerToken = getCurrentPrice(token);
        uint256 cost = tokenAmount * pricePerToken;
        require(msg.value >= cost, "Insufficient ETH");
        require(stats.ethCollected + cost <= MAX_ETH_CAP, "Max cap reached");

        uint256 tax = (cost * config.taxPercent) / 100;
        uint256 agentShare = (tax * config.agentSplit) / 100;
        uint256 remaining = cost - tax;

        IERC20(config.token).transfer(msg.sender, tokenAmount);

        (bool sent1, ) = config.agentWallet.call{value: agentShare}("");
        require(sent1, "Agent wallet transfer failed");
        (bool sent2, ) = owner().call{value: tax - agentShare}("");
        require(sent2, "Dev wallet transfer failed");

        stats.ethCollected += cost;
        stats.tokensSold += tokenAmount;
        stats.lastBuyBlock = block.number;
        lastBuyBlock[msg.sender] = block.number;

        tradeStats[token].totalVolumeETH += cost;
        tradeStats[token].totalVolumeToken += tokenAmount;
        tradeStats[token].totalBuys++;

        emit ModulsTokenPurchase(
            token,
            msg.sender,
            tokenAmount,
            cost,
            pricePerToken,
            block.timestamp
        );
    }

    function sellToken(
        address token,
        uint256 tokenAmount
    ) external whenNotPaused {
        require(supportedTokens.contains(token), "Unsupported token");
        require(
            block.number > lastSellBlock[msg.sender] + cooldownBlocks,
            "Sell cooldown"
        );

        MarketConfig memory config = marketConfigs[token];
        MarketStats storage stats = marketStats[token];

        uint256 pricePerToken = getCurrentPrice(token);
        uint256 ethToReturn = tokenAmount * pricePerToken;

        IERC20(config.token).transferFrom(
            msg.sender,
            address(this),
            tokenAmount
        );
        (bool sent, ) = msg.sender.call{value: ethToReturn}("");
        require(sent, "ETH transfer failed");

        stats.tokensSold -= tokenAmount;
        stats.ethCollected -= ethToReturn;
        stats.lastSellBlock = block.number;
        lastSellBlock[msg.sender] = block.number;

        tradeStats[token].totalVolumeETH += ethToReturn;
        tradeStats[token].totalVolumeToken += tokenAmount;
        tradeStats[token].totalSells++;

        emit ModulsTokenSell(
            token,
            msg.sender,
            tokenAmount,
            ethToReturn,
            pricePerToken,
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
        (bool sent, ) = to.call{value: amount}("");
        require(sent, "Withdraw failed");
        emit ModulsTokenWithdraw(address(0), to, amount);
    }

    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokens.values();
    }

    receive() external payable {}
}
