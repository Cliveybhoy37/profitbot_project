const { ethers } = require("hardhat");
const assert = require("node:assert/strict");

const config = require("../scripts/utils/polygonProfitBotConfig");
const {
  buildProfitBotConstructorArgs
} = require("../scripts/utils/polygonProfitBotDeployment");

describe("Polygon fork ProfitBot deployment", function () {
  it("deploys the current ProfitBot with canonical Polygon configuration", async function () {
    const [deployer] = await ethers.getSigners();

    const Bot = await ethers.getContractFactory("ProfitBot");
    const bot = await Bot.deploy(
      ...buildProfitBotConstructorArgs(config)
    );
    await bot.deployed();

    const aaveProvider = await ethers.getContractAt(
      ["function getPool() view returns (address)"],
      config.addressesProvider
    );
    const expectedPool = await aaveProvider.getPool();

    assert.equal(
      (await bot.owner()).toLowerCase(),
      deployer.address.toLowerCase()
    );
    assert.equal(
      (await bot.ADDRESSES_PROVIDER()).toLowerCase(),
      config.addressesProvider.toLowerCase()
    );
    assert.equal(
      (await bot.POOL()).toLowerCase(),
      expectedPool.toLowerCase()
    );
    assert.equal(
      (await bot.quickSwapRouter()).toLowerCase(),
      config.quickSwapRouter.toLowerCase()
    );
    assert.equal(
      (await bot.sushiSwapRouter()).toLowerCase(),
      config.sushiSwapRouter.toLowerCase()
    );
    assert.equal(
      (await bot.uniswapV3Router()).toLowerCase(),
      config.uniswapV3Router.toLowerCase()
    );
    assert.equal(
      (await bot.balancerVault()).toLowerCase(),
      config.balancerVault.toLowerCase()
    );

    const code = await ethers.provider.getCode(bot.address);
    assert.notEqual(code, "0x");
  });
});
