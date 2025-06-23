require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const { fetchPolygonGas } = require("./utils/fetchPolygonGas");

const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545"); // 🔄 Pointing to local Anvil fork
provider.pollingInterval = 4000;

const signer = provider.getSigner(0); // ✅ Use Anvil’s default pre-funded account

// ⚙️ Config
const PROFITBOT_ADDRESS = process.env.PROFITBOT_ADDRESS_LOCALHOST;
const WETH_ADDRESS = process.env.WETH_POLYGON;
const USDC_ADDRESS = process.env.USDC_POLYGON;
const UNISWAP_ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";
const BALANCER_POOL_ID = "0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063"; // still DAI/USDC — WETH might need update later
const FLASHLOAN_AMOUNT_WETH = ethers.utils.parseUnits("0.2", 18);

// ✅ ERC20 Minimal ABI
const ERC20_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function symbol() view returns (string)"
];

// ✅ Allowance Helper with Nonce, High Gas & Confirmation Retry
async function ensureAllowance(token, owner, spender, amount) {
  console.log("🔍 Checking allowance...");
  const allowance = await token.allowance(owner, spender);
  console.log("🔢 Current allowance:", ethers.utils.formatUnits(allowance, 18));

  if (allowance.lt(amount)) {
    console.log("🔒 Insufficient allowance. Sending approval tx with high gas...");

    const gasPrices = await fetchPolygonGas();
    const nonce = await provider.getTransactionCount(owner, "pending");

    const maxPriorityFeeGwei = 50;
    const maxFeePerGasGwei = parseFloat(gasPrices.fastGas) + 80;

    const tx = await token.approve(spender, ethers.constants.MaxUint256, {
      gasLimit: 150000,
      nonce,
      maxFeePerGas: ethers.utils.parseUnits(maxFeePerGasGwei.toString(), "gwei"),
      maxPriorityFeePerGas: ethers.utils.parseUnits(maxPriorityFeeGwei.toString(), "gwei"),
    });

    console.log("⛽ Approval TX sent:", tx.hash);

    let confirmed = false;
    for (let i = 0; i < 36; i++) {
      try {
        const receipt = await provider.getTransactionReceipt(tx.hash);
        if (receipt && receipt.confirmations > 0) {
          console.log(`✅ Approval confirmed in block ${receipt.blockNumber}`);
          confirmed = true;
          break;
        }
      } catch (_) {}
      await new Promise((res) => setTimeout(res, 5000));
    }

    if (!confirmed) {
      throw new Error("⏱ TX not confirmed after 3 minutes — check mempool or try again with higher gas");
    }

  } else {
    console.log(`✅ ${await token.symbol()} already approved`);
  }
}

async function main() {
  console.log("🚀 Starting flashloan logic...\n");

  console.log("✅ Step 1: Loaded contract ABI and signer.");
  const abi = JSON.parse(fs.readFileSync("./artifacts/contracts/ProfitBot.sol/ProfitBot.json")).abi;
  const contract = new ethers.Contract(PROFITBOT_ADDRESS, abi, signer);

  console.log("🟡 Step 2: Loading WETH contract...");
  const weth = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, signer);
  console.log("🟢 Step 3: WETH contract loaded. Calling ensureAllowance...");

  const owner = await signer.getAddress();
  await ensureAllowance(weth, owner, PROFITBOT_ADDRESS, FLASHLOAN_AMOUNT_WETH);
  console.log("✅ Step 4: Allowance confirmed.");

  const path = [WETH_ADDRESS, USDC_ADDRESS];

  console.log("🧪 Skipping estimation — forcing minOut to 1 for debug.");
  const minOut1 = ethers.BigNumber.from("1");
  const minOut2 = ethers.BigNumber.from("1");

  console.log(`🛡️ MinOut1: ${minOut1.toString()}`);
  console.log(`🛡️ MinOut2: ${minOut2.toString()}\n`);

  const params = ethers.utils.defaultAbiCoder.encode(
    ["string", "address", "address", "bytes32", "uint256", "uint256"],
    ["balancer", WETH_ADDRESS, USDC_ADDRESS, BALANCER_POOL_ID, minOut1, minOut2]
  );

  console.log("📦 Encoded Balancer params:\n", params);

  try {
    const gasPrices = await fetchPolygonGas();
    console.log("📤 Sending flashloan TX with gas price:", gasPrices.fastGas, "gwei");

    const tx = await contract.initiateFlashloan(
      WETH_ADDRESS,
      FLASHLOAN_AMOUNT_WETH,
      params,
      {
        gasLimit: ethers.BigNumber.from("2000000"),
        maxFeePerGas: ethers.utils.parseUnits(gasPrices.fastGas.toString(), "gwei"),
        maxPriorityFeePerGas: ethers.utils.parseUnits("30", "gwei"),
      }
    );

    console.log("⛓️ TX sent:", tx.hash);
    const receipt = await tx.wait();
    console.log(`✅ Flashloan confirmed in block: ${receipt.blockNumber}`);
  } catch (err) {
    console.error("❌ Flashloan failed:", err.message);
  }
}

main();

