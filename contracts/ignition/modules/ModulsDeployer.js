// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";


export default buildModule("ModulsDeployer", (m) => {

  const modulsDeployer = m.contract("ModulsDeployer", ["0x2288e87Cc3E81Fe6cBeCd7C025805Ee92F1781bF"]);



  return { modulsDeployer };
});


// 0x2288e87Cc3E81Fe6cBeCd7C025805Ee92F1781bF - sales manager
// 0xfDD3d409A10F0a56c8ccB15fa3e3f51aC8059919 - deployer