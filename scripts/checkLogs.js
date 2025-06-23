const hre = require("hardhat");
const { ethers } = hre;

const PROFITBOT_ADDRESS = "0xA0a465878028dfe487ED3da10Ba06267DDEA1C98";

async function main() {
  const iface = new ethers.Interface([
    "event ProfitRealized(address token, uint256 profit)",
    "event NoProfit(address token, uint256 endBalance)",
    "event SwapExecuted(string stage, uint256 amountIn, uint256 amountOut)" // ✅ New
  ]);

  const logs = await ethers.provider.getLogs({
    address: PROFITBOT_ADDRESS,
    fromBlock: 0,
    toBlock: "latest",
  });

  console.log(`📜 Decoding logs from ProfitBot...`);

  logs.forEach((log) => {
    try {
      const parsed = iface.parseLog(log);
      console.log(`🧾 ${parsed.name}:`, parsed.args);
    } catch (err) {
      // Skip unrelated logs
    }
  });
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});

