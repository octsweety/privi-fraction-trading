const { ethers, Wallet, ContractFactory } = require("ethers");
const fs = require("fs");
require("dotenv").config();

const PriviMarket = "./build/contracts/PriviMarket.json";

let provider, wallet, connectedWallet;
// BSC Testnet
// const priviAddress = "0x1b1dDe68cBeCeC7913eb5B738fbE8Ed310e50ef3";
// const fractionAddress = "0xD4957C8C7A67593A3B16A85b9B5841709402834e";
// const priviMarketAddress = "0xfebe87e4feaed70e44600e7b827ae85ca133cefd";

// Kovan
const priviAddress = "0x538D3537DaEda25eAa8F880c12965ceDA5A05edE";
const fractionAddress = "0x7701De5F222EA4EcEf9135476690b7eeD3680E4C";
const priviMarketAddress = "0xceaFD65Fbb3A278da94cd11e63e9a7EF3ae4270f";

if (process.env.NETWORK == "mainnet") {
  provider = ethers.providers.getDefaultProvider(
    "https://bsc-dataseed1.defibit.io/"
  );
} else if (process.env.NETWORK == "testnet") {
  provider = ethers.getDefaultProvider(
    "https://data-seed-prebsc-1-s1.binance.org:8545"
  );
} else if(process.env.NETWORK == "kovan") {
  provider = ethers.getDefaultProvider("kovan");
}

wallet = new Wallet(process.env.PRIVATE_KEY);
connectedWallet = wallet.connect(provider);

let contractOwner = "0xC627D743B1BfF30f853AE218396e6d47a4f34ceA";

const unpackArtifact = (artifactPath) => {
  let contractData = JSON.parse(fs.readFileSync(artifactPath));

  const contractBytecode = contractData["bytecode"];
  const contractABI = contractData["abi"];
  const constructorArgs = contractABI.filter((itm) => {
    return itm.type == "constructor";
  });

  let constructorStr;
  if (constructorArgs.length < 1) {
    constructorStr = " -- No constructor arguments -- ";
  } else {
    constructorJSON = constructorArgs[0].inputs;
    constructorStr = JSON.stringify(
      constructorJSON.map((c) => {
        return {
          name: c.name,
          type: c.type,
        };
      })
    );
  }

  return {
    abi: contractABI,
    bytecode: contractBytecode,
    contractName: contractData.contractName,
    constructor: constructorStr,
  };
};

const deployContract = async (
  contractABI,
  contractBytecode,
  wallet,
  provider,
  args = []
) => {
  const factory = new ContractFactory(
    contractABI,
    contractBytecode,
    wallet.connect(provider)
  );
  return await factory.deploy(...args);
};

const deploy = async (artifactPath, args) => {
  try {
    let tokenUnpacked = unpackArtifact(artifactPath);
    console.log(
      `${tokenUnpacked.contractName} \n Constructor: ${tokenUnpacked.constructor}`
    );
    const token = await deployContract(
      tokenUnpacked.abi,
      tokenUnpacked.bytecode,
      wallet,
      provider,
      args
    );
    console.log(
      `⌛ Deploying ${tokenUnpacked.contractName}... ${token.deployTransaction.hash} ${token.address}`
    );

    await connectedWallet.provider.waitForTransaction(
      token.deployTransaction.hash
    );
    console.log(
      `✅ Deployed ${tokenUnpacked.contractName} to ${token.address} ${token.deployTransaction.hash}`
    );
  } catch (err) {
    console.log("deploy ======>", err);
  }
};


// From here, all the args are to be determined.
if (priviAddress && fractionAddress) {
  deploy(PriviMarket, [
    priviAddress,
    fractionAddress,
  ]);
  return;
}
