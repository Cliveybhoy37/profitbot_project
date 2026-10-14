"use strict";

const { getQuote } = require("./polygonDiscoveryQuotes");
const {
  getBalancerQuote: defaultGetBalancerQuote
} = require("./polygonBalancerQuotes");

async function evaluateBalancerEdgeCycle({
  cycle,
  amountIn,
  entryVenue,
  exitVenue,
  provider,
  blockTag,
  getExternalQuote = getQuote,
  getBalancerQuote = defaultGetBalancerQuote
}) {
  if (!cycle || !Array.isArray(cycle.legs) || cycle.legs.length !== 3) {
    throw new Error("Three-leg Balancer edge cycle required");
  }

  const [entryLeg, balancerLeg, exitLeg] = cycle.legs;

  const entryQuote = await getExternalQuote(
    entryVenue,
    [entryLeg.tokenIn.address, entryLeg.tokenOut.address],
    amountIn,
    provider,
    blockTag
  );

  if (!entryQuote) return null;

  const balances = cycle.poolAssets.map(
    address => cycle.balancesByAddress[address.toLowerCase()]
  );

  let balancerQuote;

  try {
    balancerQuote = await getBalancerQuote({
      provider,
      poolId: cycle.poolId,
      assets: cycle.poolAssets,
      tokenIn: balancerLeg.tokenIn.address,
      tokenOut: balancerLeg.tokenOut.address,
      amountIn: entryQuote.amountOut,
      blockTag,
      poolType: cycle.poolType,
      balances
    });
  } catch (_) {
    return null;
  }

  const exitQuote = await getExternalQuote(
    exitVenue,
    [exitLeg.tokenIn.address, exitLeg.tokenOut.address],
    balancerQuote.amountOut,
    provider,
    blockTag
  );

  if (!exitQuote) return null;

  return {
    amountIn,
    amountOut: exitQuote.amountOut,
    entryQuote,
    balancerQuote,
    exitQuote
  };
}

module.exports = {
  evaluateBalancerEdgeCycle
};
