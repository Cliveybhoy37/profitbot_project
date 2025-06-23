require("dotenv").config();
const { ethers } = require("ethers");

const checks = [
  ["PROFITBOT_ADDRESS", process.env.PROFITBOT_ADDRESS],
  ["PRIVATE_KEY", process.env.PRIVATE_KEY],
  ["RPC_URL", process.env.RPC_URL],
  ["ZEROX_API_KEY", process.env.ZEROX_API_KEY],
  ["DAI_POLYGON", process.env.DAI_POLYGON],
  ["USDC_POLYGON", process.env.USDC_POLYGON],
  ["WETH_POLYGON", process.env.WETH_POLYGON],
  ["PROFIT_THRESHOLD", process.env.PROFIT_THRESHOLD],
];

let fail = false;

console.log("🔍 ENVIRONMENT CHECK\n----------------------");

for (const [label, val] of checks) {
  if (!val) {
    console.error(`❌ ${label} is missing`);
    fail = true;
  } else {
    console.log(`✅ ${label}`);
  }
}

if (fail) {
  console.error("\n❌ Environment incomplete. Fix .env before proceeding.");
  process.exit(1);
} else {
  console.log("\n✅ All required environment variables are present.");
}

