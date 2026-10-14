"use strict";

const { ethers } = require("ethers");

const {
  observeThreeLegEconomics
} = require(
  "../utils/polygonV4EconomicsObserver"
);

const CHAIN_ID = 137;
const BLOCK_TAG = 94709817;

const WPOL =
  "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";

const DAI =
  "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";

const APEPE =
  "0xA3f751662e282E83EC3cBc387d225Ca56dD63D3A";

const POOL_ID =
  "0x6c6627aba26b073dd60b88b472b608f4f48f4e9eb5635efbd32095a76bea6c60";

const POOL_KEY = {
  currency0: DAI,
  currency1: APEPE,
  fee: 10000,
  tickSpacing: 100,
  hooks:
    "0x0000000000000000000000000000000000000000"
};

const SIZES = [
  "0.010",
  "0.025",
  "0.050",
  "0.075",
  "0.100",
  "0.150",
  "0.250"
];

const ANCHOR = {
  amount:
    "75000000000000000",
  afterEntry:
    "8690038403854853",
  afterV4:
    "7939349213413441512076",
  final:
    "89407595682158196",
  grossDelta:
    "14407595682158196"
};

function exactAmounts() {
  return SIZES.map(size => ({
    display: size,
    amount:
      ethers.utils
        .parseUnits(size, 18)
        .toString()
  }));
}

function bpsFromScaled(value) {
  if (value == null) {
    return null;
  }

  return (
    Number(
      ethers.BigNumber
        .from(value)
        .toString()
    ) / 1e6
  );
}

function anchorMatches(result) {
  return (
    result.status === "QUOTE_OK" &&
    result.amounts?.start ===
      ANCHOR.amount &&
    result.amounts?.afterEntry ===
      ANCHOR.afterEntry &&
    result.amounts?.afterV4 ===
      ANCHOR.afterV4 &&
    result.amounts?.final ===
      ANCHOR.final &&
    result.grossDelta ===
      ANCHOR.grossDelta
  );
}

async function runSweep({
  provider,
  observeFn =
    observeThreeLegEconomics
}) {
  const rows = [];

  for (
    const {
      display,
      amount
    } of exactAmounts()
  ) {
    console.log();
    console.log(
      `WPOL ${display} ` +
      `(raw ${amount})`
    );

    const result =
      await observeFn({
        provider,
        blockTag:
          BLOCK_TAG,
        startToken:
          WPOL,
        startAmount:
          amount,
        entryVenue:
          "UNISWAP_V3",
        entryToken:
          DAI,
        poolKey:
          POOL_KEY,
        zeroForOne:
          true,
        exitToken:
          APEPE,
        exitVenue:
          "UNISWAP_V3"
      });

    const row = {
      poolId:
        POOL_ID,
      blockTag:
        BLOCK_TAG,
      startSymbol:
        "WPOL",
      startDisplay:
        display,
      startAmount:
        amount,
      entryVenue:
        "UNISWAP_V3",
      direction:
        "ZERO_FOR_ONE",
      exitVenue:
        "UNISWAP_V3",
      status:
        result.status,
      failedLeg:
        result.failedLeg ??
        null,
      afterEntry:
        result.amounts
          ?.afterEntry ??
        null,
      afterV4:
        result.amounts
          ?.afterV4 ??
        null,
      final:
        result.amounts
          ?.final ??
        null,
      grossDelta:
        result.grossDelta ??
        null,
      grossBps:
        bpsFromScaled(
          result.grossBpsScaled
        )
    };

    rows.push(row);

    console.log(row);

    if (
      amount ===
      ANCHOR.amount
    ) {
      if (!anchorMatches(result)) {
        throw new Error(
          "Pinned 0.075 WPOL anchor mismatch"
        );
      }

      console.log(
        "ANCHOR: EXACT MATCH"
      );
    }
  }

  return rows;
}

async function main() {
  const rpc =
    process.env.INFURA_POLYGON;

  if (!rpc) {
    throw new Error(
      "INFURA_POLYGON is not set"
    );
  }

  const provider =
    new ethers.providers
      .JsonRpcProvider(
        rpc,
        CHAIN_ID
      );

  const network =
    await provider.getNetwork();

  if (
    network.chainId !==
    CHAIN_ID
  ) {
    throw new Error(
      `Wrong network: expected ` +
      `${CHAIN_ID}, got ` +
      `${network.chainId}`
    );
  }

  console.log(
    "===== POLYGON V4 TARGETED SWEEP ====="
  );

  console.log(
    `Pinned block: ${BLOCK_TAG}`
  );

  console.log(
    `PoolId: ${POOL_ID}`
  );

  console.log(
    "Route: WPOL -> DAI -> " +
    "V4 APEPE -> WPOL"
  );

  console.log(
    "Venues: UNISWAP_V3 -> " +
    "V4 -> UNISWAP_V3"
  );

  console.log(
    "No signer. No transaction."
  );

  const rows =
    await runSweep({
      provider
    });

  console.log();
  console.log(
    "===== CURVE SUMMARY ====="
  );

  console.table(
    rows.map(row => ({
      WPOL:
        row.startDisplay,
      status:
        row.status,
      afterEntry:
        row.afterEntry,
      afterV4:
        row.afterV4,
      final:
        row.final,
      grossDelta:
        row.grossDelta,
      grossBps:
        row.grossBps
    }))
  );

  console.log();
  console.log(
    "TARGETED SWEEP COMPLETE"
  );
}

if (
  require.main === module
) {
  main().catch(error => {
    console.error(
      "TARGETED_SWEEP_FAILED",
      error?.code ||
        error?.name ||
        "UNKNOWN"
    );

    process.exitCode = 1;
  });
}

module.exports = {
  BLOCK_TAG,
  POOL_ID,
  POOL_KEY,
  SIZES,
  ANCHOR,
  exactAmounts,
  anchorMatches,
  runSweep
};
