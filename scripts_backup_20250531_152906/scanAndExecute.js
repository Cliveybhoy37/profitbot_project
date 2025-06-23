require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const { fetchPolygonGas } = require("./utils/fetchPolygonGas");
const { getBestQuote } = require("./utils/multiDexQuote");
const { estimateGasCostUSD } = require("./utils/simulateFlashloan");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const IS_DRY_RUN = process.env.DRY_RUN === "true";
const PROFITBOT_ADDRESS = process.env.PROFITBOT_ADDRESS_POLYGON;
const abi = JSON.parse(fs.readFileSync("./artifacts/contracts/ProfitBot.sol/ProfitBot.json")).abi;
const contract = new ethers.Contract(PROFITBOT_ADDRESS, abi, signer);

const MIN_USD_PROFIT = parseFloat(process.env.MIN_USD_PROFIT || "0");
const rawRoutes = JSON.parse(fs.readFileSync("./arb_routes.json"));

const SYMBOL_TO_ADDRESS = {
  DAI: process.env.DAI_POLYGON,
  USDC: process.env.USDC_POLYGON,
  GHO: process.env.GHO_POLYGON,
  LUSD: process.env.LUSD_POLYGON,
  CRV: process.env.CRV_POLYGON,
  BAL: process.env.BAL_POLYGON,
  AAVE: process.env.AAVE_POLYGON,
  LINK: process.env.LINK_POLYGON,
  MKR: process.env.MKR_POLYGON,
  WETH: process.env.WETH_POLYGON,
  WBTC: process.env.WBTC_POLYGON,
  CBETH: process.env.cbETH_POLYGON,
  RETH: process.env.rETH_POLYGON,
  WSTETH_POLYGON: process.env.WSTETH_POLYGON
  FRAX: process.env.FRAX_POLYGON,
  USDT: process.env.USDT_POLYGON,
  MATIC: process.env.MATIC_POLYGON,
  UNI: process.env.UNI_POLYGON,
  SUSHI: process.env.SUSHI_POLYGON,
  COMP: process.env.COMP_POLYGON,
  SNX: process.env.SNX_POLYGON,
  YFI: process.env.YFI_POLYGON,
  WMATIC: process.env.WMATIC_POLYGON,
};

const formatUSD = (amount) => `$${Number(amount).toFixed(6)}`;
const formatToken = (bn, decimals = 18) => Number(ethers.utils.formatUnits(bn, decimals)).toFixed(6);

function getAddress(symbol) {
  const addr = SYMBOL_TO_ADDRESS[symbol.toUpperCase()];
  if (!addr) {
    console.warn(`⚠️ Skipping: Missing address mapping for ${symbol}`);
  }
  return addr;
}

async function getDecimals(tokenAddress) {
  const erc20 = new ethers.Contract(tokenAddress, ["function decimals() view returns (uint8)"], provider);
  return await erc20.decimals();
}

function safeParseUnits(amountString, decimals) {
  try {
    const parts = amountString.split(".");
    if (parts.length === 2 && parts[1].length > decimals) {
      parts[1] = parts[1].slice(0, decimals);
    }
    return ethers.utils.parseUnits(parts.join("."), decimals);
  } catch (err) {
    console.error("❌ parseUnits error:", amountString, decimals, err.message);
    process.exit(1);
  }
}

function logToFile(data) {
  const timestamp = new Date().toISOString();
  const entry = { timestamp, ...data };
  const logPath = "./logs/arbitrage-log.json";
  let logs = [];
  if (fs.existsSync(logPath)) logs = JSON.parse(fs.readFileSync(logPath));
  logs.push(entry);
  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
}

