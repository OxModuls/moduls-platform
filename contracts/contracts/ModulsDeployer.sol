// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
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
        address indexed creator
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
        bool autoRegister
    ) external returns (address) {
        // Ensure intentId is unique
        require(!usedIntentIds[intentId], "IntentId already exists");

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
            owner()
        );
        deployedTokens.push(address(token));
        tokenCreators[address(token)] = msg.sender;

        // Conditionally register the token with the SalesManager
        if (autoRegister) {
            ModulsSalesManager(payable(salesManager)).registerToken(
                address(token)
            );
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
            msg.sender
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
}
