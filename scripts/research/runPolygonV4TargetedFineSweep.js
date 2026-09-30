"use strict";

const { ethers } = require("ethers");

const {
  observeThreeLegEconomics
} = require(
  "../utils/polygonV4EconomicsObserver"
);

const {
  BLOCK_TAG,
  POOL_ID,
  POOL_KEY
} = require(
  "./runPolygonV4TargetedSweep"
);

const CHAIN_ID = 137;

const WPOL =
  "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";

const DAI =
  "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";

const APEPE =
  "0xA3f751662e282E83EC3cBc387d225Ca56dD63D3A";

const SIZES = [
  "0.100",
  "0.105",
  "0.110",
  "0.115",
  "0.120",
  "0.125",
  "0.130",
  "0.135",
  "0.140",
  "0.145",
  "0.150"
];

const ANCHORS = {
  "100000000000000000": {
    afterEntry:
      "11586064798235685",
    afterV4:
      "10323569675097080630947",
    final:
      "116257072989558983",
    grossDelta:
      "16257072989558983"
  },
  "150000000000000000": {
    afterEntry:
      "17377138307892278",
    afterV4:
      "14754369960206363549912",
    final:
      "166153740666787627",
    grossDelta:
      "16153740666787627"
  }
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

function anchorMatches(
  amount,
  result
) {
  const expected =
    ANCHORS[amount];

  if (!expected) {
    return null;
  }

  return (
    result.status === "QUOTE_OK" &&
    result.amounts?.start ===
      amount &&
    result.amounts?.afterEntry ===
      expected.afterEntry &&
    result.amounts?.afterV4 ===
      expected.afterV4 &&
    result.amounts?.final ===
      expected.final &&
    result.grossDelta ===
      expected.grossDelta
  );
}

function grossDeltaBigInt(row) {
  if (
    row.status !== "QUOTE_OK" ||
    row.grossDelta == null
  ) {
    return null;
  }

  return BigInt(row.grossDelta);
}

function bestQuotedRow(rows) {
  let best = null;

  for (const row of rows) {
    const gross =
      grossDeltaBigInt(row);

    if (gross == null) {
      continue;
    }

    if (
      best == null ||
      gross >
        grossDeltaBigInt(best)
    ) {
      best = row;
    }
  }

  return best;
}

async function runFineSweep({
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

    const anchor =
      anchorMatches(
        amount,
        result
      );

    if (anchor === false) {
      throw new Error(
        `Pinned ${display} WPOL ` +
        `anchor mismatch`
      );
    }

    if (anchor === true) {
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
    "===== POLYGON V4 TARGETED FINE SWEEP ====="
  );

  console.log(
    `Pinned block: ${BLOCK_TAG}`
  );

  console.log(
    `PoolId: ${POOL_ID}`
  );

  console.log(
    "Range: 0.100-0.150 WPOL"
  );

  console.log(
    "Step: 0.005 WPOL"
  );

  console.log(
    "No signer. No transaction."
  );

  const rows =
    await runFineSweep({
      provider
    });

  console.log();
  console.log(
    "===== FINE CURVE SUMMARY ====="
  );

  console.table(
    rows.map(row => ({
      WPOL:
        row.startDisplay,
      status:
        row.status,
      final:
        row.final,
      grossDelta:
        row.grossDelta,
      grossBps:
        row.grossBps
    }))
  );

  const best =
    bestQuotedRow(rows);

  console.log();

  if (best) {
    console.log(
      "BEST OBSERVED SIZE:",
      best.startDisplay,
      "WPOL"
    );

    console.log(
      "BEST GROSS DELTA:",
      best.grossDelta
    );

    console.log(
      "BEST GROSS BPS:",
      best.grossBps
    );
  }

  console.log();
  console.log(
    "TARGETED FINE SWEEP COMPLETE"
  );
}

if (
  require.main === module
) {
  main().catch(error => {
    console.error(
      "TARGETED_FINE_SWEEP_FAILED",
      error?.code ||
        error?.name ||
        "UNKNOWN"
    );

    process.exitCode = 1;
  });
}

module.exports = {
  SIZES,
  ANCHORS,
  exactAmounts,
  anchorMatches,
  bestQuotedRow,
  runFineSweep
};
