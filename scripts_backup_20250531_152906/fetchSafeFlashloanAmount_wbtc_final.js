const hre = require("hardhat");
const { ethers } = hre;
const IPool = require("@aave/core-v3/artifacts/contracts/interfaces/IPool.sol/IPool.json");

const AAVE_POOL = "0x5342C2c22B65A4cC0C06A34B085c72C4029F66c5";
const WBTC = "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6";

async function main() {
  const [signer] = await ethers.getSigners();
  const pool = new ethers.Contract(AAVE_POOL, IPool.abi, signer);

  const reserveData = await pool.getReserveData(WBTC);
  const rawAvailable = reserveData.availableLiquidity;

  const formatted = parseFloat(ethers.formatUnits(rawAvailable, 8));
  const safeLoan = Math.min(formatted * 0.8, 10); // Cap at 10 WBTC
  const safeAmount = ethers.parseUnits(safeLoan.toFixed(8), 8);

  console.log(`✅ Safe Flashloan Amount: ${safeLoan.toFixed(8)} WBTC`);
  console.log(`🔢 Hex Format: ${safeAmount.toString()}`);
  console.log(`📋 Use in interact_flashloan.js:\n\nconst AMOUNT = ethers.parseUnits("${safeLoan.toFixed(8)}", 8);`);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});

