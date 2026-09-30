"use strict";

// Read-only Polygon V4 STRUCTURAL observation primitives.
//
// This module:
//   - reads ERC20 decimals at a pinned block
//   - probes external connectivity using known 1-token amounts
//   - preserves QUOTE_OK / NO_ROUTE / RPC_FAILURE semantics
//
// It does NOT:
//   - use a signer or wallet
//   - approve or submit transactions
//   - modify ProfitBot execution routes
//   - treat infrastructure uncertainty as structural rejection

const { ethers } = require("ethers");

const scannerTokens =
  require("./polygonScannerTokens");

const scannerVenues =
  require("./polygonScannerVenues");

const {
  QUOTE_OK,
  NO_ROUTE,
  RPC_FAILURE,
  safeErrorCode,
  observeQuote
} = require("./polygonV4OuterQuoteObserver");

const ERC20_DECIMALS_ABI = [
  "function decimals() view returns (uint8)"
];

const METADATA_OK =
  "METADATA_OK";

function normalizeAddress(address) {
  if (
    typeof address !== "string" ||
    !ethers.utils.isAddress(address)
  ) {
    throw new Error(
      `Invalid ERC20 address: ${String(address)}`
    );
  }

  return ethers.utils
    .getAddress(address);
}

function validateDecimals(decimals) {
  const value =
    Number(decimals);

  if (
    !Number.isInteger(value) ||
    value < 0 ||
    value > 255
  ) {
    throw new Error(
      `Invalid ERC20 decimals: ${String(decimals)}`
    );
  }

  return value;
}

function oneTokenAmount(decimals) {
  return ethers.utils.parseUnits(
    "1",
    validateDecimals(decimals)
  );
}

function coreTokens() {
  return Object.entries(
    scannerTokens
  ).map(
    ([symbol, token]) => ({
      symbol,
      address:
        normalizeAddress(
          token.address
        ),
      decimals:
        validateDecimals(
          token.decimals
        )
    })
  );
}

function outerVenueNames() {
  return Object.keys(
    scannerVenues
  );
}

async function observeTokenDecimals({
  provider,
  tokenAddress,
  blockTag,
  contract = null
}) {
  if (!provider) {
    throw new Error(
      "Token metadata observation requires provider"
    );
  }

  if (
    !Number.isInteger(blockTag) ||
    blockTag <= 0
  ) {
    throw new Error(
      "Token metadata observation requires pinned block"
    );
  }

  const address =
    normalizeAddress(
      tokenAddress
    );

  const token =
    contract ||
    new ethers.Contract(
      address,
      ERC20_DECIMALS_ABI,
      provider
    );

  try {
    const rawDecimals =
      await token.decimals({
        blockTag
      });

    const decimals =
      validateDecimals(
        rawDecimals
      );

    return {
      tokenAddress:
        address.toLowerCase(),
      blockTag,
      status:
        METADATA_OK,
      decimals
    };
  } catch (error) {
    // Metadata uncertainty must never reject a market.
    // Persist only a safe code, never provider error text.
    return {
      tokenAddress:
        address.toLowerCase(),
      blockTag,
      status:
        RPC_FAILURE,
      errorCode:
        safeErrorCode(error)
    };
  }
}

function summarizeDirection(
  observations
) {
  if (
    !Array.isArray(observations)
  ) {
    throw new Error(
      "Direction observations must be an array"
    );
  }

  const quoteOk =
    observations.filter(
      item =>
        item.status ===
        QUOTE_OK
    );

  const rpcFailures =
    observations.filter(
      item =>
        item.status ===
        RPC_FAILURE
    );

  if (quoteOk.length > 0) {
    return {
      status:
        QUOTE_OK,
      connected: true,
      venues:
        quoteOk.map(
          item => item.venue
        )
    };
  }

  if (
    rpcFailures.length > 0
  ) {
    return {
      status:
        RPC_FAILURE,
      connected: null,
      venues: []
    };
  }

  return {
    status:
      NO_ROUTE,
    connected: false,
    venues: []
  };
}

async function observeDirection({
  provider,
  blockTag,
  tokenIn,
  tokenOut,
  amountIn,
  venueNames =
    outerVenueNames(),
  observeQuoteFn =
    observeQuote
}) {
  if (
    !Array.isArray(venueNames) ||
    venueNames.length === 0
  ) {
    throw new Error(
      "Structural observation requires outer venues"
    );
  }

  const path = [
    normalizeAddress(tokenIn),
    normalizeAddress(tokenOut)
  ];

  const observations = [];

  for (
    const venueName of venueNames
  ) {
    const result =
      await observeQuoteFn({
        venueName,
        path,
        amountIn,
        provider,
        blockTag
      });

    observations.push({
      venue:
        venueName,
      status:
        result.status,
      ...(result.amountOut !== undefined
        ? {
            amountOut:
              String(
                result.amountOut
              )
          }
        : {}),
      ...(result.fee !== undefined
        ? {
            fee:
              result.fee
          }
        : {}),
      ...(result.pool !== undefined
        ? {
            pool:
              result.pool
          }
        : {}),
      ...(result.errorCode
        ? {
            errorCode:
              result.errorCode
          }
        : {})
    });
  }

  return {
    observations,
    summary:
      summarizeDirection(
        observations
      )
  };
}

async function observeTokenAgainstCore({
  provider,
  blockTag,
  coreToken,
  candidateAddress,
  candidateDecimals,
  venueNames =
    outerVenueNames(),
  observeQuoteFn =
    observeQuote
}) {
  if (
    !coreToken ||
    typeof coreToken !== "object"
  ) {
    throw new Error(
      "Structural observation requires core token"
    );
  }

  const coreAddress =
    normalizeAddress(
      coreToken.address
    );

  const candidate =
    normalizeAddress(
      candidateAddress
    );

  if (
    coreAddress.toLowerCase() ===
    candidate.toLowerCase()
  ) {
    throw new Error(
      "Core and candidate token must differ"
    );
  }

  const coreAmount =
    oneTokenAmount(
      coreToken.decimals
    );

  const candidateAmount =
    oneTokenAmount(
      candidateDecimals
    );

  const entry =
    await observeDirection({
      provider,
      blockTag,
      tokenIn:
        coreAddress,
      tokenOut:
        candidate,
      amountIn:
        coreAmount,
      venueNames,
      observeQuoteFn
    });

  const exit =
    await observeDirection({
      provider,
      blockTag,
      tokenIn:
        candidate,
      tokenOut:
        coreAddress,
      amountIn:
        candidateAmount,
      venueNames,
      observeQuoteFn
    });

  return {
    core: {
      symbol:
        coreToken.symbol,
      address:
        coreAddress.toLowerCase(),
      decimals:
        validateDecimals(
          coreToken.decimals
        )
    },

    candidate: {
      address:
        candidate.toLowerCase(),
      decimals:
        validateDecimals(
          candidateDecimals
        )
    },

    blockTag,

    entry,
    exit,

    hasEntry:
      entry.summary.connected,

    hasExit:
      exit.summary.connected,

    conclusive:
      entry.summary.status !==
        RPC_FAILURE &&
      exit.summary.status !==
        RPC_FAILURE
  };
}

module.exports = {
  ERC20_DECIMALS_ABI,
  METADATA_OK,
  normalizeAddress,
  validateDecimals,
  oneTokenAmount,
  coreTokens,
  outerVenueNames,
  observeTokenDecimals,
  summarizeDirection,
  observeDirection,
  observeTokenAgainstCore
};
