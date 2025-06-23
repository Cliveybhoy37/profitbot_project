// scripts/watchDaiLiquidity.js
const hre = require("hardhat");
const { ethers } = hre;

const DAI = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
const AAVE_POOL = "0x5342C2c22B65A4cC0C06A34B085c72C4029F66c5";

let lastBalance = null;

async function checkLiquidity() {
  const token = await ethers.getContractAt("IERC20", DAI);
  const balance = await token.balanceOf(AAVE_POOL);
  const formatted = parseFloat(ethers.formatUnits(balance, 18));

  if (lastBalance === null) {
    console.log(`📊 Initial Aave DAI Balance: ${formatted.toFixed(4)} DAI`);
  } else if (formatted > lastBalance) {
    console.log(`🔼 Top-up detected! Balance increased to: ${formatted.toFixed(4)} DAI`);
  } else if (formatted < lastBalance) {
    console.log(`🔻 Withdrawal detected! Balance dropped to: ${formatted.toFixed(4)} DAI`);
  } else {
    console.log(`⏳ No change. Current balance: ${formatted.toFixed(4)} DAI`);
  }

  lastBalance = formatted;
}

// Run every 60 seconds
setInterval(checkLiquidity, 60 * 1000);

// Run once immediately
checkLiquidity();

