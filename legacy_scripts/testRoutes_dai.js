const hre = require("hardhat");
const { ethers } = hre;

const DAI = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
const WETH = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";

const UNISWAP_ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";
const SUSHISWAP_ROUTER = "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506";

const testSteps = [100, 500, 1000, 2500, 5000];

async function checkSwap(routerAddr, name, amountIn) {
  const router = await ethers.getContractAt("IUniswapV2Router02", routerAddr);
  try {
    const toWETH = await router.getAmountsOut(amountIn, [DAI, WETH]);
    const toDAI = await router.getAmountsOut(toWETH[1], [WETH, DAI]);

    const inDAI = ethers.formatUnits(amountIn, 18);
    const outDAI = ethers.formatUnits(toDAI[1], 18);
    const delta = parseFloat(outDAI) - parseFloat(inDAI);

    console.log(`🔁 ${name} | ${inDAI} DAI → WETH → DAI = ${outDAI} | Δ = ${delta.toFixed(6)} DAI`);
  } catch (err) {
    console.error(`❌ ${name} failed at ${ethers.formatUnits(amountIn, 18)} DAI:`, err.message);
  }
}

async function main() {
  for (const step of testSteps) {
    const amount = ethers.parseUnits(step.toString(), 18);
    console.log(`\n💥 Testing Flashloan Scale: ${step} DAI`);
    await checkSwap(UNISWAP_ROUTER, "Uniswap", amount);
    await checkSwap(SUSHISWAP_ROUTER, "Sushiswap", amount);
  }
}

main().catch((err) => {
  console.error("❌ Error:", err);
});

