// scripts/testSingleFlashloan.js
require("dotenv").config();
const { runFlashloan } = require("./interact_flashloan");

// DAI address on Polygon
const DAI_ADDRESS = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";

// Choose a safe test amount within current liquidity (e.g., 100 DAI)
const TEST_AMOUNT = 100;

async function main() {
  await runFlashloan(DAI_ADDRESS, TEST_AMOUNT);
}

main().catch((err) => {
  console.error("❌ Test flashloan failed:", err);
  process.exit(1);
});

