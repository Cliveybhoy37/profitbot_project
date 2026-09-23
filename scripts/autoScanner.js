// scripts/autoScanner.js
require("dotenv").config();

const { ethers } = require("ethers");
const fs = require("fs");
const fetch = globalThis.fetch;
const { getBestQuote } = require("./utils/multiDexQuote");
const { fetchPolygonGas } = require("./utils/fetchPolygonGas");
const { toWeiSafe } = require("./utils/formatters");
const { tokenMap } = require("../helpers/tokenMap");

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const signer = false /* Execution disabled pending verified route, cost and contract simulation */
  ? new ethers.Wallet(process.env.PRIVATE_KEY, provider)
  : null;

const abi = JSON.parse(fs.readFileSync("./artifacts/contracts/ProfitBot.sol/ProfitBot.json")).abi;
const bot = new ethers.Contract(process.env.PROFITBOT_ADDRESS, abi, signer || provider);

const aaveOracle = new ethers.Contract(
  process.env.AAVE_ORACLE_POLYGON,
  ["function getAssetPrice(address) view returns (uint256)"],
  provider
);

const MIN_TRADE_USD = parseFloat(process.env.MIN_TRADE_USD || "0");

const addressToSymbol = Object.fromEntries(
  Object.entries(tokenMap)
    .filter(([, i]) => i && i.address)
    .map(([sym, i]) => [i.address.toLowerCase(), sym])
);

const routesFile = process.env.ROUTES_FILE || "./scripts/arb_routes.json";
const PAIRS = JSON.parse(fs.readFileSync(routesFile));

const AMT_SIZES = process.env.AMT_SIZES
  ? process.env.AMT_SIZES.split(",").map(s => s.trim())
  : ["250", "500", "1000", "2500", "5000"];

const MIN_USD_PFT = parseFloat(process.env.MIN_USD_PFT || "0.05");

async function build1559(overrideTipGwei) {
  const tipGwei = overrideTipGwei
    ? ethers.BigNumber.from(overrideTipGwei)
    : ethers.BigNumber.from(await fetchPolygonGas().then(g => g.proposeGas));

  const blk = await provider.getBlock("latest");
  const base = blk.baseFeePerGas;
  if (base.gt(ethers.utils.parseUnits("90", "gwei")))
    throw new Error("BASE_FEE_TOO_HIGH");

  const priority = ethers.utils.parseUnits(tipGwei.toString(), "gwei");
  const maxFee = base.add(priority).add(ethers.utils.parseUnits("5", "gwei"));

  return { maxFeePerGas: maxFee, maxPriorityFeePerGas: priority };
}

async function usdValue(addr, amount) {
  const pxRaw = await aaveOracle.getAssetPrice(addr);  // Aave returns price in 8 decimals
  const sym = addressToSymbol[addr.toLowerCase()];
  const decs = tokenMap[sym]?.decimals || 18;

  const px = ethers.utils.parseUnits("1", decs).mul(pxRaw).div(1e8);
  const valueUsd = parseFloat(ethers.utils.formatUnits(amount.mul(px).div(ethers.utils.parseUnits("1", decs)), decs));

  console.log(`🧪 usdValue debug:
    Token: ${sym}
    Address: ${addr}
    Amount (raw): ${amount.toString()}
    Price (raw px): ${pxRaw.toString()}
    Decimals: ${decs}
    USD Value: $${valueUsd}
  `);

  return valueUsd;
}

async function getMaticPx() {
  if (global.maticPx) return global.maticPx;
  try {
    const j = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=usd")
      .then(r => r.json());
    global.maticPx = j["matic-network"].usd || 0.8;
  } catch {
    global.maticPx = 0.8;
  }
  return global.maticPx;
}

