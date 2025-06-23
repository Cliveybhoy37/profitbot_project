// scripts/executeFlashloan.js

require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");

const ABI = require("../artifacts/contracts/ProfitBot.sol/ProfitBot.json").abi;

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const profitBot = new ethers.Contract(process.env.PROFITBOT_ADDRESS, ABI, wallet);

const uniswapRouter = new ethers.Contract(
  process.env.UNISWAP_ROUTER,
  ["function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory)"],
  provider
);

// Configurable route & amount
const ROUTE = ["DAI", "AAVE", "DAI"];
const AMOUNT_IN = ethers.utils.parseUnits("1000", 18); // DAI has 18 decimals

// Readable mapping
const symbolToAddress = {
  DAI: process.env.DAI_POLYGON,
  AAVE: process.env.AAVE_POLYGON,
  MKR: process.env.MKR_POLYGON,
  LINK: process.env.LINK_POLYGON,
  WSTETH: process.env.WSTETH_POLYGON,
  USDC: process.env.USDC_POLYGON,
  FRAX: process.env.FRAX_POLYGON,
  UNI: process.env.UNI_POLYGON,
  YFI: process.env.YFI_POLYGON,
  SNX: process.env.SNX_POLYGON,
};

async function execute() {
  try {
    const path1 = [symbolToAddress[ROUTE[0]], symbolToAddress[ROUTE[1]]];
    const path2 = [symbolToAddress[ROUTE[1]], symbolToAddress[ROUTE[2]]];

    const amounts1 = await uniswapRouter.getAmountsOut(AMOUNT_IN, path1);
    const intermediateAmount = amounts1[1];
    const amounts2 = await uniswapRouter.getAmountsOut(intermediateAmount, path2);
    const finalOut = amounts2[1];

    const slippageBps = Number(process.env.MAX_SLIPPAGE) || 1; // % slippage
    const minOut1 = intermediateAmount.mul(100 - slippageBps).div(100);
    const minOut2 = finalOut.mul(100 - slippageBps).div(100);

    const expectedProfit = finalOut.sub(AMOUNT_IN);
    const minProfitUSD = ethers.utils.parseUnits(
      process.env.MIN_USD_PROFIT || "1",
      18
    );

    console.log(`🔁 Route: ${ROUTE.join(" → ")}`);
    console.log(`💰 Final Out: ${ethers.utils.formatUnits(finalOut, 18)} ${ROUTE[2]}`);
    console.log(`📊 Expected Profit: ${ethers.utils.formatUnits(expectedProfit, 18)} ${ROUTE[2]}`);

    if (expectedProfit.lt(minProfitUSD)) {
      console.warn("⚠️ Skipping flashloan, expected profit too low.");
      return;
    }

    if (process.env.DRY_RUN === "true") {
      console.log("🧪 Dry run mode enabled — transaction not sent.");
      return;
    }

    const params = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256", "address[]", "address[]", "uint256", "uint256"],
      [symbolToAddress[ROUTE[0]], AMOUNT_IN, path1, path2, minOut1, minOut2]
    );

    console.log("🚀 Sending flashloan transaction...");
    const tx = await profitBot.initiateFlashloan(
      symbolToAddress[ROUTE[0]],
      AMOUNT_IN,
      params
    );

    console.log("⛓️  Tx submitted:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Flashloan executed in block:", receipt.blockNumber);
  } catch (err) {
    console.error("💥 Error:", err);
  }
}

execute();

