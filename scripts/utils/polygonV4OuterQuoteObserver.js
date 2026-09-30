"use strict";

// Strict read-only quote observation for resumable Polygon V4 research.
//
// Unlike the legacy discovery quote helpers, this module preserves the
// distinction between:
//   QUOTE_OK    - positive usable quote observed
//   NO_ROUTE    - deterministic evidence that this route is unavailable
//   RPC_FAILURE - infrastructure/ambiguous failure; must remain retryable
//
// No signer, wallet, approvals, or transaction submission.

const { ethers } = require("ethers");

const venues =
  require("./polygonScannerVenues");

const {
  FULL_FEE_TIERS
} = require("./uniswapV3Quote");

const V2_ROUTER_ABI = [
  "function getAmountsOut(uint256 amountIn,address[] path) view returns(uint256[] amounts)"
];

const V3_FACTORY_ABI = [
  "function getPool(address tokenA,address tokenB,uint24 fee) view returns (address pool)"
];

const V3_QUOTER_ABI = [
  "function quoteExactInputSingle(address tokenIn,address tokenOut,uint24 fee,uint256 amountIn,uint160 sqrtPriceLimitX96) returns (uint256 amountOut)"
];

const QUOTE_OK =
  "QUOTE_OK";

const NO_ROUTE =
  "NO_ROUTE";

const RPC_FAILURE =
  "RPC_FAILURE";

const INFRASTRUCTURE_CODES =
  new Set([
    "SERVER_ERROR",
    "NETWORK_ERROR",
    "TIMEOUT",
    "UNKNOWN_ERROR",
    "ECONNRESET",
    "ETIMEDOUT",
    "ECONNREFUSED",
    "EAI_AGAIN"
  ]);

function safeErrorCode(error) {
  const code =
    error?.code;

  if (
    typeof code === "string" &&
    code.length > 0
  ) {
    return code;
  }

  const status =
    error?.response?.status;

  if (
    Number.isInteger(status)
  ) {
    return `HTTP_${status}`;
  }

  return "UNKNOWN";
}

function isInfrastructureFailure(error) {
  const code =
    safeErrorCode(error);

  if (
    INFRASTRUCTURE_CODES.has(code)
  ) {
    return true;
  }

  if (
    code.startsWith("HTTP_")
  ) {
    const status =
      Number(
        code.slice(5)
      );

    if (
      status === 408 ||
      status === 425 ||
      status === 429 ||
      status >= 500
    ) {
      return true;
    }
  }

  return false;
}

function classifyCallFailure(error) {
  const errorCode =
    safeErrorCode(error);

  if (
    isInfrastructureFailure(error)
  ) {
    return {
      status: RPC_FAILURE,
      errorCode
    };
  }

  // A CALL_EXCEPTION from a contract call can represent a deterministic
  // router/quoter revert. This is usable as NO_ROUTE evidence only when
  // the caller already knows the target contract/pool exists.
  if (
    errorCode === "CALL_EXCEPTION"
  ) {
    return {
      status: NO_ROUTE,
      errorCode
    };
  }

  // Unknown/ambiguous errors must never reject a market.
  return {
    status: RPC_FAILURE,
    errorCode
  };
}

function validateObservationInput({
  venueName,
  path,
  amountIn,
  provider,
  blockTag
}) {
  const venue =
    venues[venueName];

  if (!venue) {
    throw new Error(
      `Unknown Polygon venue: ${venueName}`
    );
  }

  if (
    !Array.isArray(path) ||
    path.length !== 2 ||
    !ethers.utils.isAddress(path[0]) ||
    !ethers.utils.isAddress(path[1])
  ) {
    throw new Error(
      "Strict quote observation requires two token addresses"
    );
  }

  if (!provider) {
    throw new Error(
      "Strict quote observation requires provider"
    );
  }

  if (
    !amountIn ||
    typeof amountIn.lte !== "function" ||
    amountIn.lte(0)
  ) {
    throw new Error(
      "Strict quote observation requires positive amount"
    );
  }

  if (
    !Number.isInteger(blockTag) ||
    blockTag <= 0
  ) {
    throw new Error(
      "Strict quote observation requires pinned block"
    );
  }

  return venue;
}

async function observeV2Quote({
  venueName,
  path,
  amountIn,
  provider,
  blockTag,
  router = null
}) {
  const venue =
    validateObservationInput({
      venueName,
      path,
      amountIn,
      provider,
      blockTag
    });

  if (
    venue.type !== "V2"
  ) {
    throw new Error(
      `Venue is not V2: ${venueName}`
    );
  }

  const contract =
    router ||
    new ethers.Contract(
      venue.router,
      V2_ROUTER_ABI,
      provider
    );

  try {
    const amounts =
      await contract.getAmountsOut(
        amountIn,
        path,
        { blockTag }
      );

    const amountOut =
      amounts?.[
        amounts.length - 1
      ];

    if (
      !amountOut ||
      typeof amountOut.gt !== "function" ||
      !amountOut.gt(0)
    ) {
      return {
        venue: venueName,
        status: NO_ROUTE
      };
    }

    return {
      venue: venueName,
      status: QUOTE_OK,
      amountOut:
        amountOut.toString(),
      fee: null,
      pool: null
    };
  } catch (error) {
    return {
      venue: venueName,
      ...classifyCallFailure(
        error
      )
    };
  }
}

