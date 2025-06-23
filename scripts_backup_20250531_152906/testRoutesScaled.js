const hre = require("hardhat");
const { ethers } = hre;

const WETH = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
const USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const WMATIC = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";

const UNISWAP_ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";
const SUSHISWAP_ROUTER = "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506";

const steps = [1, 25, 50, 75, 100, 150, 200, 300, 400, 500];

async function runCheck(routerAddr, routerName, amount) {
  const router = await ethers.getContractAt("IUniswapV2Router02", routerAddr);
  try {
    const toUSDC = await router.getAmountsOut(amount, [WETH, WMATIC, USDC]);
    const toWETH = await router.getAmountsOut(toUSDC[2], [USDC, WMATIC, WETH]);

    const outUSDC = ethers.formatUnits(toUSDC[2], 6);
    const outWETH = ethers.formatUnits(toWETH[2], 18);
    const inWETH = ethers.formatUnits(amount, 18);
    const delta = parseFloat(outWETH) - parseFloat(inWETH);

    console.log(`🔁 ${routerName} | ${inWETH} WETH → USDC → WETH = ${outWETH} WETH | Δ = ${delta.toFixed(6)}`);
  } catch (err) {
    console.error(`❌ ${routerName} failed for ${ethers.formatUnits(amount, 18)} WETH:`, err.message);
  }
}

async function main() {
  for (const step of steps) {
    const amount = ethers.parseUnits(step.toString(), 18);
    console.log(`\n💥 Testing Flashloan Scale: ${step} WETH`);
    await runCheck(UNISWAP_ROUTER, "Uniswap", amount);
    await runCheck(SUSHISWAP_ROUTER, "Sushiswap", amount);
  }
}

main().catch((err) => {
  console.error("❌ Error running testRoutesScaled.js:", err);
});

