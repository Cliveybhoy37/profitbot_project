"use strict";

const { ethers } = require("ethers");

function requireAddress(value, label) {
  if (
    typeof value !== "string" ||
    !ethers.utils.isAddress(value) ||
    value === ethers.constants.AddressZero
  ) {
    throw new Error(
      `${label} must be a valid nonzero address`
    );
  }

  return ethers.utils.getAddress(value);
}

function requirePositiveAmount(value, label) {
  if (
    typeof value !== "string" ||
    !/^[0-9]+$/.test(value)
  ) {
    throw new Error(
      `${label} must be a positive decimal string`
    );
  }

  const amount =
    ethers.BigNumber.from(value);

  if (amount.lte(0)) {
    throw new Error(
      `${label} must be positive`
    );
  }

  return amount;
}

function requireV3Fee(value, label) {
  if (
    !Number.isInteger(value) ||
    value <= 0 ||
    value > 0xffffff
  ) {
    throw new Error(
      `${label} requires observed V3 fee`
    );
  }

  return value;
}

function buildOuterLeg({
  observed,
  tokenIn,
  tokenOut,
  amountOut,
  label
}) {
  if (
    !observed ||
    typeof observed !== "object"
  ) {
    throw new Error(
      `${label} requires observed quote evidence`
    );
  }

  const venue =
    observed.venue;

  if (
    venue === "QUICKSWAP_V2" ||
    venue === "SUSHISWAP_V2"
  ) {
    return {
      venue,
      tokenIn,
      tokenOut,
      amountOut
    };
  }

  if (venue === "UNISWAP_V3") {
    return {
      venue,
      tokenIn,
      tokenOut,
      amountOut,
      fee:
        requireV3Fee(
          observed.fee,
          label
        )
    };
  }

  throw new Error(
    `${label} requires supported observed venue`
  );
}

function normalizePoolKey(poolKey) {
  if (!poolKey || typeof poolKey !== "object") {
    throw new Error(
      "Observed candidate requires V4 PoolKey"
    );
  }

  const currency0 =
    requireAddress(
      poolKey.currency0,
      "V4 currency0"
    );

  const currency1 =
    requireAddress(
      poolKey.currency1,
      "V4 currency1"
    );

  if (
    currency0.toLowerCase() ===
    currency1.toLowerCase()
  ) {
    throw new Error(
      "V4 currencies must be distinct"
    );
  }

  if (
    !Number.isInteger(poolKey.fee) ||
    poolKey.fee <= 0 ||
    poolKey.fee > 0xffffff
  ) {
    throw new Error(
      "Observed candidate requires valid V4 fee"
    );
  }

  if (
    !Number.isInteger(poolKey.tickSpacing) ||
    poolKey.tickSpacing <= 0
  ) {
    throw new Error(
      "Observed candidate requires valid V4 tickSpacing"
    );
  }

  if (
    typeof poolKey.hooks !== "string" ||
    !ethers.utils.isAddress(poolKey.hooks)
  ) {
    throw new Error(
      "Observed candidate requires valid V4 hooks"
    );
  }

  return {
    currency0,
    currency1,
    fee: poolKey.fee,
    tickSpacing: poolKey.tickSpacing,
    hooks:
      ethers.utils.getAddress(
        poolKey.hooks
      )
  };
}

function buildObservedV4Candidate({
  observation,
  startToken,
  entryToken,
  exitToken
}) {
  if (
    !observation ||
    observation.status !== "QUOTE_OK"
  ) {
    throw new Error(
      "Execution candidate requires QUOTE_OK observation"
    );
  }

  if (
    !observation.entry ||
    !observation.v4 ||
    !observation.exit
  ) {
    throw new Error(
      "Execution candidate requires all three observed legs"
    );
  }

  if (
    !Number.isInteger(
      observation.blockTag
    ) ||
    observation.blockTag <= 0
  ) {
    throw new Error(
      "Execution candidate requires observed blockTag"
    );
  }

  if (
    !observation.amounts ||
    typeof observation.amounts !== "object"
  ) {
    throw new Error(
      "Execution candidate requires observed start amount"
    );
  }

  const amountIn =
    requirePositiveAmount(
      observation.amounts.start,
      "Observed start amount"
    );

  const start =
    requireAddress(
      startToken,
      "startToken"
    );

  const entry =
    requireAddress(
      entryToken,
      "entryToken"
    );

  const exit =
    requireAddress(
      exitToken,
      "exitToken"
    );

  const zeroForOne =
    observation.v4.zeroForOne;

  if (typeof zeroForOne !== "boolean") {
    throw new Error(
      "Observed candidate requires V4 direction"
    );
  }

  const normalizedPoolKey =
    normalizePoolKey(
      observation.v4.poolKey
    );

  const expectedV4In =
    zeroForOne
      ? normalizedPoolKey.currency0
      : normalizedPoolKey.currency1;

  const expectedV4Out =
    zeroForOne
      ? normalizedPoolKey.currency1
      : normalizedPoolKey.currency0;

  if (
    expectedV4In.toLowerCase() !==
      entry.toLowerCase() ||
    expectedV4Out.toLowerCase() !==
      exit.toLowerCase()
  ) {
    throw new Error(
      "Observed V4 PoolKey/direction does not match route"
    );
  }

  const entryAmountOut =
    requirePositiveAmount(
      observation.entry.amountOut,
      "Entry amountOut"
    );

  const v4AmountOut =
    requirePositiveAmount(
      observation.v4.amountOut,
      "V4 amountOut"
    );

  const exitAmountOut =
    requirePositiveAmount(
      observation.exit.amountOut,
      "Exit amountOut"
    );

  const entryLeg =
    buildOuterLeg({
      observed:
        observation.entry,
      tokenIn:
        start,
      tokenOut:
        entry,
      amountOut:
        entryAmountOut,
      label:
        "Entry leg"
    });

  const exitLeg =
    buildOuterLeg({
      observed:
        observation.exit,
      tokenIn:
        exit,
      tokenOut:
        start,
      amountOut:
        exitAmountOut,
      label:
        "Exit leg"
    });

  return {
    blockTag:
      observation.blockTag,

    amountIn,

    legs: [
      entryLeg,
      {
        venue: "UNISWAP_V4",
        tokenIn: entry,
        tokenOut: exit,
        amountOut:
          v4AmountOut,
        poolKey:
          normalizedPoolKey,
        zeroForOne
      },
      exitLeg
    ]
  };
}

module.exports = {
  buildObservedV4Candidate
};
