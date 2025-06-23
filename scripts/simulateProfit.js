require("dotenv").config();
const fs = require("fs");
const { ethers } = require("ethers");

// Handle CLI flag for --use-0x
const use0x = process.argv.includes("--use-0x");
process.env.USE_0X_ENV = use0x ? "true" : "false";

const { tokenMap } = require("../helpers/tokenMap");

const ROUTES_PATH = "./arb_routes.json";
const PROFITABLE_ROUTES_PATH = "./cache/profitable_routes.json";

const BASE_GAS = 210_000;
const GAS_PRICE_GWEI = 60;
const MATIC_PRICE_USD = 0.75;

const FACTORY_ADDRESS = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const factoryAbi = [
  "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)"
];

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const factory = new ethers.Contract(FACTORY_ADDRESS, factoryAbi, provider);
const FEE_TIERS = [500, 3000, 10000];

const POLYGON_GAS_COST = (gasUsed) =>
  ethers.utils.formatUnits((BigInt(gasUsed) * BigInt(GAS_PRICE_GWEI) * BigInt(1e9)).toString(), "ether");

const routes = JSON.parse(fs.readFileSync(ROUTES_PATH));
const profitableRoutes = [];

let best = { route: null, netProfit: -Infinity };
let totalNet = 0;

async function hasAnyUniV3Pool(tokenA, tokenB) {
  for (const fee of FEE_TIERS) {
    const pool = await factory.getPool(tokenA, tokenB, fee);
    if (pool !== ethers.constants.AddressZero) return true;
  }
  return false;
}

async function simulateRoute([symA, symB, symC]) {
  const A = tokenMap[symA];
  const B = tokenMap[symB];
  const C = tokenMap[symC];

  if (!A || !B || !C) {
    console.warn(`⚠️ Skipping unsupported route: ${symA} → ${symB} → ${symC}`);
    return;
  }

  const hasPoolAB = await hasAnyUniV3Pool(A.address, B.address);
  const hasPoolBC = await hasAnyUniV3Pool(B.address, C.address);

  if (!hasPoolAB && !hasPoolBC) {
    console.log(`⏭️ Skipping ${symA} → ${symB} → ${symC}: No UniV3 pools`);
    return;
  }

  const inputAmount = 1000;
  const grossOutput = inputAmount * (1 + Math.random() * 0.25 - 0.1);
  const slippage = Math.random() * 0.03;
  const outputAfterSlippage = grossOutput * (1 - slippage);

  const gasUsed = BASE_GAS + Math.floor(Math.random() * 50_000);
  const gasCostMATIC = parseFloat(POLYGON_GAS_COST(gasUsed));
  const gasCostUSD = gasCostMATIC * MATIC_PRICE_USD;

  const netProfit = outputAfterSlippage - inputAmount - gasCostUSD;
  totalNet += netProfit;

  const emoji = netProfit > 0 ? "✅" : "❌";
  const flag = netProfit > 1000 ? "🚨 Unrealistic?" : "";

  console.log(`${emoji} ${symA} → ${symB} → ${symC}: Δ $${netProfit.toFixed(4)} (gas ~$${gasCostUSD.toFixed(2)}) ${flag}`);

  if (netProfit > best.netProfit) best = { route: [symA, symB, symC], netProfit };
  if (netProfit > 0) profitableRoutes.push([symA, symB, symC]);
}

(async function main() {
  console.log(`🔍 Simulating ${routes.length} routes...`);
  if (use0x) {
    console.log("🌐 Using .env.auto.0x filtered tokens");
  } else {
    console.log("🌐 Using .env.auto filtered tokens");
  }

  for (const route of routes) {
    await simulateRoute(route);
  }

  fs.writeFileSync(PROFITABLE_ROUTES_PATH, JSON.stringify(profitableRoutes, null, 2));
  console.log(`\n✅ ${profitableRoutes.length} profitable routes saved to ${PROFITABLE_ROUTES_PATH}`);

  const avgNet = totalNet / routes.length;
  console.log(`📈 Best: ${best.route ? best.route.join(" → ") : "undefined"} → Δ $${best.netProfit.toFixed(4)}`);
  console.log(`📊 Average Δ: $${avgNet.toFixed(4)}\n`);
})();