async function scanRoutes() {
  const gasPrices = await fetchPolygonGas();
  const gasCostUSD = await estimateGasCostUSD(provider);

  for (const [token0, token1, token2] of rawRoutes) {
    const tokenAddr = getAddress(token0);
    if (!tokenAddr) continue;

    const path1 = [getAddress(token0), getAddress(token1)];
    const path2 = [getAddress(token1), getAddress(token2)];

    if (path1.includes(undefined) || path2.includes(undefined)) continue;

    const decimals = token0.toUpperCase() === "USDC" ? 6 : 18;
    const amount = safeParseUnits("5", decimals);

    let quote1 = await getBestQuote(path1, amount, provider);
    if (!quote1 || quote1.amountOut.isZero()) {
      console.log(`❌ quote1 failed for path1: [${path1.join(" → ")}]`);
      await sleep(1200);
      continue;
    }

    let quote2 = await getBestQuote(path2, quote1.amountOut, provider);
    if (!quote2 || quote2.amountOut.isZero()) {
      console.log(`❌ quote2 failed for path2: [${path2.join(" → ")}]`);
      await sleep(1200);
      continue;
    }

    const dec1 = await getDecimals(path1[1]);
    const dec2 = await getDecimals(path2[1]);
    const decFinal = await getDecimals(path2[1]);

    const finalOut = quote2.amountOut;
    const premium = amount.mul(9).div(10000); // 0.09%
    const totalCost = amount.add(premium);
    const rawProfit = finalOut.sub(totalCost);
    const netProfitUSD = parseFloat(ethers.utils.formatUnits(rawProfit, decimals)) - gasCostUSD;

    const label = `${token0} → ${token1} → ${token2}`;
    console.log(`🔎 [${label}] via ${quote1.dex} + ${quote2.dex}`);
    console.log(`→ quote1.out: ${formatToken(quote1.amountOut, dec1)} | quote2.out: ${formatToken(quote2.amountOut, dec2)}`);
    console.log(`→ Return: ${formatToken(finalOut, decFinal)} | Cost: ${formatToken(totalCost, decimals)} + ~${formatUSD(gasCostUSD)} gas | Net Profit: ${formatUSD(netProfitUSD)}`);

    if (netProfitUSD < MIN_USD_PROFIT) {
      console.log(`💸 Skipping: profit ${formatUSD(netProfitUSD)} below threshold $${MIN_USD_PROFIT}`);
      await sleep(1200);
      continue;
    }

    logToFile({
      route: label,
      dex1: quote1.dex,
      dex2: quote2.dex,
      return: finalOut.toString(),
      cost: totalCost.toString(),
      profit: rawProfit.toString(),
      gasCostUSD,
      netProfitUSD,
      status: finalOut.gt(totalCost) ? "✅ Executing" : "❌ Skipped",
    });

    if (quote1.dex === "OpenOcean" || quote2.dex === "OpenOcean") {
      console.log("❌ OpenOcean quote used — skipping execution to avoid revert.");
      await sleep(1200);
      continue;
    }

    if (finalOut.gt(totalCost)) {
      const minOut1 = ethers.BigNumber.from(0);
      const minOut2 = ethers.BigNumber.from(0);

      const params = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "address[]", "address[]", "uint256", "uint256"],
        [tokenAddr, amount, path1, path2, minOut1, minOut2]
      );

      console.log("📦 Encoded Params:");
      console.log(`→ tokenAddr: ${tokenAddr}`);
      console.log(`→ amountIn: ${amount.toString()}`);
      console.log(`→ path1: [${path1.join(" → ")}]`);
      console.log(`→ path2: [${path2.join(" → ")}]`);
      console.log(`→ minOut1: ${minOut1.toString()}`);
      console.log(`→ minOut2: ${minOut2.toString()}`);
      console.log(`→ encoded params (hex): ${params}`);

      try {
        await contract.callStatic.initiateFlashloan(tokenAddr, amount, params, {
          gasLimit: 1_000_000,
        });

        console.log("✅ Simulation successful.");

        if (IS_DRY_RUN) {
          console.log("🧪 DRY RUN ACTIVE — TX execution skipped.");
        } else {
          const tx = await contract.initiateFlashloan(tokenAddr, amount, params, {
            gasLimit: 1_000_000,
            maxFeePerGas: ethers.utils.parseUnits(gasPrices.fastGas.toString(), "gwei"),
            maxPriorityFeePerGas: ethers.utils.parseUnits("30", "gwei"),
          });
          console.log(`🚀 TX sent: ${tx.hash}`);
          const receipt = await tx.wait();
          console.log(`✅ TX confirmed in block ${receipt.blockNumber}`);
        }

        return;
      } catch (err) {
        console.warn("⚠️ Flashloan simulation or TX failed:", err.message);
      }
    }

    await sleep(1200);
  }
}

const runScan = async () => {
  console.log(`\n🌀 ${new Date().toLocaleTimeString()} - Starting arbitrage scan...`);
  await scanRoutes();
};

runScan();
setInterval(runScan, 15000);

