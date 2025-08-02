// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

interface IModulsToken {
    function agentWallet() external view returns (address payable);

    function devWallet() external view returns (address);

    function taxPercent() external view returns (uint8);

    function agentSplit() external view returns (uint8);

    function salesManager() external view returns (address);
}
