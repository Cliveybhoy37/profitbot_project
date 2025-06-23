// scripts/flashloanTest.js
require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const PROFITBOT_ADDRESS = process.env.PROFITBOT_ADDRESS_POLYGON;
  const abi = JSON.parse(fs.readFileSync("./artifacts/contracts/ProfitBot.sol/ProfitBot.json")).abi;
  const contract = new ethers.Contract(PROFITBOT_ADDRESS, abi, signer);

  const tokenIn = process.env.USDC_POLYGON;
  const amountIn = ethers.utils.parseUnits("500", 6); // USDC has 6 decimals
  const path1 = [process.env.USDC_POLYGON, process.env.WSTETH_POLYGON];
  const path2 = [process.env.WSTETH_POLYGON, process.env.DAI_POLYGON];
  const minOut1 = ethers.BigNumber.from("0");
  const minOut2 = ethers.BigNumber.from("0");

  const params = ethers.utils.defaultAbiCoder.encode(
    ["address", "uint256", "address[]", "address[]", "uint256", "uint256"],
    [tokenIn, amountIn, path1, path2, minOut1, minOut2]
  );

  console.log("🧪 Flashloan Test with USDC → wstETH → DAI");
  console.log("Params:");
  console.log(`- tokenIn: ${tokenIn}`);
  console.log(`- amountIn: ${amountIn.toString()}`);
  console.log(`- path1: [${path1.join(" → ")}]`);
  console.log(`- path2: [${path2.join(" → ")}]`);
  console.log(`- encoded: ${params}`);

  try {
    const tx = await contract.callStatic.initiateFlashloan(tokenIn, amountIn, params, {
      gasLimit: 1_000_000,
    });

    console.log("✅ Simulation passed.");
  } catch (err) {
    console.error("❌ Simulation failed:", err.message);
  }
}

main();

