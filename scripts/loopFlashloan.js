// scripts/loopFlashloan.js

require("dotenv").config();

// 🌐 CLI arg override
if (process.argv.includes("--use-0x")) {
  process.env.USE_0X_ENV = "true";
  console.log("🌐 CLI Override: Using .env.auto.0x");
}

require("child_process").execSync("node scripts/utils/envCheck.js", { stdio: "inherit" });

const { ethers } = require("ethers");
const fs = require("fs");
const tokenModule = require("../helpers/tokenMap");
let addressToTokenMap = tokenModule.addressToTokenMap;
const { getBestQuote } = require("./utils/multiDexQuote");

// 🔁 Optional fallback patch
if (!addressToTokenMap || Object.keys(addressToTokenMap).length === 0) {
  console.warn("⚠️ addressToTokenMap missing — regenerating on the fly.");
  addressToTokenMap = Object.fromEntries(
    Object.values(tokenModule)
      .filter((t) => typeof t === "object" && t.address)
      .map((t) => [t.address.toLowerCase(), t])
  );
}

const resolveToken = (addr) =>
  addressToTokenMap[addr?.toLowerCase?.()] || { symbol: "UNKNOWN", decimals: 18 };
const resolveTokenBySymbol = (symbol) => tokenModule[symbol];

const rawRoutes = JSON.parse(fs.readFileSync("./cache/profitable_routes.json", "utf-8"));
const routes = rawRoutes
  .map(([symbolIn, symbolMid, symbolOut]) => {
    const tokenIn = resolveTokenBySymbol(symbolIn);
    const tokenMid = resolveTokenBySymbol(symbolMid);
    const tokenOut = resolveTokenBySymbol(symbolOut);
    if (!tokenIn || !tokenMid || !tokenOut) {
      console.warn(`⚠️ Skipping route due to missing token: ${symbolIn}, ${symbolMid}, ${symbolOut}`);
      return null;
    }
    return { tokenIn, tokenMid, tokenOut };
  })
  .filter(Boolean);

const ABI = require("../artifacts/contracts/ProfitBot.sol/ProfitBot.json").abi;
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const profitBot = new ethers.Contract(process.env.PROFITBOT_ADDRESS, ABI, wallet);

const MIN_PROFIT_USD = ethers.utils.parseUnits(process.env.MIN_USD_PROFIT || "1", 18);
const MAX_SLIPPAGE_BPS = parseInt(process.env.MAX_SLIPPAGE || "100"); // Default: 1%
const GAS_PRICE_GWEI = 60;
const MATIC_PRICE_USD = 0.75;

function applySlippage(amountOut, bps) {
  return amountOut.mul(10000 - bps).div(10000);
}

async function quoteAndExecute({ tokenIn, tokenMid, tokenOut }) {
  const decimals = tokenIn.decimals || 18;
  const flashAmountEnvKey = `FLASHLOAN_AMOUNT_${tokenIn.symbol.toUpperCase()}`;
  const rawAmount = process.env[flashAmountEnvKey] || "10";
  const amountIn = ethers.utils.parseUnits(rawAmount, decimals);
  console.log(`🧪 Simulating with ${rawAmount} ${tokenIn.symbol}`);

  const capKey = `FLASHLOAN_CAP_${tokenIn.symbol.toUpperCase()}`;
  const maxCap = process.env[capKey] ? ethers.utils.parseUnits(process.env[capKey], decimals) : null;
  if (maxCap && amountIn.gt(maxCap)) {
    console.warn(`⚠️ Skipping ${tokenIn.symbol} due to cap limit.`);
    return;
  }

  const path1 = [tokenIn.address, tokenMid.address];
  const path2 = [tokenMid.address, tokenOut.address];

  try {
    const quote1 = await getBestQuote(path1, amountIn, provider);
    if (quote1.amountOut.isZero()) throw new Error(`No valid quote for ${tokenIn.symbol} → ${tokenMid.symbol}`);
    const midToken = resolveToken(path1[1]);
    console.log(`[DEX 1 - ${quote1.dex}] amountOut: ${ethers.utils.formatUnits(quote1.amountOut, midToken.decimals)} ${midToken.symbol}`);

    const quote2 = await getBestQuote(path2, quote1.amountOut, provider);
    if (quote2.amountOut.isZero()) throw new Error(`No valid quote for ${tokenMid.symbol} → ${tokenOut.symbol}`);
    const outToken = resolveToken(path2[1]);
    console.log(`[DEX 2 - ${quote2.dex}] amountOut: ${ethers.utils.formatUnits(quote2.amountOut, outToken.decimals)} ${outToken.symbol}`);

    const finalOut = quote2.amountOut;
    const expectedProfit = finalOut.sub(amountIn);

    console.log(`🔁 Route: ${tokenIn.symbol} → ${tokenMid.symbol} → ${tokenOut.symbol}`);
    console.log(`💰 Final Out: ${ethers.utils.formatUnits(finalOut, decimals)} ${tokenOut.symbol}`);
    console.log(`📊 Expected Profit: ${ethers.utils.formatUnits(expectedProfit, decimals)} ${tokenOut.symbol}`);

    if (expectedProfit.lt(MIN_PROFIT_USD)) {
      console.warn("⚠️ Skipping route, profit below threshold.\n");
      return;
    }

    const minOut1 = applySlippage(quote1.amountOut, MAX_SLIPPAGE_BPS);
    const minOut2 = applySlippage(finalOut, MAX_SLIPPAGE_BPS);

    const params = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256", "address[]", "address[]", "uint256", "uint256"],
      [tokenIn.address, amountIn, path1, path2, minOut1, minOut2]
    );

    if (process.env.DRY_RUN === "true") {
      const gasEstimate = await profitBot.estimateGas.initiateFlashloan(tokenIn.address, amountIn, params);
      const costMatic = parseFloat(ethers.utils.formatUnits(gasEstimate.mul(GAS_PRICE_GWEI).mul(1e9), "ether"));
      const costUSD = costMatic * MATIC_PRICE_USD;

      console.log(`🧪 DRY RUN MODE: Gas estimate = ${gasEstimate.toString()} (~$${costUSD.toFixed(2)} USD)`);
      console.log("⛔ Skipping actual execution.\n");
      return;
    }

    console.log("🚀 Executing flashloan...");
    const tx = await profitBot.initiateFlashloan(tokenIn.address, amountIn, params);
    console.log("⛓️ Tx sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Success! Block:", receipt.blockNumber, "\n");
  } catch (e) {
    console.error(`❌ Route failed: ${tokenIn.symbol} → ${tokenMid.symbol} → ${tokenOut.symbol}`);
    console.error(e.message || e);
  }
}

(async () => {
  for (const route of routes) {
    await quoteAndExecute(route);
  }
})();

