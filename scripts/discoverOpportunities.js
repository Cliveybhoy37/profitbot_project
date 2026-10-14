"use strict";

// READ-ONLY Polygon arbitrage discovery.
// No signer, wallet, approvals, flashloans, or transaction submission.

require("dotenv").config();

const { ethers } = require("ethers");
const tokens = require("./utils/polygonScannerTokens");
const venues = require("./utils/polygonScannerVenues");
const { getQuote } = require("./utils/polygonDiscoveryQuotes");

const RPC_URL = process.env.ALCHEMY_POLYGON;
if (!RPC_URL) throw new Error("Missing ALCHEMY_POLYGON");

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

const BASES = ["USDC_NATIVE", "USDC_E", "DAI"];
const INTERMEDIATES = ["WPOL", "WETH", "WBTC"];

const TRADE_SIZES = {
  USDC_NATIVE: ["10", "100", "1000"],
  USDC_E: ["10", "100", "1000"],
  DAI: ["10", "100", "1000"]
};

const VENUES = Object.keys(venues);

function formatSigned(value, decimals) {
  const negative = value.lt(0);
  const magnitude = negative ? value.mul(-1) : value;
  return `${negative ? "-" : "+"}${ethers.utils.formatUnits(magnitude, decimals)}`;
}

async function main() {
  const startBlock = await provider.getBlockNumber();
  const results = [];
  let attempted = 0;
  let completed = 0;

  console.log(`Read-only discovery starting at Polygon block ${startBlock}`);
  console.log("No wallet or transaction execution is used.\n");

  for (const baseName of BASES) {
    const base = tokens[baseName];

    for (const intermediateName of INTERMEDIATES) {
      const intermediate = tokens[intermediateName];

      if (base.address.toLowerCase() === intermediate.address.toLowerCase()) {
        continue;
      }

      for (const size of TRADE_SIZES[baseName]) {
        const amountIn = ethers.utils.parseUnits(size, base.decimals);

        for (const venueOut of VENUES) {
          for (const venueBack of VENUES) {
            if (venueOut === venueBack) continue;

            attempted++;

            const first = await getQuote(
              venueOut,
              [base.address, intermediate.address],
              amountIn,
              provider,
              startBlock
            );

            if (!first || first.amountOut.lte(0)) continue;

            const second = await getQuote(
              venueBack,
              [intermediate.address, base.address],
              first.amountOut,
              provider,
              startBlock
            );

            if (!second || second.amountOut.lte(0)) continue;

            completed++;

            const grossDelta = second.amountOut.sub(amountIn);
            const grossBps = grossDelta.mul(10000).div(amountIn);

            results.push({
              baseName,
              intermediateName,
              size,
              venueOut,
              venueBack,
              amountIn,
              amountBack: second.amountOut,
              grossDelta,
              grossBps: grossBps.toNumber(),
              firstFee: first.fee,
              secondFee: second.fee,
              executionSupported:
                venueOut !== "UNISWAP_V3" &&
                venueBack !== "UNISWAP_V3"
            });
          }
        }
      }
    }
  }

  const endBlock = await provider.getBlockNumber();

  results.sort((a, b) => {
    const left = a.grossDelta.mul(b.amountIn);
    const right = b.grossDelta.mul(a.amountIn);

    if (left.eq(right)) return 0;
    return left.gt(right) ? -1 : 1;
  });

  console.log(`Attempted venue routes: ${attempted}`);
  console.log(`Completed round trips: ${completed}`);
  console.log(`Quote snapshot block: ${startBlock}`);
  console.log(`Wall-clock scan ended at block: ${endBlock}\n`);

  const top = results.slice(0, 20);

  if (top.length === 0) {
    console.log("No complete round-trip quotes found.");
    return;
  }

  console.log("Top gross round trips (BEFORE flashloan fee, gas and safety margin):\n");

  for (const r of top) {
    console.log(
      `${r.baseName} ${r.size} -> ${r.intermediateName} | ` +
      `${r.venueOut} -> ${r.venueBack} | ` +
      `gross ${formatSigned(r.grossDelta, tokens[r.baseName].decimals)} ` +
      `${r.baseName} (${r.grossBps >= 0 ? "+" : ""}${r.grossBps} bps) | ` +
      `executor=${r.executionSupported ? "V2-compatible" : "UNSUPPORTED-V3"}`
    );
  }

  console.log(
    "\nIMPORTANT: gross-positive does not mean profitable. " +
    "Aave premium, gas, slippage/safety margin and exact execution simulation " +
    "must still be applied."
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
