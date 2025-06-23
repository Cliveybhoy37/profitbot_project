// scripts/checkAllowances.js
require("dotenv").config();
const { ethers, network } = require("hardhat");

const TOKEN_MAP = {
  polygon: {
    USDC: process.env.USDC_POLYGON,
    WSTETH: process.env.WSTETH_POLYGON,
    DAI: process.env.DAI_POLYGON,
  },
};

async function main() {
  const [signer] = await ethers.getSigners();
  const chain = network.name;
  const tokens = TOKEN_MAP[chain];

  const PROFITBOT_ADDRESS = process.env[`PROFITBOT_ADDRESS_${chain.toUpperCase()}`];
  if (!PROFITBOT_ADDRESS) throw new Error(`❌ Missing PROFITBOT_ADDRESS for ${chain}`);

  console.log(`🔍 Checking allowances for ProfitBot: ${PROFITBOT_ADDRESS}\n`);

  for (const [symbol, address] of Object.entries(tokens)) {
    if (!address) {
      console.warn(`⚠️ Missing address for ${symbol}`);
      continue;
    }

    const token = await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
      address
    );

    const allowance = await token.allowance(signer.address, PROFITBOT_ADDRESS);
    const decimals = symbol === "USDC" ? 6 : 18;
    const formatted = ethers.utils.formatUnits(allowance, decimals);

    console.log(`✅ ${symbol} allowance → ${formatted}`);
  }

  console.log("\n🏁 Allowance check complete.");
}

main().catch((err) => {
  console.error("❌ Error checking allowances:", err);
  process.exit(1);
});

