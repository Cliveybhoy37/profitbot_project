throw new Error("Legacy transaction script disabled pending audited simulation and owner review");
// scripts/manualTrigger.js
// Flash-loan one-shot
//   node scripts/manualTrigger.js --in DAI --mid WETH --out DAI --amount 5
// ─────────────────────────────────────────────────────────────
require("dotenv").config();

const { ethers }           = require("ethers");
const fs                   = require("fs");
const minimist             = require("minimist");
const { getBestQuote }     = require("./utils/multiDexQuote");
const { fetchPolygonGas }  = require("./utils/fetchPolygonGas");
const tokenMap             = require("../helpers/tokenMap");

const fmt = (bn, tok) => ethers.utils.formatUnits(bn, tok.decimals);

// CLI
const argv    = minimist(process.argv.slice(2));
const IN      = argv.in?.toUpperCase();
const MID     = argv.mid?.toUpperCase();
const OUT     = argv.out?.toUpperCase();
const AMTRAW  = argv.amount !== undefined
              ? String(argv.amount)   // always a string for parseUnits
              : "10";

if (!IN || !MID || !OUT) {
  console.error("❌  Missing --in, --mid or --out"); process.exit(1);
}

const tkIn  = tokenMap[IN];
const tkMid = tokenMap[MID];
const tkOut = tokenMap[OUT];
if (!tkIn || !tkMid || !tkOut) {
  console.error("❌  Token not in tokenMap"); process.exit(1);
}

console.log("🧭 RPC_URL Used:", process.env.RPC_URL);

(async () => {
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  const signer   = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const abi      = JSON.parse(
                     fs.readFileSync("./artifacts/contracts/ProfitBot.sol/ProfitBot.json")
                   ).abi;
  const bot      = new ethers.Contract(process.env.PROFITBOT_ADDRESS, abi, signer);

  const amtIn  = ethers.utils.parseUnits(AMTRAW, tkIn.decimals);
  const p1     = [tkIn.address,  tkMid.address];
  const p2     = [tkMid.address, tkOut.address];

  const q1 = await getBestQuote(p1, amtIn, provider);
  const q2 = await getBestQuote(p2, q1.amountOut, provider);

  if (q1.amountOut.isZero() || q2.amountOut.isZero()) return console.error("❌  Zero quote");
  if (q1.amountOut.lt(ethers.utils.parseUnits("0.000001", tkMid.decimals))) return console.error("❌  Tiny quote");

  const delta = q2.amountOut.sub(amtIn);
  console.log(`📊 Net Δ: ${fmt(delta, tkOut)} ${OUT}`);
  if (delta.lte(0)) return console.error("❌  Not profitable");

  // slippage
  const maxBps = process.env.FORCE_LOOSE_SLIPPAGE === "true"
               ? 500 : parseInt(process.env.MAX_SLIPPAGE || "100");
  const slip   = x => x.mul(10000 - maxBps).div(10000);
  const min1   = slip(q1.amountOut);
  const min2   = slip(q2.amountOut);

  const params = ethers.utils.defaultAbiCoder.encode(
    ["address","uint256","address[]","address[]","uint256","uint256"],
    [ tkIn.address, amtIn, p1, p2, min1, min2 ]
  );

  // gas
  const gFeed  = await fetchPolygonGas();
  const gPrice = ethers.utils.parseUnits(
                   process.env.GAS_OVERRIDE_GWEI || gFeed.proposeGas.toString(),
                   "gwei"
                 );

  if (process.env.DRY_RUN === "true") {
    try {
      const est = await bot.estimateGas.initiateFlashloan(tkIn.address, amtIn, params);
      const usd = parseFloat(ethers.utils.formatEther(est.mul(gPrice))) * 0.75;
      console.log(`⛽  ${est.toString()} @ ${gPrice/1e9} gwei (~$${usd.toFixed(2)})`);
    } catch { console.warn("⚠️  Gas-est failed (fork)"); }
    console.log("🔒 DRY_RUN – no tx");
    return;
  }

  const tx = await bot.initiateFlashloan(tkIn.address, amtIn, params, { gasPrice: gPrice });
  console.log("🚀  Tx:", tx.hash);
  const rc = await tx.wait();
  console.log("✅  Block:", rc.blockNumber);
})();

