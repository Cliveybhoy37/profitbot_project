"use strict";

function normalizeDiscoveredLegs(result, tokens) {
  if (!result || !Array.isArray(result.legs) || result.legs.length !== 3) {
    throw new Error("Execution candidate requires exactly three discovery legs");
  }

  return result.legs.map((leg) => {
    const tokenIn = tokens[leg.from];
    const tokenOut = tokens[leg.to];

    if (!tokenIn || !tokenOut) {
      throw new Error(
        `Unknown scanner token: ${!tokenIn ? leg.from : leg.to}`
      );
    }

    return {
      venue: leg.venue,
      tokenIn: tokenIn.address,
      tokenOut: tokenOut.address,
      amountOut: leg.amountOut,
      fee: leg.fee ?? null,
      poolId: leg.poolId ?? null
    };
  });
}

function validateLiveSlippageBps(slippageBps) {
  if (
    !Number.isInteger(slippageBps) ||
    slippageBps < 1 ||
    slippageBps > 1000
  ) {
    throw new Error(
      "Live slippageBps must be an integer from 1 to 1000"
    );
  }

  return slippageBps;
}

module.exports = {
  normalizeDiscoveredLegs,
  validateLiveSlippageBps
};
