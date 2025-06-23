require("dotenv").config();
const fs = require("fs");
const readline = require("readline");
const prompt = require("prompt-sync")({ sigint: true });

const envFile = ".env";

const requiredKeys = [
  "PRIVATE_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "PROFITBOT_ADDRESS_POLYGON",
  "PROFITBOT_ADDRESS_ARBITRUM",
  "AAVE_ORACLE_POLYGON",
  "DATA_PROVIDER_POLYGON",
  "DATA_PROVIDER_ARBITRUM",
  "POOL_ADDRESS_PROVIDER",
  "POLYGONSCAN_API_KEY",
  "RPC_PROVIDER",
  "ALCHEMY_POLYGON",
  "ALCHEMY_ARBITRUM",
  "ALCHEMY_OPTIMISM",
  "INFURA_POLYGON",
  "INFURA_ARBITRUM",
  "INFURA_OPTIMISM",
  "INFURA_MAINNET",
  "POLYGON_RPC",
  "ARBITRUM_RPC",
  "OPTIMISM_RPC",
  "ETHEREUM_RPC",
  "PROFIT_THRESHOLD",
  "MAX_SLIPPAGE",
  "FLASHLOAN_AMOUNT_DAI",
  "FLASHLOAN_AMOUNT_USDC",
  "FLASHLOAN_AMOUNT_WETH",
  "FLASHLOAN_AMOUNT_WBTC",
  "FLASHLOAN_CAP_DAI",
  "FLASHLOAN_CAP_USDC",
  "FLASHLOAN_CAP_WETH",
];

const optionalKeys = {
  FLASHLOAN_TOKEN: "DAI",
};

// ✅ Check for required keys
const missing = requiredKeys.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error("❌ Missing required .env keys:");
  missing.forEach((key) => console.error(`  - ${key}`));
  process.exit(1);
}

// ✅ Detect blank optional keys
const optionalToFill = [];
for (const [key, fallback] of Object.entries(optionalKeys)) {
  if (key in process.env && process.env[key].trim() === "") {
    optionalToFill.push({ key, fallback });
  }
}

// 🛠 Prompt to fix empty optional keys
if (optionalToFill.length > 0) {
  console.warn("⚠️ Optional keys are present but empty:");
  optionalToFill.forEach(({ key, fallback }) =>
    console.warn(`  - ${key}= (suggest default: ${key}=${fallback})`)
  );

  const answer = prompt("✳️ Auto-fill missing optional keys with defaults? (y/N): ");
  if (answer.trim().toLowerCase() === "y") {
    let envText = fs.readFileSync(envFile, "utf8");

    optionalToFill.forEach(({ key, fallback }) => {
      const regex = new RegExp(`^${key}=.*$`, "m");
      const newLine = `${key}=${fallback}`;
      envText = envText.replace(regex, newLine);
    });

    fs.writeFileSync(envFile, envText, "utf8");
    console.log("✅ Optional keys updated in .env");
  } else {
    console.log("ℹ️ Skipped auto-filling. You can update manually.");
  }
}

console.log("✅ All required .env keys are present.");

