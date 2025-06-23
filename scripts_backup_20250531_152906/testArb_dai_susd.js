const hre = require("hardhat");
const { ethers } = hre;

// Constants
const DAI = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
const SUSD = "0x9fB83c0635De2E815fd1c21b3a292277540C2e8d";

// Routers
const UNISWAP_ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff"; // QuickSwap (Uniswap fork)
const KYBER_ROUTER = "0x546C79662E028B661dFB4767664d0273184E4dD1"; // KyberSwap classic

const FLASHLOAN_AMOUNT = ethers.parseUnits("100", 18);
const REPAY_AMOUNT = ethers.parseUnits("100.09", 18);

async function getAmounts(routerAddress, path, amountIn) {
  const router = await ethers.getContractAt("IUniswapV2Router02", routerAddress);
  const amountsOut = await router.getAmountsOut(amountIn, path);
  return amountsOut[amountsOut.length - 1];
}

async function main() {
  console.log("🔍 Simulating Arbitrage...");

  // Step 1: Swap 100 DAI → sUSD on Uniswap
  const susdOut = await getAmounts(UNISWAP_ROUTER, [DAI, SUSD], FLASHLOAN_AMOUNT);
  console.log(`🔁 Uniswap: 100 DAI → ${ethers.formatUnits(susdOut, 18)} sUSD`);

  // Step 2: Swap sUSD → DAI on Kyberswap
  const daiBack = await getAmounts(KYBER_ROUTER, [SUSD, DAI], susdOut);
  console.log(`🔁 Kyberswap: ${ethers.formatUnits(susdOut, 18)} sUSD → ${ethers.formatUnits(daiBack, 18)} DAI`);

  // Step 3: Compare to repayment
  const profit = daiBack.sub(REPAY_AMOUNT);
  const profitFloat = parseFloat(ethers.formatUnits(profit, 18));

  if (profit > 0) {
    console.log(`✅ PROFITABLE: Estimated Profit = ${profitFloat.toFixed(6)} DAI`);
  } else {
    console.log(`❌ NOT PROFITABLE: Shortfall = ${profitFloat.toFixed(6)} DAI`);
  }
}

main().catch((err) => {
  console.error("❌ Error running arb test:", err);
  process.exit(1);
});

