require("dotenv").config();

var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = process.env["MNENOMIC"];
var apiKey = process.env.NETWORK == "kovan" ? process.env["ETHERSCAN_KEY"]: process.env["BSCSCAN_KEY"];

module.exports = {
  api_keys: {
    etherscan: apiKey,
  },
  networks: {
    mainnet: {
      provider: function () {
        return new HDWalletProvider(
          mnemonic,
          "https://bsc-dataseed1.binance.org",
          0,
          99
        );
      },
      network_id: 56,
      gas: 6000000,
      confirmations: 3,
      timeoutBlocks: 4000,
    },
    matic: {
      provider: function () {
        return new HDWalletProvider(
          mnemonic,
          "https://rpc-mainnet.matic.network",
          0,
          99
        );
      },
      network_id: 137,
      gas: 6000000,
      confirmations: 3,
      timeoutBlocks: 4000,
    },
    testnet: {
      provider: () =>
        new HDWalletProvider(
          mnemonic,
          `https://data-seed-prebsc-1-s1.binance.org:8545`,
          0,
          99
        ),
      network_id: 97,
      timeoutBlocks: 4000,
      confirmations: 3,
      production: true, // Treats this network as if it was a public net. (default: false)
    },
    kovan: {
      provider: () =>
        new HDWalletProvider(
          mnemonic,
          `https://kovan.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161`
        ),
      network_id: 42,
      timeoutBlocks: 4000,
      confirmations: 3,
      production: true, // Treats this network as if it was a public net. (default: false)
    },
    test: {
      provider: function () {
        return new HDWalletProvider(mnemonic, "http://127.0.0.1:8545/", 0, 99);
      },
      from: "0x0",
      network_id: "*",
      gas: 6721975, // Gas sent with each transaction (default: ~6700000)
      gasPrice: 100000000000, // 20 gwei (in wei) (default: 100 gwei)
    },
  },
  mocha: {
    timeout: 100000,
  },
  // Configure your compilers
  compilers: {
    solc: {
      version: "0.6.12", // Fetch exact version from solc-bin (default: truffle's version)

      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
  plugins: ["truffle-contract-size", "truffle-plugin-verify"],
};
