const hre = require("hardhat");
const { ethers } = hre;

const WETH = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
const USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const WMATIC = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
const AMOUNT = ethers.parseUnits("1", 18); // 1 WETH

const UNISWAP_ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";
const SUSHISWAP_ROUTER = "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506";

async function checkSwap(routerAddr, name) {
  const router = await ethers.getContractAt("IUniswapV2Router02", routerAddr);
  try {
    const toUSDC = await router.getAmountsOut(AMOUNT, [WETH, WMATIC, USDC]);
    console.log(`🔁 ${name} WETH → WMATIC → USDC: ${ethers.formatUnits(toUSDC[2], 6)} USDC`);

    const toWETH = await router.getAmountsOut(toUSDC[2], [USDC, WMATIC, WETH]);
    console.log(`🔁 ${name} USDC → WMATIC → WETH: ${ethers.formatUnits(toWETH[2], 18)} WETH`);
  } catch (err) {
    console.error(`❌ ${name} path failed:`, err.message);
  }
}

async function main() {
  await checkSwap(UNISWAP_ROUTER, "Uniswap");
  await checkSwap(SUSHISWAP_ROUTER, "Sushiswap");
}

main();

