const hre = require("hardhat");
const { ethers } = hre;

const ONEINCH = "0x9c2c5fd7b07e95ee044ddeba0e97a665f142394f"; // 1INCH on Polygon
const USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

// ✅ Routers
const UNISWAP_ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";
const SUSHISWAP_ROUTER = "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506";

// ✅ Test values
const testSteps = [10, 25, 50, 100, 200, 300]; // In 1INCH units

async function checkSwap(routerAddr, name, amountIn) {
  const router = await ethers.getContractAt("IUniswapV2Router02", routerAddr);
  try {
    const toUSDC = await router.getAmountsOut(amountIn, [ONEINCH, USDC]);
    const to1INCH = await router.getAmountsOut(toUSDC[1], [USDC, ONEINCH]);

    const in1INCH = ethers.formatUnits(amountIn, 18);
    const out1INCH = ethers.formatUnits(to1INCH[1], 18);
    const delta = parseFloat(out1INCH) - parseFloat(in1INCH);

    console.log(`🔁 ${name} | ${in1INCH} 1INCH → USDC → 1INCH = ${out1INCH} | Δ = ${delta.toFixed(6)} 1INCH`);
  } catch (err) {
    console.error(`❌ ${name} route failed at ${ethers.formatUnits(amountIn, 18)} 1INCH:`, err.message);
  }
}

async function main() {
  for (const step of testSteps) {
    const amount = ethers.parseUnits(step.toString(), 18); // 1INCH uses 18 decimals
    console.log(`\n💥 Testing Flashloan Scale: ${step} 1INCH`);
    await checkSwap(UNISWAP_ROUTER, "Uniswap", amount);
    await checkSwap(SUSHISWAP_ROUTER, "Sushiswap", amount);
  }
}

main().catch((err) => {
  console.error("❌ Error in testRoutes_1inch.js:", err);
});

