"use strict";

const { ethers } = require("ethers");

// Polygon Uniswap V4 StateView.
const STATE_VIEW =
  "0x5ea1bd7974c8a611cbab0bdcafcb1d9cc9b3ba5a";

const STATE_VIEW_ABI = [
  "function getLiquidity(bytes32 poolId) external view returns (uint128 liquidity)"
];

function normalizePoolId(poolId) {
  if (
    typeof poolId !== "string" ||
    !/^0x[0-9a-fA-F]{64}$/.test(poolId)
  ) {
    throw new Error(
      `Invalid V4 PoolId: ${String(poolId)}`
    );
  }

  return poolId.toLowerCase();
}

function makeStateView(provider) {
  if (!provider) {
    throw new Error("provider is required");
  }

  return new ethers.Contract(
    STATE_VIEW,
    STATE_VIEW_ABI,
    provider
  );
}

async function readPoolLiquidity({
  stateView,
  poolId,
  blockTag
}) {
  if (!stateView) {
    throw new Error("stateView is required");
  }

  if (
    !Number.isInteger(blockTag) ||
    blockTag < 0
  ) {
    throw new Error(
      "blockTag must be a non-negative integer"
    );
  }

  const normalizedPoolId =
    normalizePoolId(poolId);

  try {
    const raw =
      await stateView.getLiquidity(
        normalizedPoolId,
        {
          blockTag
        }
      );

    const liquidity =
      ethers.BigNumber.from(raw);

    return {
      poolId: normalizedPoolId,
      blockTag,
      ok: true,
      liquidity:
        liquidity.toString(),
      active:
        !liquidity.isZero()
    };
  } catch (error) {
    return {
      poolId: normalizedPoolId,
      blockTag,
      ok: false,
      errorCode:
        typeof error?.code === "string"
          ? error.code
          : "UNKNOWN"
    };
  }
}

async function inspectPoolActivity({
  stateView,
  pools,
  blockTag,
  onObservation = null
}) {
  if (!Array.isArray(pools)) {
    throw new Error(
      "pools must be an array"
    );
  }

  const observations = [];

  for (const pool of pools) {
    const observation =
      await readPoolLiquidity({
        stateView,
        poolId: pool.poolId,
        blockTag
      });

    observations.push(
      observation
    );

    if (onObservation) {
      await onObservation(
        observation,
        pool
      );
    }
  }

  const successful =
    observations.filter(
      item => item.ok
    );

  const failures =
    observations.filter(
      item => !item.ok
    );

  const active =
    successful.filter(
      item => item.active
    );

  const inactive =
    successful.filter(
      item => !item.active
    );

  return {
    observations,
    active,
    inactive,
    failures
  };
}

module.exports = {
  STATE_VIEW,
  STATE_VIEW_ABI,
  normalizePoolId,
  makeStateView,
  readPoolLiquidity,
  inspectPoolActivity
};
