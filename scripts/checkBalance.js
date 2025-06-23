const hre = require("hardhat");
const { ethers } = hre;

const PROFITBOT_ADDRESS = "0xd9895bAb49CbbF482ca90265850d832c3aa5bad7";
const WETH = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
const USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

async function main() {
  const weth = await ethers.getContractAt("IERC20", WETH);
  const usdc = await ethers.getContractAt("IERC20", USDC);

  const wethBal = await weth.balanceOf(PROFITBOT_ADDRESS);
  const usdcBal = await usdc.balanceOf(PROFITBOT_ADDRESS);

  console.log("🤖 ProfitBot Balances:");
  console.log("💧 WETH:", ethers.formatUnits(wethBal, 18));
  console.log("💵 USDC:", ethers.formatUnits(usdcBal, 6));
}

main();

