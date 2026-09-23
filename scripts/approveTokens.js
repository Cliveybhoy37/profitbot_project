throw new Error("Legacy transaction script disabled pending audited simulation and owner review");
// scripts/approveTokens.js
require("dotenv").config();
const { ethers, network } = require("hardhat");

const TOKEN_MAP = {
  polygon: {
    DAI: process.env.DAI_POLYGON,
    USDC: process.env.USDC_POLYGON,
    WETH: process.env.WETH_POLYGON,
    WBTC: process.env.WBTC_POLYGON,
    WSTETH: process.env.WSTETH_POLYGON,
  },
  arbitrum: {
    DAI: process.env.DAI_ARBITRUM,
    USDC: process.env.USDC_ARBITRUM,
    WETH: process.env.WETH_ARBITRUM,
    WBTC: process.env.WBTC_ARBITRUM,
    WSTETH: process.env.WSTETH_ARBITRUM,
  },
};

async function main() {
  const [signer] = await ethers.getSigners();
  const chain = network.name;
  const tokens = TOKEN_MAP[chain];

  const PROFITBOT_ADDRESS = process.env[`PROFITBOT_ADDRESS_${chain.toUpperCase()}`];
  if (!PROFITBOT_ADDRESS) throw new Error(`Missing PROFITBOT_ADDRESS_${chain.toUpperCase()} in .env`);

  console.log(`📝 Approving tokens for ProfitBot: ${PROFITBOT_ADDRESS}`);

  for (const [symbol, address] of Object.entries(tokens)) {
    if (!address) {
      console.warn(`⚠️ Missing address for ${symbol} on ${chain}`);
      continue;
    }

    const token = await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
      address
    );

    const amount = ethers.constants.MaxUint256;
    const currentAllowance = await token.allowance(signer.address, PROFITBOT_ADDRESS);

    if (currentAllowance.gte(amount)) {
      console.log(`✅ Already approved: ${symbol}`);
      continue;
    }

    const tx = await token.approve(PROFITBOT_ADDRESS, amount);
    console.log(`⏳ Approving ${symbol}... TX: ${tx.hash}`);
    await tx.wait();
    console.log(`✅ Approved ${symbol}`);
  }

  console.log("🏁 Approvals complete.");
}

main().catch((err) => {
  console.error("❌ Error during token approvals:", err);
  process.exit(1);
});

