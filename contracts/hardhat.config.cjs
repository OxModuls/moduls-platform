require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");





/** @type import('hardhat/config').HardhatUserConfig */



const config = {
  wallets: ["0x2396d72C6Da898C43023f6C66344a143c0d6278f"],

  accounts: [
    "003b831edfa33411cf62b252e90b6b00fe717560e703d510e39e0b73829c729f"
  ],
};


module.exports = {



  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },

      evmVersion: "paris",
    },
  },


  etherscan: {

    apiKey: {

      seiTestnet: "<SEI_TESTNET_API_KEY>",
      seiMainnet: "<SEI_MAINNET_API_KEY>",

    },




    customChains: [
      {
        network: "seiTestnet",
        chainId: 1328,
        urls: {
          apiURL: "https://seitrace.com/atlantic-2/api",
          browserURL: "https://testnet.seistream.app/",
        },
      },
      {
        network: "seiMainnet",
        chainId: 1329,
        urls: {
          apiURL: "https://seitrace.com/pacific-1/api",
          browserURL: "https://seistream.app/",
        },
      },
    ],
  },

  sourcify: {
    enabled: false,
  },


  ignition: {
    blockPollingInterval: 1_000,
    timeBeforeBumpingFees: 3 * 60 * 1_000,
    maxFeeBumps: 4,
    requiredConfirmations: 5,
    disableFeeBumping: false,
  },

  networks: {

    seiTestnet: {

      url: "https://evm-rpc-testnet.sei-apis.com",
      accounts: config.accounts,
      chainId: 1328


    },

    seiMainnet: {
      url: "https://evm-rpc.sei-apis.com",
      accounts: config.accounts,
      chainId: 1329
    },

    hardhat: {
      chainId: 31337
    }


  }
};
