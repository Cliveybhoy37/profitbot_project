const hre = require("hardhat");
const { ethers } = hre;

const USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const WETH = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";

const UNISWAP_ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";
const SUSHISWAP_ROUTER = "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506";

const testSteps = [100, 500, 1000, 2500, 5000];

async function checkSwap(routerAddr, name, amountIn) {
  const router = await ethers.getContractAt("IUniswapV2Router02", routerAddr);
  try {
    const toWETH = await router.getAmountsOut(amountIn, [USDC, WETH]);
    const toUSDC = await router.getAmountsOut(toWETH[1], [WETH, USDC]);

    const inUSDC = ethers.formatUnits(amountIn, 6);
    const outUSDC = ethers.formatUnits(toUSDC[1], 6);
    const delta = parseFloat(outUSDC) - parseFloat(inUSDC);

    console.log(`🔁 ${name} | ${inUSDC} USDC → WETH → USDC = ${outUSDC} | Δ = ${delta.toFixed(6)} USDC`);
  } catch (err) {
    console.error(`❌ ${name} failed at ${ethers.formatUnits(amountIn, 6)} USDC:`, err.message);
  }
}

async function main() {
  for (const step of testSteps) {
    const amount = ethers.parseUnits(step.toString(), 6);
    console.log(`\n💥 Testing Flashloan Scale: ${step} USDC`);
    await checkSwap(UNISWAP_ROUTER, "Uniswap", amount);
    await checkSwap(SUSHISWAP_ROUTER, "Sushiswap", amount);
  }
}

main().catch((err) => {
  console.error("❌ Error:", err);
});

