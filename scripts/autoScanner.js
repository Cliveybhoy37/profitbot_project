"use strict";
// Read-only Polygon scanner for the exact two-router path in ProfitBot.sol.
require("dotenv").config();
const fs = require("node:fs");
const { ethers } = require("ethers");
const { evaluate } = require("./utils/netProfit");
const {
  resolveAaveEconomics,
  readTokenPrices,
  calculateFlashloanFee,
  calculateGasCostInToken
} = require("./utils/polygonAaveEconomics");

const ERC20 = ["function decimals() view returns (uint8)"];
const ROUTER = ["function getAmountsOut(uint256,address[]) view returns (uint256[])"];
const BOT = ["function initiateFlashloan(address,uint256,bytes)"];
const required = name => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for read-only scanning`);
  return value;
};
const rejection = (route, reason) => console.log(JSON.stringify({ route, accepted: false, reason }));
const minOutput = (value, bps) => value.mul(10000 - bps).div(10000);

async function main() {
  const rpc = new ethers.providers.JsonRpcProvider(required("POLYGON_RPC"));
  const [chain, block] = await Promise.all([rpc.getNetwork(), rpc.getBlock("latest")]);
  if (chain.chainId !== 137) throw new Error("Polygon chain ID 137 required");
  if (!block || Date.now() - block.timestamp * 1000 > 120000) throw new Error("Stale Polygon block");
  const uni = new ethers.Contract(required("UNISWAP_ROUTER_POLYGON"), ROUTER, rpc);
  const sushi = new ethers.Contract(required("SUSHISWAP_ROUTER_POLYGON"), ROUTER, rpc);
  const botAddress = required("PROFITBOT_ADDRESS_POLYGON");
  const bot = new ethers.Contract(botAddress, BOT, rpc);

  const aave = await resolveAaveEconomics(rpc);
  const native = required("WMATIC_POLYGON");
  const feeData = await rpc.getFeeData();

  if (!feeData.maxFeePerGas) {
    throw new Error("Missing max fee per gas");
  }
  const slip = Number(process.env.SLIPPAGE_BPS || 50);
  if (!Number.isInteger(slip) || slip < 1 || slip > 1000) throw new Error("SLIPPAGE_BPS must be 1..1000");
  const routes = JSON.parse(fs.readFileSync(process.env.ROUTES_FILE || "./arb_routes.json", "utf8"));
  const minProfit = process.env.MIN_PROFIT_BPS || "10";
  if (!/^\d+$/.test(minProfit)) throw new Error("Invalid MIN_PROFIT_BPS");
  for (const route of routes) {
    try {
      if (!Array.isArray(route) || route.length !== 3 || route[0] !== route[2] || route[0] === route[1]) {
        rejection(route, "invalid closed route"); continue;
      }
      const [a, b] = route;
      const tokenA = required(`${a}_POLYGON`), tokenB = required(`${b}_POLYGON`);
      if (!ethers.utils.isAddress(tokenA) || !ethers.utils.isAddress(tokenB) || tokenA.toLowerCase() === tokenB.toLowerCase())
        throw new Error("Invalid token addresses");
      const decimals = await new ethers.Contract(tokenA, ERC20, rpc).decimals();
      const size = ethers.utils.parseUnits(process.env.LOAN_SIZE || "10", decimals);
      const q1 = (await uni.getAmountsOut(size, [tokenA, tokenB]))[1];
      if (q1.isZero()) { rejection(route, "insufficient first-hop liquidity"); continue; }
      const min1 = minOutput(q1, slip);
      // Quote hop two with the worst allowed hop-one output.
      const q2 = (await sushi.getAmountsOut(min1, [tokenB, tokenA]))[1];
      const min2 = minOutput(q2, slip);
      if (min1.isZero() || min2.isZero()) { rejection(route, "insufficient second-hop liquidity"); continue; }
      const prices = await readTokenPrices({
        provider: rpc,
        oracleAddress: aave.oracleAddress,
        nativeToken: native,
        token: tokenA
      });

      if (prices.nativePrice === 0n || prices.tokenPrice === 0n) {
        rejection(route, "missing token price");
        continue;
      }

      const amountRaw = BigInt(size.toString());
      const premium = calculateFlashloanFee(
        amountRaw,
        aave.premiumBps
      );
      const params = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "address[]", "address[]", "uint256", "uint256"],
        [tokenA, size, [tokenA, tokenB], [tokenB, tokenA], min1, min2]);
      let gas;
      try { gas = await bot.estimateGas.initiateFlashloan(tokenA, size, params); }
      catch (e) { rejection(route, `simulation failed: ${e.reason || e.code || "contract revert"}`); continue; }
      const gasInToken = calculateGasCostInToken({
        gasUnits: BigInt(gas.toString()),
        maxFeePerGasWei: BigInt(feeData.maxFeePerGas.toString()),
        nativePrice: prices.nativePrice,
        tokenPrice: prices.tokenPrice,
        tokenDecimals: decimals
      });

      const result = evaluate({ input: amountRaw, quotedOutput: BigInt(q2.toString()),
        flashloanFee: premium, gasInToken,
        slippageBps: slip, quoteAgeMs: Date.now() - block.timestamp * 1000, maxQuoteAgeMs: 120000,
        executable: true, simulationPassed: true });
      const threshold = BigInt(size.toString()) * BigInt(minProfit) / 10000n;
      console.log(JSON.stringify({ route, accepted: false, estimatedPositive: result.accepted && result.net > threshold,
        netRaw: result.net.toString(), gasRaw: gasInToken.toString(), premiumRaw: premium.toString(),
        reasons: result.reasons.concat(result.net <= threshold ? ["below minimum net profit"] : [], ["deployed contract version not verified"]),
        note: "read-only estimate; no transaction submitted" }));
    } catch (e) { rejection(route, e.reason || e.message); }
  }
}
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { main, minOutput };
