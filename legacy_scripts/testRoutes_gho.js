const hre = require("hardhat");
const { ethers } = hre;

const GHO = "0x3eD3B47Dd13EC9a98b44e6204A523E766B225811"; // GHO token on Polygon
const USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"; // USDC

const UNISWAP_ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";
const SUSHISWAP_ROUTER = "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506";

const testSteps = [100, 500, 1000, 2500, 5000];

async function checkSwap(routerAddr, name, amountIn) {
  const router = await ethers.getContractAt("IUniswapV2Router02", routerAddr);
  try {
    const toUSDC = await router.getAmountsOut(amountIn, [GHO, USDC]);
    const toGHO = await router.getAmountsOut(toUSDC[1], [USDC, GHO]);

    const inGHO = ethers.formatUnits(amountIn, 18);
    const outGHO = ethers.formatUnits(toGHO[1], 18);
    const delta = parseFloat(outGHO) - parseFloat(inGHO);

    console.log(`🔁 ${name} | ${inGHO} GHO → USDC → GHO = ${outGHO} | Δ = ${delta.toFixed(6)} GHO`);
  } catch (err) {
    console.error(`❌ ${name} route failed at ${ethers.formatUnits(amountIn, 18)} GHO:`, err.message);
  }
}

async function main() {
  for (const step of testSteps) {
    const amount = ethers.parseUnits(step.toString(), 18);
    console.log(`\n💥 Testing Flashloan Scale: ${step} GHO`);
    await checkSwap(UNISWAP_ROUTER, "Uniswap", amount);
    await checkSwap(SUSHISWAP_ROUTER, "Sushiswap", amount);
  }
}

main().catch((err) => {
  console.error("❌ Error:", err);
});

