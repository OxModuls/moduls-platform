// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";


export default buildModule("ModulsSalesManager", (m) => {

    const modulsSalesManager = m.contract("ModulsSalesManager", ["0x2396d72C6Da898C43023f6C66344a143c0d6278f"]);


    return { modulsSalesManager };
});
