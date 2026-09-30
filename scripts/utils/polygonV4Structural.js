"use strict";

const { ethers } = require("ethers");
const scannerTokens =
  require("./polygonScannerTokens");

const NATIVE_POL =
  "0x0000000000000000000000000000000000000000";

const CORE_BY_ADDRESS =
  Object.freeze(
    Object.fromEntries(
      Object.entries(scannerTokens).map(
        ([symbol, token]) => [
          token.address.toLowerCase(),
          Object.freeze({
            symbol,
            address: token.address,
            decimals: token.decimals
          })
        ]
      )
    )
  );

function normalizeAddress(address) {
  if (
    typeof address !== "string" ||
    !ethers.utils.isAddress(address)
  ) {
    throw new Error(
      `Invalid token address: ${String(address)}`
    );
  }

  return ethers.utils
    .getAddress(address)
    .toLowerCase();
}

function classifyCurrency(address) {
  const normalized =
    normalizeAddress(address);

  if (
    normalized ===
    NATIVE_POL
  ) {
    return {
      kind: "NATIVE_POL",
      address: normalized,
      symbol: "POL",
      core: false
    };
  }

  const core =
    CORE_BY_ADDRESS[normalized];

  if (core) {
    return {
      kind: "CORE",
      address: normalized,
      symbol: core.symbol,
      decimals: core.decimals,
      core: true
    };
  }

  return {
    kind: "EXOTIC",
    address: normalized,
    symbol: null,
    core: false
  };
}

function classifyActivePool(pool) {
  if (
    !pool ||
    typeof pool !== "object" ||
    !pool.poolId ||
    !pool.poolKey
  ) {
    throw new Error(
      "Structural classification requires discovered pool metadata"
    );
  }

  const currency0 =
    classifyCurrency(
      pool.poolKey.currency0
    );

  const currency1 =
    classifyCurrency(
      pool.poolKey.currency1
    );

  const nativePol =
    currency0.kind === "NATIVE_POL" ||
    currency1.kind === "NATIVE_POL";

  let category;

  if (nativePol) {
    category =
      "NATIVE_POL_QUARANTINED";
  } else if (
    currency0.core &&
    currency1.core
  ) {
    category =
      "CORE_CORE";
  } else if (
    currency0.core ||
    currency1.core
  ) {
    category =
      "CORE_EXOTIC";
  } else {
    category =
      "EXOTIC_EXOTIC";
  }

  const exoticCurrencies =
    [currency0, currency1]
      .filter(
        currency =>
          currency.kind === "EXOTIC"
      )
      .map(
        currency => currency.address
      );

  const coreCurrencies =
    [currency0, currency1]
      .filter(
        currency =>
          currency.kind === "CORE"
      )
      .map(
        currency => ({
          symbol: currency.symbol,
          address: currency.address,
          decimals: currency.decimals
        })
      );

  return {
    poolId:
      String(pool.poolId).toLowerCase(),
    category,
    quarantined:
      nativePol,
    currency0,
    currency1,
    coreCurrencies,
    exoticCurrencies,
    poolKey: pool.poolKey
  };
}

function classifyActivePools({
  discoveredPools,
  activeObservations
}) {
  if (
    !Array.isArray(discoveredPools) ||
    !Array.isArray(activeObservations)
  ) {
    throw new Error(
      "Structural classification requires discovery and ACTIVE arrays"
    );
  }

  const discovered =
    new Map(
      discoveredPools.map(
        pool => [
          String(pool.poolId).toLowerCase(),
          pool
        ]
      )
    );

  const activeIds =
    activeObservations
      .filter(
        observation =>
          observation.ok &&
          observation.active
      )
      .map(
        observation =>
          String(
            observation.poolId
          ).toLowerCase()
      );

  const classified = [];

  for (const poolId of activeIds) {
    const pool =
      discovered.get(poolId);

    if (!pool) {
      throw new Error(
        `ACTIVE PoolId missing from DISCOVERY: ${poolId}`
      );
    }

    classified.push(
      classifyActivePool(pool)
    );
  }

  const counts = {
    totalActive:
      classified.length,
    coreCore: 0,
    coreExotic: 0,
    exoticExotic: 0,
    nativePolQuarantined: 0
  };

  for (const item of classified) {
    switch (item.category) {
      case "CORE_CORE":
        counts.coreCore += 1;
        break;

      case "CORE_EXOTIC":
        counts.coreExotic += 1;
        break;

      case "EXOTIC_EXOTIC":
        counts.exoticExotic += 1;
        break;

      case "NATIVE_POL_QUARANTINED":
        counts.nativePolQuarantined += 1;
        break;

      default:
        throw new Error(
          `Unknown structural category: ${item.category}`
        );
    }
  }

  return {
    pools: classified,
    counts
  };
}

module.exports = {
  NATIVE_POL,
  CORE_BY_ADDRESS,
  normalizeAddress,
  classifyCurrency,
  classifyActivePool,
  classifyActivePools
};
