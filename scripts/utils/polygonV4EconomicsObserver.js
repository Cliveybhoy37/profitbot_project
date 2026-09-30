"use strict";

// Read-only Polygon V4 ECONOMICS primitives.
//
// This module:
//   - quotes an exact-input V4 swap at a pinned block
//   - chains entry -> V4 -> exit quotes
//   - computes gross return and gross basis points
//   - preserves QUOTE_OK / NO_ROUTE / RPC_FAILURE semantics
//
// It does NOT:
//   - use a signer or wallet
//   - approve tokens
//   - submit transactions
//   - modify ProfitBot execution routes

const { ethers } = require("ethers");

const {
  QUOTE_OK,
  NO_ROUTE,
  RPC_FAILURE,
  safeErrorCode,
  observeQuote
} = require("./polygonV4OuterQuoteObserver");

// Polygon Uniswap V4 Quoter.
//
// Keep the nested PoolKey struct intact. This is deliberately
// separate from the Uniswap V3 quoteExactInputSingle ABI.
const V4_QUOTER =
  "0xb3d5c3dfc3a7aebff71895a7191796bffc2c81b9";

const V4_QUOTER_ABI = [
  "function quoteExactInputSingle(((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) poolKey,bool zeroForOne,uint128 exactAmount,bytes hookData) params) external returns (uint256 amountOut,uint256 gasEstimate)"
];

function normalizeAddress(value) {
  if (
    typeof value !== "string" ||
    !ethers.utils.isAddress(value)
  ) {
    throw new Error(
      `Invalid address: ${String(value)}`
    );
  }

  return ethers.utils.getAddress(value);
}

function positiveBigNumber(value, label) {
  let amount;

  try {
    amount =
      ethers.BigNumber.from(value);
  } catch (_) {
    throw new Error(
      `${label} must be an integer amount`
    );
  }

  if (amount.lte(0)) {
    throw new Error(
      `${label} must be positive`
    );
  }

  return amount;
}

function validateBlockTag(blockTag) {
  if (
    !Number.isInteger(blockTag) ||
    blockTag <= 0
  ) {
    throw new Error(
      "Economics observation requires pinned block"
    );
  }

  return blockTag;
}

function normalizePoolKey(poolKey) {
  if (
    !poolKey ||
    typeof poolKey !== "object"
  ) {
    throw new Error(
      "V4 quote requires PoolKey"
    );
  }

  const fee =
    Number(poolKey.fee);

  const tickSpacing =
    Number(poolKey.tickSpacing);

  if (
    !Number.isInteger(fee) ||
    fee < 0 ||
    fee > 0xffffff
  ) {
    throw new Error(
      "Invalid V4 fee"
    );
  }

  if (
    !Number.isInteger(tickSpacing)
  ) {
    throw new Error(
      "Invalid V4 tickSpacing"
    );
  }

  return {
    currency0:
      normalizeAddress(
        poolKey.currency0
      ),
    currency1:
      normalizeAddress(
        poolKey.currency1
      ),
    fee,
    tickSpacing,
    hooks:
      normalizeAddress(
        poolKey.hooks
      )
  };
}

function classifyV4Failure(error) {
  const errorCode =
    safeErrorCode(error);

  const infrastructureCodes =
    new Set([
      "NETWORK_ERROR",
      "SERVER_ERROR",
      "TIMEOUT",
      "ECONNRESET",
      "ECONNREFUSED",
      "ETIMEDOUT",
      "EHOSTUNREACH",
      "ENETUNREACH"
    ]);

  if (
    infrastructureCodes.has(
      errorCode
    ) ||
    errorCode.startsWith("HTTP_")
  ) {
    return {
      status: RPC_FAILURE,
      errorCode
    };
  }

  if (
    errorCode ===
    "CALL_EXCEPTION"
  ) {
    return {
      status: NO_ROUTE,
      errorCode
    };
  }

  return {
    status: RPC_FAILURE,
    errorCode
  };
}

