import chai, { expect } from "chai";
import { deployContract, MockProvider, solidity } from "ethereum-waffle";
import { BigNumber, Contract, Wallet, providers, utils } from "ethers";
import PriviMarket from "../build/contracts/PriviMarket.json";
import Privi from "../build/contracts/Privi.json";
import Fraction from "../build/contracts/Fraction.json";

chai.use(solidity);

const parseEther = (val:string, unit = 18) => {
  return utils.parseUnits(val, unit);
}

const toEther = (val:BigNumber, unit = 9) => {
  return utils.formatUnits(val, unit);
}

const toBN = (val:Number) => {
  return BigNumber.from(val);
}

const overrides = {
  gasLimit: 9999999,
};

describe("PriviMarket", async () => {
  const provider = new MockProvider({
    ganacheOptions: {
      hardfork: "istanbul",
      mnemonic:
        "lift unable shock chronic moment polar dizzy again symbol great motion switch",
      gasLimit: 9999999,
    },
  });

  const [deployer, account1, account2] = provider.getWallets();

  let privi: Contract;
  let fraction: Contract;
  let priviMarket: Contract;

  before(async () => {
    // Deploy privi currency token
    privi = await deployContract(
      deployer,
      Privi,
      [],
      overrides
    );
  
    // Deploy fraction token
    fraction = await deployContract(
      deployer,
      Fraction,
      [],
      overrides
    );
  
    // Deploy privi market contract
    priviMarket = await deployContract(
        deployer,
        PriviMarket,
        [
          fraction.address,
          privi.address,
        ],
        overrides
      );
  });

  after(async () => {
  });

  beforeEach(async () => {
  });

  it("Distribute Privi token", async () => {
    const totalSupply = await privi.totalSupply();
    expect(totalSupply).eq(parseEther('100000000')); // 100m initial supply

    await privi.transfer(account1.address, parseEther('100000')); // Sent 100k
    await privi.transfer(account2.address, parseEther('200000'));

    expect(await privi.balanceOf(account1.address)).eq(parseEther('100000'));
    expect(await privi.balanceOf(account2.address)).eq(parseEther('200000'));

    // Approve transfering privi token to market as max amount
    await privi.connect(account1).approve(priviMarket.address, parseEther('100000000'));
    await privi.connect(account2).approve(priviMarket.address, parseEther('100000000'));
    await privi.connect(deployer).approve(priviMarket.address, parseEther('100000000'));
  });

  it("Mint 100 fraction", async() => {
    const beforeBalance = await fraction.totalSupply();
    await fraction.mint(deployer.address, 100);
    expect(await fraction.totalSupply()).eq(beforeBalance.add(100));

    // Approve transfering fractions to market as max amount
    await fraction.connect(account1).approve(priviMarket.address, 100);
    await fraction.connect(account1).approve(priviMarket.address, 100);
    await fraction.connect(deployer).approve(priviMarket.address, 100);
  });

  it("Fractionalise token 3 times", async() => {
    const beforeOrderCount = await priviMarket.sellOrderCount();
    await fraction.approve(priviMarket.address, 100);
    await priviMarket.fractionaliseToken(50, parseEther('1000')); // 1k initial price
    await priviMarket.fractionaliseToken(30, parseEther('2000')); // 1k initial price
    await priviMarket.fractionaliseToken(20, parseEther('3000')); // 1k initial price
    
    expect(await priviMarket.sellOrderCount()).eq(beforeOrderCount.add(3));

    const orders = await priviMarket.getSellOrders();
    const order = orders[0];
    expect(order.holder).eq(deployer.address);
    expect(order.amount).eq(50);
    expect(order.price).eq(parseEther('1000'));
  });

  it("Buy fraction from account1", async() => {
    const beforePriviBalance = await privi.balanceOf(account1.address);
    const beforeFractionBalance = await fraction.balanceOf(account1.address);
    const sellOrder = (await priviMarket.getSellOrders())[0];
    await priviMarket.connect(account1).buyFraction(sellOrder.id);

    expect(await fraction.balanceOf(account1.address)).eq(beforeFractionBalance.add(sellOrder.amount));
    expect(await privi.balanceOf(account1.address)).eq(beforePriviBalance.sub(sellOrder.amount.mul(sellOrder.price)));
  });

  it("New buy order from account2", async() => {
    const beforeOrderCount = await priviMarket.buyOrderCount();
    const beforePriviBalance = await privi.balanceOf(account2.address);
    await priviMarket.connect(account2).newOrder(40, parseEther('950'), false);

    expect(await priviMarket.connect(account2).buyOrderCount()).eq(beforeOrderCount.add(1));
    expect(await privi.balanceOf(account2.address)).eq(beforePriviBalance.sub(parseEther('950').mul(40)));
  });

  it("Sell fraction from account1", async() => {
    const beforeOrderCount = await priviMarket.buyOrderCount();
    const beforeFractionBalance1 = await fraction.balanceOf(account1.address);
    const beforeFractionBalance2 = await fraction.balanceOf(account2.address);
    const beforePriviBalance = await privi.balanceOf(account1.address);
    const orders = await priviMarket.getBuyOrders();
    const order = orders[orders.length-1];
    
    await priviMarket.connect(account1).sellFraction(order.id);

    expect(await priviMarket.buyOrderCount()).eq(beforeOrderCount.sub(1));
    expect(await privi.balanceOf(account1.address)).eq(beforePriviBalance.add(order.amount.mul(order.price)));
    expect(await fraction.balanceOf(account1.address)).eq(beforeFractionBalance1.sub(order.amount));
    expect(await fraction.balanceOf(account2.address)).eq(beforeFractionBalance2.add(order.amount));
  });

  it("New sell order from account1", async() => {
    const beforeOrderCount = await priviMarket.sellOrderCount();
    const beforeFractionBalance = await fraction.balanceOf(account1.address);
    await priviMarket.connect(account1).newOrder(10, parseEther('1500'), true);

    expect(await priviMarket.connect(account1).sellOrderCount()).eq(beforeOrderCount.add(1));
    expect(await fraction.balanceOf(account1.address)).eq(beforeFractionBalance.sub(10));
  });

  it("Buy fraction from account2", async() => {
    const beforePriviBalance = await privi.balanceOf(account2.address);
    const beforeFractionBalance = await fraction.balanceOf(account2.address);
    const sellOrder = (await priviMarket.getSellOrders())[0];
    await priviMarket.connect(account2).buyFraction(sellOrder.id);

    expect(await fraction.balanceOf(account2.address)).eq(beforeFractionBalance.add(sellOrder.amount));
    expect(await privi.balanceOf(account2.address)).eq(beforePriviBalance.sub(sellOrder.amount.mul(sellOrder.price)));
  });
});
