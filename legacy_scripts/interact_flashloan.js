require("dotenv").config();
const hre = require("hardhat");
const { ethers } = hre;
const { fetchPolygonGas } = require("./utils/fetchPolygonGas");

const network = hre.network.name;

let AAVE_LENDING_POOL, PROFITBOT_ADDRESS, ROUTER;
let decimals;

if (network === "polygon") {
  AAVE_LENDING_POOL = "0x794a61358d6845594f94dc1db02a252b5b4814ad";
  PROFITBOT_ADDRESS = process.env.PROFITBOT_ADDRESS_POLYGON;
  ROUTER = "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"; // SushiSwap
} else if (network === "arbitrum") {
  AAVE_LENDING_POOL = "0x794a61358d6845594f94dc1db02a252b5b4814ad";
  PROFITBOT_ADDRESS = process.env.PROFITBOT_ADDRESS_ARBITRUM;
  ROUTER = "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506";
} else {
  console.error("  Unsupported network:", network);
  process.exit(1);
}

async function runFlashloan(tokenAddress, amountFloat) {
  try {
    const [signer] = await ethers.getSigners();
    const token = await ethers.getContractAt("IERC20Metadata", tokenAddress);
   const symbol = await token.symbol();
    decimals = await token.decimals();

    console.log(`\n🚀 Attempting Flashloan for ${symbol}`);

    //   Safe conversion
    const amount = BigInt(ethers.parseUnits(amountFloat.toString(), decimals).toString());

    const SLIPPAGE = parseFloat(process.env.MAX_SLIPPAGE || "0.005");

    const WETH = network === "polygon"
      ? "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"
      : "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";

    if (tokenAddress.toLowerCase() === WETH.toLowerCase()) {
      console.log(` ️  Skipping flashloan: Token is WETH, no arbitrage path.`);
      return;
    }

    const PATH1 = [tokenAddress, WETH];
    const PATH2 = [WETH, tokenAddress];

    const router = await ethers.getContractAt("IUniswapV2Router02", ROUTER);
    const out1 = await router.getAmountsOut(amount, PATH1);
    const minOut1 = applySlippage(out1[1], SLIPPAGE);

    const out2 = await router.getAmountsOut(minOut1, PATH2);
   const minOut2 = applySlippage(out2[1], SLIPPAGE);

    console.log(`📉 minOut1: ${minOut1}`);
    console.log(`📉 minOut2: ${minOut2}`);

    const gasData = await fetchPolygonGas();
    const gasPrice = ethers.parseUnits(gasData.fastGas.toString(), "gwei");
    const gasEstimate = 8_000_000;
    const gasCostMATIC = gasEstimate * parseFloat(gasData.fastGas) * 1e-9;
   const gasTokenUSD = 0.7;
    const tokenPriceUSD = 1.0;
    const gasCostUSD = gasCostMATIC * gasTokenUSD;
    const tokenProfitNeeded = gasCostUSD / tokenPriceUSD;

    const expectedProfit = Number(
      ethers.formatUnits(BigInt(minOut2) - BigInt(amount), decimals)
    );

   if (expectedProfit < tokenProfitNeeded) {
      console.log(` ️ Skipping: Expected profit (${expectedProfit}) < gas break-even (${tokenProfitNeeded.toFixed(4)})`);
      return;
    }

    const abiCoder = new ethers.AbiCoder();
    const params = abiCoder.encode(
      ["address", "uint256", "address[]", "address[]", "uint256", "uint256"],
      [tokenAddress, amount, PATH1, PATH2, minOut1.toString(), minOut2.toString()]
   );

    const pool = await ethers.getContractAt("IPool", AAVE_LENDING_POOL);
    const tx = await pool.flashLoanSimple(
      PROFITBOT_ADDRESS,
      tokenAddress,
      amount,
      params,
      0,
     { gasLimit: gasEstimate, gasPrice }
    );

    await tx.wait();
    console.log(`  Flashloan executed successfully for ${symbol}`);
  } catch (err) {
    console.error(`  Flashloan error: ${err.message}`);
  }
}

function applySlippage(amount, slippage) {
  return amount * BigInt(Math.floor((1 - slippage) * 1e6)) / BigInt(1e6);
}

module.exports = { runFlashloan };



