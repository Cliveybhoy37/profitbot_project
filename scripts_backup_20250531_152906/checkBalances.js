// scripts/checkBalances.js
const { ethers } = require("ethers");
require("dotenv").config();

const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC);
const tokens = {
  DAI: process.env.DAI_POLYGON,
  USDC: process.env.USDC_POLYGON,
  USDT: process.env.USDT_POLYGON,
  WBTC: process.env.WBTC_POLYGON,
  WMATIC: process.env.WMATIC_POLYGON,
};
const profitBot = process.env.PROFITBOT_ADDRESS_POLYGON;

async function checkBalances() {
  for (const [sym, addr] of Object.entries(tokens)) {
    const erc20 = new ethers.Contract(addr, ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"], provider);
    const bal = await erc20.balanceOf(profitBot);
    const dec = await erc20.decimals();
    console.log(`${sym}: ${ethers.utils.formatUnits(bal, dec)}`);
  }
}

checkBalances();

