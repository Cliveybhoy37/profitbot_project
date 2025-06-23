require("dotenv").config();
const hre = require("hardhat");
const { ethers } = hre;

const DAI = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
const WETH = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";

const UNISWAP_ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";
const SUSHISWAP_ROUTER = "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506";

const AMOUNT_DAI = ethers.parseUnits(process.env.FLASHLOAN_AMOUNT_DAI || "500", 18);

async function main() {
  const uni = await ethers.getContractAt("IUniswapV2Router02", UNISWAP_ROUTER);
  const sushi = await ethers.getContractAt("IUniswapV2Router02", SUSHISWAP_ROUTER);

  try {
    const toWETH = await uni.getAmountsOut(AMOUNT_DAI, [DAI, WETH]);
    const toDAI = await sushi.getAmountsOut(toWETH[1], [WETH, DAI]);

    const finalOut = ethers.formatUnits(toDAI[1], 18);
    const initialIn = ethers.formatUnits(AMOUNT_DAI, 18);
    const profit = parseFloat(finalOut) - parseFloat(initialIn);

    console.log("🔁 Simulated Arbitrage:");
    console.log(`DAI → WETH → DAI`);
    console.log(`Input: ${initialIn} DAI`);
    console.log(`Output: ${finalOut} DAI`);
    console.log(`📈 Net Result: ${profit >= 0 ? "+" : ""}${profit.toFixed(6)} DAI`);
  } catch (err) {
    console.error("❌ Simulation failed:", err.message);
  }
}

main().catch((err) => {
  console.error("❌ Script error:", err);
  process.exit(1);
});

