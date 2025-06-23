// scripts/validateFlashloanSetup.js
require("dotenv").config();
const hre = require("hardhat");
const { ethers } = hre;

const network = hre.network.name;

const DAI =
  network === "polygon"
    ? "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"
    : "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1";

const DATA_PROVIDER =
  network === "polygon"
    ? "0x204fA2fCE3fCB6828a0e62DB7163E1cF179D0610"
    : process.env.UI_POOL_DATA_PROVIDER_ARBITRUM;

const POOL_PROVIDER =
  network === "polygon"
    ? process.env.POOL_ADDRESS_PROVIDER_POLYGON
    : process.env.POOL_ADDRESS_PROVIDER_ARBITRUM;

const PROFITBOT_ADDRESS =
  network === "polygon"
    ? process.env.PROFITBOT_ADDRESS_POLYGON
    : process.env.PROFITBOT_ADDRESS_ARBITRUM;

if (!DATA_PROVIDER || !POOL_PROVIDER) {
  console.error(`❌ Missing data provider or pool provider for ${network}`);
  process.exit(1);
}

if (!PROFITBOT_ADDRESS) {
  console.error(`❌ Missing PROFITBOT_ADDRESS in .env for ${network}`);
  process.exit(1);
}

// Minimal ABI just to get reserves list + reserve data
const ABI = [
  "function getReservesList() external view returns (address[])",
  "function getReserveData(address asset) external view returns ((uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt, uint256 availableLiquidity))"
];

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC);
  const dataProvider = new ethers.Contract(DATA_PROVIDER, ABI, provider);
  const reserves = await dataProvider.getReservesList();

  if (!reserves.includes(DAI.toLowerCase())) {
    console.error("❌ DAI not found in reserves list.");
    return;
  }

  const reserveData = await dataProvider.getReserveData(DAI);
  console.log(`✅ Found DAI in Aave V3 reserves on ${network}`);
  console.log("• Available Liquidity:", ethers.formatUnits(reserveData.availableLiquidity, 18));

  // Optional check for your bot
  const bot = await ethers.getContractAt("IFlashLoanSimpleReceiver", PROFITBOT_ADDRESS);
  const ok = typeof bot.executeOperation === "function";
  console.log("🔁 ProfitBot Interface check:", ok ? "✅ executeOperation found" : "❌ Method missing");
}

main().catch((err) => {
  console.error("❌ Script error:", err);
  process.exit(1);
});

