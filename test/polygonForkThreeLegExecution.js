const { ethers } = require("hardhat");
const assert = require("node:assert/strict");

describe("Polygon fork three-leg execution", function () {
  const AAVE_PROVIDER = "0xa97684ead0e402dc232d5a977953df7ecbab3cdb";
  const QUICKSWAP_ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";
  const SUSHISWAP_ROUTER = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506";
  const UNISWAP_V3_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
  const BALANCER_VAULT = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

  const USDC_E = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
  const WBTC = "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6";
  const WPOL = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";

  const LOAN_AMOUNT = ethers.BigNumber.from("1000000");
  const LEG1_OUT = ethers.BigNumber.from("1181");
  const LEG2_OUT = ethers.BigNumber.from("9321029991304088712");
  const LEG3_OUT = ethers.BigNumber.from("1002137");

  const V3_FEE_500 = ethers.utils.hexZeroPad(
    ethers.utils.hexlify(500),
    32
  );

  function encodeRoute() {
    const legType =
      "tuple(uint8 venue,address tokenIn,address tokenOut,uint256 minAmountOut,bytes32 venueData)[]";

    return ethers.utils.defaultAbiCoder.encode(
      [legType],
      [[
        [2, USDC_E, WBTC, LEG1_OUT, V3_FEE_500],
        [1, WBTC, WPOL, LEG2_OUT, ethers.constants.HashZero],
        [2, WPOL, USDC_E, LEG3_OUT, V3_FEE_500]
      ]]
    );
  }

  it("executes the historical USDC.e -> WBTC -> WPOL -> USDC.e route", async function () {
    const Bot = await ethers.getContractFactory("ProfitBot");
    const bot = await Bot.deploy(
      AAVE_PROVIDER,
      QUICKSWAP_ROUTER,
      SUSHISWAP_ROUTER,
      UNISWAP_V3_ROUTER,
      BALANCER_VAULT
    );
    await bot.deployed();

    const usdc = await ethers.getContractAt(
      ["function balanceOf(address) view returns (uint256)"],
      USDC_E
    );

    const before = await usdc.balanceOf(bot.address);

    const tx = await bot.initiateFlashloan(
      USDC_E,
      LOAN_AMOUNT,
      encodeRoute()
    );
    const receipt = await tx.wait();

    const after = await usdc.balanceOf(bot.address);

    console.log("fork gasUsed:", receipt.gasUsed.toString());
    console.log("bot USDC.e before:", before.toString());
    console.log("bot USDC.e after:", after.toString());

    assert.equal(after.sub(before).toString(), "1637");
  });
});
