// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";


export default buildModule("ModulsSalesManager", (m) => {

    const modulsSalesManager = m.contract("ModulsSalesManager", []);



    return { modulsSalesManager };
});
