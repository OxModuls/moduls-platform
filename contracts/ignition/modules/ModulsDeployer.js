// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";


export default buildModule("ModulsDeployer", (m) => {

  const modulsDeployer = m.contract("ModulsDeployer", ["0x85A8817b2BAa9b36e7F9EbbB047e77Df5cCBE43a"]);



  return { modulsDeployer };
});


// 0xCFC7CB241D5643f07cB108bE5a3dEb25Ba70F8f8