async function observeV4Quote({
  provider,
  blockTag,
  poolKey,
  zeroForOne,
  amountIn,
  quoter = null
}) {
  if (!provider && !quoter) {
    throw new Error(
      "V4 quote requires provider"
    );
  }

  validateBlockTag(blockTag);

  const normalizedPoolKey =
    normalizePoolKey(poolKey);

  const exactAmount =
    positiveBigNumber(
      amountIn,
      "V4 amountIn"
    );

  if (
    typeof zeroForOne !==
    "boolean"
  ) {
    throw new Error(
      "V4 direction must be boolean"
    );
  }

  const contract =
    quoter ||
    new ethers.Contract(
      V4_QUOTER,
      V4_QUOTER_ABI,
      provider
    );

  try {
    const result =
      await contract.callStatic
        .quoteExactInputSingle(
          {
            poolKey:
              normalizedPoolKey,
            zeroForOne,
            exactAmount,
            hookData: "0x"
          },
          {
            blockTag
          }
        );

    const amountOut =
      ethers.BigNumber.from(
        result?.amountOut ??
        result?.[0] ??
        0
      );

    const gasEstimate =
      ethers.BigNumber.from(
        result?.gasEstimate ??
        result?.[1] ??
        0
      );

    if (amountOut.lte(0)) {
      return {
        status: NO_ROUTE
      };
    }

    return {
      status: QUOTE_OK,
      amountOut:
        amountOut.toString(),
      gasEstimate:
        gasEstimate.toString(),
      poolKey:
        normalizedPoolKey,
      zeroForOne
    };
  } catch (error) {
    return classifyV4Failure(
      error
    );
  }
}

function grossMetrics({
  amountIn,
  amountOut
}) {
  const start =
    positiveBigNumber(
      amountIn,
      "Gross amountIn"
    );

  const end =
    ethers.BigNumber.from(
      amountOut
    );

  const profitable =
    end.gte(start);

  const delta =
    profitable
      ? end.sub(start)
      : start.sub(end);

  // Signed integer basis points with six decimal places
  // of sub-bps precision:
  //
  // 1 bps = 1e6 grossBpsScaled units.
  const scale =
    ethers.BigNumber.from(
      "10000000000"
    );

  const magnitude =
    delta
      .mul(scale)
      .div(start);

  const signed =
    profitable
      ? magnitude
      : magnitude.mul(-1);

  return {
    amountIn:
      start.toString(),
    amountOut:
      end.toString(),
    grossDelta:
      profitable
        ? delta.toString()
        : `-${delta.toString()}`,
    grossBpsScaled:
      signed.toString()
  };
}

async function observeThreeLegEconomics({
  provider,
  blockTag,
  startToken,
  startAmount,
  entryVenue,
  entryToken,
  poolKey,
  zeroForOne,
  exitToken,
  exitVenue,
  observeOuterQuoteFn =
    observeQuote,
  observeV4QuoteFn =
    observeV4Quote
}) {
  validateBlockTag(blockTag);

  const start =
    normalizeAddress(startToken);

  const entry =
    normalizeAddress(entryToken);

  const exit =
    normalizeAddress(exitToken);

  const amount0 =
    positiveBigNumber(
      startAmount,
      "Start amount"
    );

  const entryQuote =
    await observeOuterQuoteFn({
      venueName:
        entryVenue,
      path: [
        start,
        entry
      ],
      amountIn:
        amount0,
      provider,
      blockTag
    });

  if (
    entryQuote.status !==
    QUOTE_OK
  ) {
    return {
      status:
        entryQuote.status,
      failedLeg: "ENTRY",
      entry:
        entryQuote
    };
  }

  const amount1 =
    positiveBigNumber(
      entryQuote.amountOut,
      "Entry amountOut"
    );

  const v4Quote =
    await observeV4QuoteFn({
      provider,
      blockTag,
      poolKey,
      zeroForOne,
      amountIn:
        amount1
    });

  if (
    v4Quote.status !==
    QUOTE_OK
  ) {
    return {
      status:
        v4Quote.status,
      failedLeg: "V4",
      entry:
        entryQuote,
      v4:
        v4Quote
    };
  }

  const amount2 =
    positiveBigNumber(
      v4Quote.amountOut,
      "V4 amountOut"
    );

  const exitQuote =
    await observeOuterQuoteFn({
      venueName:
        exitVenue,
      path: [
        exit,
        start
      ],
      amountIn:
        amount2,
      provider,
      blockTag
    });

  if (
    exitQuote.status !==
    QUOTE_OK
  ) {
    return {
      status:
        exitQuote.status,
      failedLeg: "EXIT",
      entry:
        entryQuote,
      v4:
        v4Quote,
      exit:
        exitQuote
    };
  }

  const metrics =
    grossMetrics({
      amountIn:
        amount0,
      amountOut:
        exitQuote.amountOut
    });

  return {
    status: QUOTE_OK,
    blockTag,
    entry:
      entryQuote,
    v4:
      v4Quote,
    exit:
      exitQuote,
    amounts: {
      start:
        amount0.toString(),
      afterEntry:
        amount1.toString(),
      afterV4:
        amount2.toString(),
      final:
        String(
          exitQuote.amountOut
        )
    },
    ...metrics
  };
}

module.exports = {
  V4_QUOTER,
  V4_QUOTER_ABI,
  normalizePoolKey,
  classifyV4Failure,
  observeV4Quote,
  grossMetrics,
  observeThreeLegEconomics
};
