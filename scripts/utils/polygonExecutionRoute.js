"use strict";

const { ethers } = require("ethers");

const LEG_TYPE =
  "tuple(uint8 venue,address tokenIn,address tokenOut,uint256 minAmountOut,bytes32 venueData)[]";

const VENUE_IDS = Object.freeze({
  QUICKSWAP_V2: 0,
  SUSHISWAP_V2: 1,
  UNISWAP_V3: 2,
  BALANCER_V2: 3
});

function applySlippage(amountOut, slippageBps) {
  if (!ethers.BigNumber.isBigNumber(amountOut) || amountOut.lte(0)) {
    throw new Error("Execution leg requires positive amountOut");
  }

  if (
    !Number.isInteger(slippageBps) ||
    slippageBps < 0 ||
    slippageBps >= 10000
  ) {
    throw new Error("slippageBps must be an integer from 0 to 9999");
  }

  const minAmountOut = amountOut
    .mul(10000 - slippageBps)
    .div(10000);

  if (minAmountOut.isZero()) {
    throw new Error("Execution leg minimum output cannot be zero");
  }

  return minAmountOut;
}

function encodeVenueData(leg) {
  if (leg.venue === "UNISWAP_V3") {
    if (
      !Number.isInteger(leg.fee) ||
      leg.fee <= 0 ||
      leg.fee > 0xffffff
    ) {
      throw new Error("Uniswap V3 execution leg requires a valid fee");
    }

    return ethers.utils.hexZeroPad(
      ethers.utils.hexlify(leg.fee),
      32
    );
  }

  if (leg.venue === "BALANCER_V2") {
    if (
      typeof leg.poolId !== "string" ||
      !ethers.utils.isHexString(leg.poolId, 32) ||
      leg.poolId === ethers.constants.HashZero
    ) {
      throw new Error("Balancer execution leg requires a valid poolId");
    }

    return leg.poolId;
  }

  return ethers.constants.HashZero;
}

function buildExecutionLegs(discoveredLegs, slippageBps) {
  if (!Array.isArray(discoveredLegs) || discoveredLegs.length !== 3) {
    throw new Error("Exactly three discovered legs required");
  }

  for (const leg of discoveredLegs) {
    if (
      !ethers.utils.isAddress(leg.tokenIn) ||
      !ethers.utils.isAddress(leg.tokenOut) ||
      leg.tokenIn.toLowerCase() === leg.tokenOut.toLowerCase()
    ) {
      throw new Error("Execution leg requires distinct valid token addresses");
    }
  }

  if (
    discoveredLegs[0].tokenOut.toLowerCase() !==
      discoveredLegs[1].tokenIn.toLowerCase() ||
    discoveredLegs[1].tokenOut.toLowerCase() !==
      discoveredLegs[2].tokenIn.toLowerCase()
  ) {
    throw new Error("Execution route is not contiguous");
  }

  if (
    discoveredLegs[2].tokenOut.toLowerCase() !==
    discoveredLegs[0].tokenIn.toLowerCase()
  ) {
    throw new Error("Execution route must close to the starting token");
  }

  return discoveredLegs.map((leg) => {
    const venue = VENUE_IDS[leg.venue];

    if (venue === undefined) {
      throw new Error(`Unsupported execution venue: ${leg.venue}`);
    }

    return {
      venue,
      tokenIn: leg.tokenIn,
      tokenOut: leg.tokenOut,
      minAmountOut: applySlippage(leg.amountOut, slippageBps),
      venueData: encodeVenueData(leg)
    };
  });
}

function encodeExecutionLegs(legs) {
  if (!Array.isArray(legs) || legs.length !== 3) {
    throw new Error("Exactly three execution legs required");
  }

  return ethers.utils.defaultAbiCoder.encode(
    [LEG_TYPE],
    [legs.map((leg) => [
      leg.venue,
      leg.tokenIn,
      leg.tokenOut,
      leg.minAmountOut,
      leg.venueData
    ])]
  );
}

module.exports = {
  LEG_TYPE,
  VENUE_IDS,
  applySlippage,
  buildExecutionLegs,
  encodeExecutionLegs
};
