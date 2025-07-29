// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract ModulsToken is ERC20, Ownable, Pausable {
    address public constant PLATFORM_ADMIN =
        0x2396d72C6Da898C43023f6C66344a143c0d6278f;

    address public agentWallet;
    address public salesManager;
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
        string metadataURI
    );

    event ModulsTokenPaused(address indexed by);
    event ModulsTokenUnpaused(address indexed by);

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply_,
        address agentWallet_,
        address creator_,
        address salesManager_,
        uint8 taxPercent_,
        uint8 agentSplit_,
        uint256 intentId_,
        string memory metadataURI_
    ) ERC20(name_, symbol_) Ownable(PLATFORM_ADMIN) {
        require(taxPercent_ <= 10, "Max tax is 10%");
        require(agentSplit_ <= 100, "Agent split must be <= 100");

        agentWallet = agentWallet_;
        salesManager = salesManager_;
        taxPercent = taxPercent_;
        agentSplit = agentSplit_;
        intentId = intentId_;
        metadataURI = metadataURI_;

        _isAdmin[PLATFORM_ADMIN] = true;

        _mint(salesManager_, initialSupply_);
        _transferOwnership(PLATFORM_ADMIN);

        emit ModulsTokenInitialized(
            address(this),
            agentWallet_,
            creator_,
            salesManager_,
            taxPercent_,
            agentSplit_,
            intentId_,
            metadataURI_
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

contract ModulsDeployer {
    address[] public deployedTokens;
    mapping(address => address) public tokenCreators;
    mapping(uint256 => bool) public usedIntentIds; // Track used intentIds

    event ModulsTokenCreated(
        address indexed tokenAddress,
        string name,
        string symbol,
        uint256 initialSupply,
        address agentWallet,
        address salesManager,
        uint8 taxPercent,
        uint8 agentSplit,
        uint256 intentId,
        string metadataURI,
        address indexed creator
    );

    function deployToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address agentWallet,
        address salesManager,
        uint8 taxPercent,
        uint8 agentSplit,
        uint256 intentId,
        string memory metadataURI
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
            metadataURI
        );
        deployedTokens.push(address(token));
        tokenCreators[address(token)] = msg.sender;

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

    function getDeployedTokens() external view returns (address[] memory) {
        return deployedTokens;
    }
}
