// bot.js
require("dotenv").config();
const fs = require("fs");
const { ethers } = require("ethers");

const PROFITABLE_ROUTES_PATH = "./cache/profitable_routes.json";
const DRY_MODE = process.argv.includes("--dry");

if (!fs.existsSync(PROFITABLE_ROUTES_PATH)) {
  console.error("❌ No profitable routes found. Run simulateProfit.js first.");
  process.exit(1);
}

const routes = JSON.parse(fs.readFileSync(PROFITABLE_ROUTES_PATH));
if (routes.length === 0) {
  console.warn("⚠️ No routes to simulate.");
  process.exit(0);
}

console.log(`🤖 Starting ${DRY_MODE ? "dry" : "live"} bot simulation for ${routes.length} route(s)...\n`);

const BASE_GAS = 210_000;
const GAS_PRICE_GWEI = 60;
const POLYGON_GAS_COST = (gasUsed) =>
  ethers.utils.formatUnits((BigInt(gasUsed) * BigInt(GAS_PRICE_GWEI) * BigInt(1e9)).toString(), "ether");

const symbolToAddress = {
  DAI: process.env.DAI_POLYGON,
  USDC: process.env.USDC_POLYGON,
  USDT: process.env.USDT_POLYGON,
  AAVE: process.env.AAVE_POLYGON,
  WETH: process.env.WETH_POLYGON,
  WMATIC: process.env.WMATIC_POLYGON,
  WSTETH: process.env.WSTETH_POLYGON,
  BAL: process.env.BAL_POLYGON,
  LINK: process.env.LINK_POLYGON,
  CRV: process.env.CRV_POLYGON,
  FRAX: process.env.FRAX_POLYGON,
  SNX: process.env.SNX_POLYGON,
  YFI: process.env.YFI_POLYGON,
  UNI: process.env.UNI_POLYGON,
  MKR: process.env.MKR_POLYGON,
  SUSHI: process.env.SUSHI_POLYGON
};

const symbolDecimals = {
  DAI: 18,
  USDC: 6,
  USDT: 6,
  AAVE: 18,
  WETH: 18,
  WMATIC: 18,
  WSTETH: 18,
  BAL: 18,
  LINK: 18,
  CRV: 18,
  FRAX: 18,
  SNX: 18,
  YFI: 18,
  UNI: 18,
  MKR: 18,
  SUSHI: 18
};

let best = { route: null, netProfit: -Infinity };
let totalNet = 0;

for (const route of routes) {
  const [A, B, C] = route;
  const inputAmount = 1000;
  const grossOutput = inputAmount * (1 + Math.random() * 0.15 - 0.05); // simulate ±5–15%
  const slippage = Math.random() * 0.03; // simulate up to 3%
  const outputAfterSlippage = grossOutput * (1 - slippage);

  const gasUsed = BASE_GAS + Math.floor(Math.random() * 50_000);
  const gasCostMATIC = parseFloat(POLYGON_GAS_COST(gasUsed));
  const maticPriceUSD = 0.75;
  const gasCostUSD = gasCostMATIC * maticPriceUSD;

  const netProfit = outputAfterSlippage - inputAmount - gasCostUSD;
  totalNet += netProfit;

  if (netProfit > best.netProfit) best = { route, netProfit };

  const logLabel = netProfit > 0 ? "✅" : "❌";
  const unrealistic = netProfit > 5000 ? "🚨 Unrealistic?" : "";

  console.log(`${logLabel} ${A} → ${B} → ${C}: Δ ${netProfit.toFixed(4)} (gas: ~$${gasCostUSD.toFixed(2)}) ${unrealistic}`);
}

const avgNet = totalNet / routes.length;

console.log(`\n🏁 Best route: ${best.route?.join(" → ")} (Δ ${best.netProfit.toFixed(4)})`);
console.log(`📊 Avg net profit: ${avgNet.toFixed(4)}\n`);

if (!DRY_MODE) {
  console.warn("⚠️ LIVE execution mode not implemented. Only --dry is supported.");
}

