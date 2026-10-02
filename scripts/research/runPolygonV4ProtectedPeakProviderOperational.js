"use strict";

const { ethers } =
  require("ethers");

const {
  runProtectedPeakProviderTimedCadence
} = require(
  "./runPolygonV4ProtectedPeakProviderTimedCadence"
);

const CHAIN_ID = 137;

const OPERATIONAL_COUNT = 2;
const OPERATIONAL_MINIMUM_BLOCK_GAP = 1;
const OPERATIONAL_MAX_ATTEMPTS = 3;
const OPERATIONAL_MAX_CYCLES = 2;
const OPERATIONAL_WAIT_MS = 5000;

function createPolygonProvider(
  rpc
) {
  if (!rpc) {
    throw new Error(
      "INFURA_POLYGON is not set"
    );
  }

  return new ethers.providers
    .JsonRpcProvider(
      rpc,
      CHAIN_ID
    );
}

async function runProtectedPeakProviderOperational({
  rpc,
  count,
  minimumBlockGap,
  maxAttempts,
  maxCycles,
  waitMs,
  amounts,
  createProviderFn =
    createPolygonProvider,
  runTimedCadenceFn =
    runProtectedPeakProviderTimedCadence
}) {
  if (
    typeof createProviderFn !==
      "function"
  ) {
    throw new Error(
      "createProviderFn must be a function"
    );
  }

  if (
    typeof runTimedCadenceFn !==
      "function"
  ) {
    throw new Error(
      "runTimedCadenceFn must be a function"
    );
  }

  const provider =
    createProviderFn(
      rpc
    );

  return runTimedCadenceFn({
    provider,
    count,
    minimumBlockGap,
    maxAttempts,
    maxCycles,
    waitMs,
    ...(amounts === undefined
      ? {}
      : { amounts })
  });
}

async function main() {
  const result =
    await runProtectedPeakProviderOperational({
      rpc:
        process.env
          .INFURA_POLYGON,
      count:
        OPERATIONAL_COUNT,
      minimumBlockGap:
        OPERATIONAL_MINIMUM_BLOCK_GAP,
      maxAttempts:
        OPERATIONAL_MAX_ATTEMPTS,
      maxCycles:
        OPERATIONAL_MAX_CYCLES,
      waitMs:
        OPERATIONAL_WAIT_MS
    });

  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  CHAIN_ID,
  OPERATIONAL_COUNT,
  OPERATIONAL_MINIMUM_BLOCK_GAP,
  OPERATIONAL_MAX_ATTEMPTS,
  OPERATIONAL_MAX_CYCLES,
  OPERATIONAL_WAIT_MS,
  createPolygonProvider,
  runProtectedPeakProviderOperational,
  main
};
