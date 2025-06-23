// scripts/checkPairLiquidity.js
const hre = require("hardhat");
const { ethers } = hre;

const FACTORY = "0x5757371414417b8c6caad45baef941abc7d3ab32"; // UniswapV2 (QuickSwap)
const TOKEN_A = "0x9c2C5fd7b07E95EE044DDeba0e97a665F142394f"; // 1INCH
const TOKEN_B = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"; // USDC

async function main() {
  const factory = await ethers.getContractAt("IUniswapV2Factory", FACTORY);
  const pairAddress = await factory.getPair(TOKEN_A, TOKEN_B);

  if (pairAddress === ethers.ZeroAddress) {
    console.log("❌ No pair exists for 1INCH ↔ USDC");
    return;
  }

  console.log("✅ Pair address:", pairAddress);

  const pair = await ethers.getContractAt("IUniswapV2Pair", pairAddress);
  const reserves = await pair.getReserves();

  console.log("🔍 Reserves:");
  console.log("Reserve0:", reserves[0].toString());
  console.log("Reserve1:", reserves[1].toString());
}

main().catch((err) => {
  console.error("❌ Error:", err);
});

