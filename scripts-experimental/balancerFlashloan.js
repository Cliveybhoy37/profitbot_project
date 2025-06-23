// scripts/balancerFlashloan.js
require("dotenv").config();
const { ethers } = require("ethers");
const { getBalancerQuote } = require("./utils/balancerQuote");

const ABI = require("../artifacts/contracts/ProfitBot.sol/ProfitBot.json").abi;

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.PROFITBOT_ADDRESS, ABI, wallet);

const AMOUNT_IN = ethers.utils.parseUnits("1000", 18); // 1000 units of input token
const MIN_PROFIT = ethers.utils.parseUnits(process.env.MIN_USD_PROFIT || "1", 18);
const MAX_SLIPPAGE = 3;

const symbolToAddress = {
  DAI: process.env.DAI_POLYGON,
  USDC: process.env.USDC_POLYGON,
  USDT: process.env.USDT_POLYGON,
  AAVE: process.env.AAVE_POLYGON,
  UNI: process.env.UNI_POLYGON,
  BAL: process.env.BAL_POLYGON,
  WSTETH: process.env.WSTETH_POLYGON,
  FRAX: process.env.FRAX_POLYGON,
  CRV: process.env.CRV_POLYGON,
  LINK: process.env.LINK_POLYGON,
  YFI: process.env.YFI_POLYGON,
  MKR: process.env.MKR_POLYGON,
  WBTC: process.env.WBTC_POLYGON,
  SNX: process.env.SNX_POLYGON,
  SUSHI: process.env.SUSHI_POLYGON,
};

const ROUTE = ["DAI", "BAL", "DAI"];

async function execute() {
  const [tokenInSymbol, midSymbol, tokenOutSymbol] = ROUTE;
  const tokenIn = symbolToAddress[tokenInSymbol];
  const mid = symbolToAddress[midSymbol];
  const tokenOut = symbolToAddress[tokenOutSymbol];

  if (!tokenIn || !mid || !tokenOut) {
    console.error("❌ Invalid token address mapping in ROUTE.");
    return;
  }

  const path1 = [tokenIn, mid];
  const path2 = [mid, tokenOut];

  console.log(`🔄 Executing route: ${tokenInSymbol} → ${midSymbol} → ${tokenOutSymbol}`);

  // === 1. Simulate quotes
  const quote1 = await getBalancerQuote(path1, AMOUNT_IN);
  const intermediate = quote1.amountOut;
  console.log(`🔎 Quote1 (${tokenInSymbol} → ${midSymbol}): ${ethers.utils.formatUnits(intermediate || 0, 18)}`);

  const quote2 = await getBalancerQuote(path2, intermediate);
  const finalOut = quote2.amountOut;
  console.log(`🔎 Quote2 (${midSymbol} → ${tokenOutSymbol}): ${ethers.utils.formatUnits(finalOut || 0, 18)}`);

  if (finalOut.eq(0)) {
    console.warn("⚠️ Skipping: invalid quote (zero return).");
    return;
  }

  const expectedProfit = finalOut.sub(AMOUNT_IN);
  console.log(`💰 Final Out: ${ethers.utils.formatUnits(finalOut, 18)} ${tokenOutSymbol}`);
  console.log(`📈 Expected Profit: ${ethers.utils.formatUnits(expectedProfit, 18)} ${tokenOutSymbol}`);

  if (expectedProfit.lt(MIN_PROFIT)) {
    console.log("⚠️ Skipping flashloan, profit below threshold.");
    return;
  }

  const minOut1 = intermediate.mul(100 - MAX_SLIPPAGE).div(100);
  const minOut2 = finalOut.mul(100 - MAX_SLIPPAGE).div(100);

  const params = ethers.utils.defaultAbiCoder.encode(
    ["address", "uint256", "address[]", "address[]", "uint256", "uint256"],
    [tokenIn, AMOUNT_IN, path1, path2, minOut1, minOut2]
  );

  // === 2. Fire flashloan transaction
  console.log("🚀 Executing flashloan via Balancer Vault...");
  const tx = await contract.initiateFlashloan(tokenIn, AMOUNT_IN, params);
  console.log("⛓️  Tx Hash:", tx.hash);
  const receipt = await tx.wait();
  console.log("✅ Flashloan Complete. Block:", receipt.blockNumber);
}

execute().catch((err) => {
  console.error("💥 Flashloan Error:", err.message);
});

