// test0x.js
require("dotenv").config();
const { ethers } = require("ethers");
const { get0xQuote } = require("./scripts/utils/zeroXQuote");

(async () => {
  const DAI  = process.env.DAI_POLYGON;
  const WETH = process.env.WETH_POLYGON;
  const amount = ethers.utils.parseUnits("500", 18);

  console.log("\n🧪 Testing 0x DAI→WETH:");
  const out1 = await get0xQuote(DAI, WETH, amount);
  console.log("→ out1:", out1.toString(), "\n");

  // If the first leg succeeded, feed that amount back; otherwise retry 500 DAI
  const feed = out1.gt(0) ? out1 : amount;

  console.log("🧪 Testing 0x WETH→DAI:");
  const out2 = await get0xQuote(WETH, DAI, feed);
  console.log("→ out2:", out2.toString(), "\n");
})();

