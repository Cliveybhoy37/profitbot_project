// scripts/utils/openOceanQuote.js
const axios = require("axios");
const { ethers } = require("ethers");

// Small helper to delay between retries
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getOpenOceanQuote(path, amountIn, provider) {
  if (path.length < 2) return { dex: "OpenOcean", amountOut: ethers.BigNumber.from("0") };

  const fromToken = path[0];
  const toToken = path[path.length - 1];

  // Fallback amount to avoid huge quote errors
  const cleanAmountIn = amountIn.gt(ethers.constants.MaxUint256.div(10))
    ? ethers.BigNumber.from("100000000000000000000") // fallback to 100 DAI
    : amountIn;

  try {
    const gas = await provider.getGasPrice(); // ⛽ required by OpenOcean
    const gasPrice = gas.toString();

    let attempt = 0;
    while (attempt < 3) {
      try {
        // 💡 Delay between attempts to avoid rate limit
        if (attempt > 0) await sleep(500 * attempt);

        const res = await axios.get("https://open-api.openocean.finance/v3/polygon/quote", {
          params: {
            inTokenAddress: fromToken,
            outTokenAddress: toToken,
            amount: cleanAmountIn.toString(),
            slippage: 1,
            gasPrice
          }
        });

        console.log("🔍 OpenOcean API response:", res.data);
        const amountOut = ethers.BigNumber.from(res.data.outAmount);
        return { dex: "OpenOcean", amountOut };
      } catch (err) {
        if (err.response?.status === 429) {
          console.warn("⚠️ OpenOcean 429: Rate limited, retrying...");
          attempt++;
        } else {
          throw err;
        }
      }
    }

    console.warn("❌ OpenOcean quote failed after retries");
    return { dex: "OpenOcean", amountOut: ethers.BigNumber.from("0") };
  } catch (err) {
    console.warn(`OpenOcean quote failed: ${err.message}`);
    return { dex: "OpenOcean", amountOut: ethers.BigNumber.from("0") };
  }
}

module.exports = { getOpenOceanQuote };