async function observeV3Quote({
  venueName,
  path,
  amountIn,
  provider,
  blockTag,
  factory = null,
  quoter = null,
  feeTiers = FULL_FEE_TIERS
}) {
  const venue =
    validateObservationInput({
      venueName,
      path,
      amountIn,
      provider,
      blockTag
    });

  if (
    venue.type !== "V3"
  ) {
    throw new Error(
      `Venue is not V3: ${venueName}`
    );
  }

  if (
    !Array.isArray(feeTiers) ||
    feeTiers.length === 0
  ) {
    throw new Error(
      "V3 observation requires fee tiers"
    );
  }

  const factoryContract =
    factory ||
    new ethers.Contract(
      venue.factory,
      V3_FACTORY_ABI,
      provider
    );

  const quoterContract =
    quoter ||
    new ethers.Contract(
      venue.quoter,
      V3_QUOTER_ABI,
      provider
    );

  const successfulQuotes = [];
  const tierResults = [];

  for (const fee of feeTiers) {
    let pool;

    try {
      pool =
        await factoryContract.getPool(
          path[0],
          path[1],
          fee,
          { blockTag }
        );
    } catch (error) {
      const failure =
        classifyCallFailure(
          error
        );

      // Factory lookup is not a known-pool quote call.
      // Even CALL_EXCEPTION here is ambiguous infrastructure/state
      // evidence and must remain retryable.
      tierResults.push({
        fee,
        status:
          RPC_FAILURE,
        errorCode:
          failure.errorCode
      });

      continue;
    }

    if (
      !pool ||
      pool.toLowerCase() ===
        ethers.constants.AddressZero
          .toLowerCase()
    ) {
      tierResults.push({
        fee,
        status: NO_ROUTE,
        reason: "NO_POOL"
      });

      continue;
    }

    try {
      const amountOut =
        await quoterContract
          .callStatic
          .quoteExactInputSingle(
            path[0],
            path[1],
            fee,
            amountIn,
            0,
            { blockTag }
          );

      if (
        !amountOut ||
        typeof amountOut.gt !== "function" ||
        !amountOut.gt(0)
      ) {
        tierResults.push({
          fee,
          pool,
          status: NO_ROUTE,
          reason:
            "ZERO_OUTPUT"
        });

        continue;
      }

      const quote = {
        fee,
        pool,
        amountOut:
          amountOut.toString()
      };

      successfulQuotes.push(
        quote
      );

      tierResults.push({
        fee,
        pool,
        status: QUOTE_OK,
        amountOut:
          quote.amountOut
      });
    } catch (error) {
      tierResults.push({
        fee,
        pool,
        ...classifyCallFailure(
          error
        )
      });
    }
  }

  if (
    successfulQuotes.length > 0
  ) {
    const best =
      successfulQuotes.reduce(
        (current, candidate) => {
          if (!current) {
            return candidate;
          }

          return ethers.BigNumber
            .from(candidate.amountOut)
            .gt(
              ethers.BigNumber.from(
                current.amountOut
              )
            )
            ? candidate
            : current;
        },
        null
      );

    return {
      venue: venueName,
      status: QUOTE_OK,
      amountOut:
        best.amountOut,
      fee:
        best.fee,
      pool:
        best.pool,
      tierResults
    };
  }

  const infrastructureFailure =
    tierResults.find(
      result =>
        result.status ===
        RPC_FAILURE
    );

  if (infrastructureFailure) {
    return {
      venue: venueName,
      status: RPC_FAILURE,
      errorCode:
        infrastructureFailure
          .errorCode,
      tierResults
    };
  }

  return {
    venue: venueName,
    status: NO_ROUTE,
    tierResults
  };
}

async function observeQuote(args) {
  const venue =
    venues[
      args?.venueName
    ];

  if (!venue) {
    throw new Error(
      `Unknown Polygon venue: ${
        args?.venueName
      }`
    );
  }

  if (
    venue.type === "V2"
  ) {
    return observeV2Quote(
      args
    );
  }

  if (
    venue.type === "V3"
  ) {
    return observeV3Quote(
      args
    );
  }

  throw new Error(
    `Unsupported Polygon venue type: ${venue.type}`
  );
}

module.exports = {
  QUOTE_OK,
  NO_ROUTE,
  RPC_FAILURE,
  V2_ROUTER_ABI,
  V3_FACTORY_ABI,
  V3_QUOTER_ABI,
  safeErrorCode,
  isInfrastructureFailure,
  classifyCallFailure,
  observeV2Quote,
  observeV3Quote,
  observeQuote
};
