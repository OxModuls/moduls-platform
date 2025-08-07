// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";


export default buildModule("ModulsDeployer", (m) => {

  const modulsDeployer = m.contract("ModulsDeployer", ["0xab9e6EbEa548fB4E1ed493f066095971523DFD88"]);



  return { modulsDeployer };
});


// 0xab9e6EbEa548fB4E1ed493f066095971523DFD88