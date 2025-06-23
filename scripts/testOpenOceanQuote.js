require("dotenv").config();
const { ethers } = require("ethers");
const { getOpenOceanQuote } = require("./utils/openOceanQuote");

const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC);

const DAI = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
const USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

const path = [DAI, USDC];
const amountIn = ethers.utils.parseUnits("50", 18); // 50 DAI

(async () => {
  console.log("🧪 Testing OpenOcean quote from DAI to USDC...\n");

  const result = await getOpenOceanQuote(path, amountIn, provider);

  if (!result || result.amountOut.isZero()) {
    console.log("❌ Quote failed or returned zero.");
  } else {
    console.log(`✅ OpenOcean Quote Success`);
    console.log(`DEX: ${result.dex}`);
    console.log(`Amount Out: ${ethers.utils.formatUnits(result.amountOut, 6)} USDC`);
  }
})();

