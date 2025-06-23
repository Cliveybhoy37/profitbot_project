require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const { fetchPolygonGas } = require("./utils/fetchPolygonGas");
const { getBestQuote } = require("./utils/multiDexQuote");
const { estimateGasCostUSD } = require("./utils/simulateFlashloan");
const { isParaswapSupported } = require("../utils/paraswapTokens");

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
  WSTETH: process.env.WSTETH_POLYGON,
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

  const sizes = ["10", "25", "50"];
  const MIN_LIQUIDITY_OUTPUT = ethers.utils.parseUnits("10", 18);

  for (const [token0, token1, token2] of rawRoutes) {
    const tokenAddr = getAddress(token0);
    if (!tokenAddr) continue;

    const path1 = [getAddress(token0), getAddress(token1)];
    const path2 = [getAddress(token1), getAddress(token2)];
    if (path1.includes(undefined) || path2.includes(undefined)) continue;

    const finalTokenOut = path2[path2.length - 1];
    if (finalTokenOut.toLowerCase() !== tokenAddr.toLowerCase()) {
      console.log("⛔ Skipping: Final token doesn't match flashloan token (will cause failure).");
      continue;
    }

    const decimals = token0.toUpperCase() === "USDC" ? 6 : 18;

    for (const size of sizes) {
      const amount = safeParseUnits(size, decimals);

      if (!isParaswapSupported(path1[0]) || !isParaswapSupported(path1[1]) || !isParaswapSupported(path2[1])) {
        console.warn(`⛔ Skipping Paraswap quote — unsupported token(s) in [${token0} → ${token1} → ${token2}]`);
        continue;
      }

      let quote1 = await getBestQuote(path1, amount, provider);
      if (!quote1 || quote1.amountOut.isZero()) {
        console.log(`❌ quote1 failed for path1: [${path1.join(" → ")}]`);
        await sleep(500);
        continue;
      }

      if (quote1.amountOut.lt(MIN_LIQUIDITY_OUTPUT)) {
        console.log(`🛑 Skipping illiquid path: quote1.out = ${formatToken(quote1.amountOut, decimals)} < 10`);
        continue;
      }

      let quote2 = await getBestQuote(path2, quote1.amountOut, provider);
      if (!quote2 || quote2.amountOut.isZero()) {
        console.log(`❌ quote2 failed for path2: [${path2.join(" → ")}]`);
        await sleep(500);
        continue;
      }

      const dec1 = await getDecimals(path1[1]);
      const dec2 = await getDecimals(path2[1]);
      const decFinal = await getDecimals(path2[1]);

      const finalOut = quote2.amountOut;
      const premium = amount.mul(9).div(10000);
      const totalCost = amount.add(premium);

      const finalUSD = parseFloat(ethers.utils.formatUnits(finalOut, decimals));
      const totalUSD = parseFloat(ethers.utils.formatUnits(totalCost, decimals));
      const netProfitUSD = finalUSD - totalUSD - gasCostUSD;

      const label = `${token0} → ${token1} → ${token2} [${size}]`;
      console.log(`🔎 [${label}] via ${quote1.dex} + ${quote2.dex}`);
      console.log(`→ quote1.out: ${formatToken(quote1.amountOut, dec1)} | quote2.out: ${formatToken(quote2.amountOut, dec2)}`);
      console.log(`→ Return: ${formatToken(finalOut, decFinal)} | Cost: ${formatToken(totalCost, decimals)} + ~${formatUSD(gasCostUSD)} gas | Net Profit: ${formatUSD(netProfitUSD)}`);

      if (netProfitUSD < MIN_USD_PROFIT) {
        console.log(`💸 Skipping: profit ${formatUSD(netProfitUSD)} below threshold $${MIN_USD_PROFIT}`);
        continue;
      }

      logToFile({
        route: label,
        size,
        dex1: quote1.dex,
        dex2: quote2.dex,
        return: finalOut.toString(),
        cost: totalCost.toString(),
        gasCostUSD,
        netProfitUSD,
        status: finalOut.gt(totalCost) ? "✅ Executing" : "❌ Skipped",
      });

      if (quote1.dex === "OpenOcean" || quote2.dex === "OpenOcean") {
        console.log("❌ OpenOcean quote used — skipping execution to avoid revert.");
        continue;
      }

      if (finalOut.gt(totalCost)) {
        const minOut1 = ethers.BigNumber.from(0);
        const minOut2 = ethers.BigNumber.from(0);

        const params = ethers.utils.defaultAbiCoder.encode(
          ["address", "uint256", "address[]", "address[]", "uint256", "uint256"],
          [tokenAddr, amount, path1, path2, minOut1, minOut2]
        );

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
          const tokens = [token0, token1, token2].join(" → ");
          console.error(`❌ Flashloan failed for route: ${tokens}`);
          console.error(`↪️ Path1: ${path1.join(" → ")}`);
          console.error(`↪️ Path2: ${path2.join(" → ")}`);
          console.error(`⚙️ Amount: ${ethers.utils.formatUnits(amount, decimals)}`);
          console.error(`🚨 Error: ${err.message}`);
        }
      }

      await sleep(500);
    }
  }
}

const runScan = async () => {
  console.log(`\n🌀 ${new Date().toLocaleTimeString()} - Starting arbitrage scan...`);
  await scanRoutes();
};

runScan();
setInterval(runScan, 15000);

