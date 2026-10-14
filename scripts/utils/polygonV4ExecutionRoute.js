"use strict";

const { ethers } = require("ethers");

const VENUE_IDS = Object.freeze({
  QUICKSWAP_V2: 0,
  SUSHISWAP_V2: 1,
  UNISWAP_V3: 2,
  BALANCER_V2: 3,
  UNISWAP_V4: 4
});

const LEG_TYPE =
  "tuple(uint8 venue,address tokenIn,address tokenOut,uint256 minAmountOut,bytes venueData)[]";

const EXECUTION_PLAN_TYPE =
  "tuple(uint256 deadline,uint256 minimumProfit,tuple(uint8 venue,address tokenIn,address tokenOut,uint256 minAmountOut,bytes venueData)[] legs)";

const V4_DATA_TYPE =
  "tuple(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks,bool zeroForOne)";

function requireAddress(value, label) {
  if (
    !ethers.utils.isAddress(value) ||
    value === ethers.constants.AddressZero
  ) {
    throw new Error(`${label} must be a valid nonzero address`);
  }
}

function applySlippage(amountOut, slippageBps) {
  if (
    !ethers.BigNumber.isBigNumber(amountOut) ||
    amountOut.lte(0)
  ) {
    throw new Error("Execution leg requires positive amountOut");
  }

  if (
    !Number.isInteger(slippageBps) ||
    slippageBps < 0 ||
    slippageBps >= 10000
  ) {
    throw new Error(
      "slippageBps must be an integer from 0 to 9999"
    );
  }

  return amountOut
    .mul(10000 - slippageBps)
    .div(10000);
}

function encodeV4VenueData(leg) {
  const key = leg.poolKey;

  if (!key || typeof key !== "object") {
    throw new Error("Uniswap V4 execution leg requires poolKey");
  }

  requireAddress(key.currency0, "V4 currency0");
  requireAddress(key.currency1, "V4 currency1");

  if (
    key.currency0.toLowerCase() ===
    key.currency1.toLowerCase()
  ) {
    throw new Error("V4 pool currencies must be distinct");
  }

  if (
    !Number.isInteger(key.fee) ||
    key.fee <= 0 ||
    key.fee > 0xffffff
  ) {
    throw new Error("Uniswap V4 execution leg requires a valid fee");
  }

  if (
    !Number.isInteger(key.tickSpacing) ||
    key.tickSpacing <= 0 ||
    key.tickSpacing > 8388607
  ) {
    throw new Error(
      "Uniswap V4 execution leg requires valid tickSpacing"
    );
  }

  if (!ethers.utils.isAddress(key.hooks)) {
    throw new Error("Uniswap V4 execution leg requires valid hooks");
  }

  if (typeof leg.zeroForOne !== "boolean") {
    throw new Error(
      "Uniswap V4 execution leg requires zeroForOne"
    );
  }

  const expectedIn = leg.zeroForOne
    ? key.currency0
    : key.currency1;

  const expectedOut = leg.zeroForOne
    ? key.currency1
    : key.currency0;

  if (
    expectedIn.toLowerCase() !== leg.tokenIn.toLowerCase() ||
    expectedOut.toLowerCase() !== leg.tokenOut.toLowerCase()
  ) {
    throw new Error(
      "V4 direction does not match execution leg tokens"
    );
  }

  return ethers.utils.defaultAbiCoder.encode(
    [V4_DATA_TYPE],
    [[
      key.currency0,
      key.currency1,
      key.fee,
      key.tickSpacing,
      key.hooks,
      leg.zeroForOne
    ]]
  );
}

function encodeVenueData(leg) {
  switch (leg.venue) {
    case "QUICKSWAP_V2":
    case "SUSHISWAP_V2":
      return "0x";

    case "UNISWAP_V3":
      if (
        !Number.isInteger(leg.fee) ||
        leg.fee <= 0 ||
        leg.fee > 0xffffff
      ) {
        throw new Error(
          "Uniswap V3 execution leg requires a valid fee"
        );
      }

      return ethers.utils.defaultAbiCoder.encode(
        ["uint24"],
        [leg.fee]
      );

    case "BALANCER_V2":
      if (
        typeof leg.poolId !== "string" ||
        !ethers.utils.isHexString(leg.poolId, 32) ||
        leg.poolId === ethers.constants.HashZero
      ) {
        throw new Error(
          "Balancer execution leg requires a valid poolId"
        );
      }

      return ethers.utils.defaultAbiCoder.encode(
        ["bytes32"],
        [leg.poolId]
      );

    case "UNISWAP_V4":
      return encodeV4VenueData(leg);

    default:
      throw new Error(
        `Unsupported execution venue: ${leg.venue}`
      );
  }
}

function buildV4ExecutionLegs(discoveredLegs, slippageBps) {
  if (
    !Array.isArray(discoveredLegs) ||
    discoveredLegs.length !== 3
  ) {
    throw new Error("Exactly three discovered legs required");
  }

  const built = discoveredLegs.map((leg) => {
    requireAddress(leg.tokenIn, "Execution tokenIn");
    requireAddress(leg.tokenOut, "Execution tokenOut");

    if (
      leg.tokenIn.toLowerCase() ===
      leg.tokenOut.toLowerCase()
    ) {
      throw new Error(
        "Execution leg requires distinct valid token addresses"
      );
    }

    const venue = VENUE_IDS[leg.venue];

    if (venue === undefined) {
      throw new Error(
        `Unsupported execution venue: ${leg.venue}`
      );
    }

    return {
      venue,
      tokenIn: leg.tokenIn,
      tokenOut: leg.tokenOut,
      minAmountOut:
        applySlippage(leg.amountOut, slippageBps),
      venueData: encodeVenueData(leg)
    };
  });

  for (let i = 1; i < built.length; i++) {
    if (
      built[i - 1].tokenOut.toLowerCase() !==
      built[i].tokenIn.toLowerCase()
    ) {
      throw new Error("Execution route is not contiguous");
    }
  }

  if (
    built[2].tokenOut.toLowerCase() !==
    built[0].tokenIn.toLowerCase()
  ) {
    throw new Error(
      "Execution route must close to the starting token"
    );
  }

  return built;
}

function encodeV4ExecutionPlan({
  legs,
  deadline,
  minimumProfit
}) {
  if (!Array.isArray(legs) || legs.length !== 3) {
    throw new Error(
      "Exactly three execution legs required"
    );
  }

  if (
    !Number.isSafeInteger(deadline) ||
    deadline <= 0
  ) {
    throw new Error(
      "Execution deadline must be a positive safe integer"
    );
  }

  if (
    !ethers.BigNumber.isBigNumber(
      minimumProfit
    ) ||
    minimumProfit.lte(0)
  ) {
    throw new Error(
      "minimumProfit must be a positive BigNumber"
    );
  }

  return ethers.utils.defaultAbiCoder.encode(
    [EXECUTION_PLAN_TYPE],
    [[
      deadline,
      minimumProfit,
      legs.map((leg) => [
        leg.venue,
        leg.tokenIn,
        leg.tokenOut,
        leg.minAmountOut,
        leg.venueData
      ])
    ]]
  );
}

function encodeV4ExecutionLegs(legs) {
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
  VENUE_IDS,
  LEG_TYPE,
  EXECUTION_PLAN_TYPE,
  V4_DATA_TYPE,
  applySlippage,
  encodeV4VenueData,
  buildV4ExecutionLegs,
  encodeV4ExecutionLegs,
  encodeV4ExecutionPlan
};