(async () => {
  for (const [A, B, C] of PAIRS) {
    if (!tokenMap[A] || !tokenMap[B] || !tokenMap[C]) {
      console.warn(`⚠️  Missing token: ${A}/${B}/${C}`);
      continue;
    }

    if (A !== C) {
      console.log(`⛔  Route ${A}→${B}→${C} is a round-trip — skip`);
      continue;
    }

    const tA = tokenMap[A], tB = tokenMap[B], tC = tokenMap[C];
    const p1 = [tA.address, tB.address];
    const p2 = [tB.address, tC.address];

    for (const size of AMT_SIZES) {
      const amtIn = toWeiSafe(size, tA.decimals);

      try {
        const q1 = await getBestQuote(p1, amtIn, provider);
        if (q1.routeSummary) console.log(`🔍 Hop-1 route: ${A} → ${B} via ${q1.routeSummary}`);

        const q2 = await getBestQuote(p2, q1.amountOut, provider);
        if (q2.routeSummary) console.log(`🔍 Hop-2 route: ${B} → ${C} via ${q2.routeSummary}`);

        if (q1.amountOut.isZero() || q2.amountOut.isZero())
          throw new Error("zero quote");
        if (q1.amountOut.lt(toWeiSafe("0.000001", tB.decimals)))
          throw new Error("tiny quote");

        if (q1.dex && q2.dex && q1.dex === q2.dex) {
          console.log(`🔸 ${A}/${B}/${C} same-DEX ${q1.dex} – skip`);
          continue;
        }

        const inUsd = await usdValue(tA.address, amtIn);
        const outUsd = await usdValue(tC.address, q2.amountOut);
        const deltaUsd = outUsd - inUsd;

        if (deltaUsd < MIN_TRADE_USD) {
          console.log(`🧹 Profit $${deltaUsd.toFixed(2)} below MIN_TRADE_USD ($${MIN_TRADE_USD}) — skip`);
          continue;
        }

        let feeData;
        try {
          feeData = await build1559(process.env.GAS_OVERRIDE_GWEI);
        } catch (e) {
          if (e.message === "BASE_FEE_TOO_HIGH") {
            console.log("⛽  baseFee > 90 gwei — skip");
            continue;
          }
          throw e;
        }

        const gasUsd = parseFloat(
          ethers.utils.formatEther(
            ethers.BigNumber.from(500_000).mul(feeData.maxFeePerGas)
          )
        ) * await getMaticPx();

        const netUsd = deltaUsd - gasUsd;
        // Quote costs, flashloan premium and slippage are not fully verified here.
        console.warn("⛔ Candidate unverified: flashloan fee, execution fees, price impact and slippage require validation");

        // 🔧 ENHANCED PROFIT DEBUG LOG
        console.log(`🔧 GAS: $${gasUsd.toFixed(3)}, GROSS_PROFIT: $${deltaUsd.toFixed(3)}, NET_PROFIT: $${netUsd.toFixed(3)}`);

        if (netUsd < MIN_USD_PFT) {
          console.log(`🧹 Profit $${netUsd.toFixed(2)} below MIN_USD_PFT ($${MIN_USD_PFT}) — skip`);
          continue;
        }

        const hopSlip = ["DAI", "USDC", "USDT", "MAI"].includes(A) ? 1 : 1.5;
        const min1 = q1.amountOut.mul(100 - hopSlip).div(100);
        const min2 = q2.amountOut.mul(100 - hopSlip).div(100);

        const params = ethers.utils.defaultAbiCoder.encode(
          ["address", "uint256", "address[]", "address[]", "uint256", "uint256"],
          [tA.address, amtIn, p1, p2, min1, min2]
        );

        if (!signer) {
          try {
            const estGas = await bot.estimateGas.initiateFlashloan(tA.address, amtIn, params);
            const usd = parseFloat(ethers.utils.formatEther(estGas.mul(feeData.maxFeePerGas))) * await getMaticPx();
            console.log(`⛽  ${estGas.toString()} @ ${feeData.maxFeePerGas.toString()} (~$${usd.toFixed(2)})`);
          } catch (err) {
            console.warn("⚠️  gas-estimate failed:", err.reason || err.message);
          }
        } else {
          const tx = await bot.initiateFlashloan(tA.address, amtIn, params, feeData);
          console.log(`🚀 Tx: ${tx.hash}`);
          await tx.wait();
          console.log("✅ Tx confirmed.");
        }

      } catch (e) {
        console.warn(`❌  ${A}→${B}→${C} failed: ${e.message}`);
      }
    }
  }
})();

