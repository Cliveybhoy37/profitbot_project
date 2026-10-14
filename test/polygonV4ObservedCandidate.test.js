"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const { ethers } =
  require("ethers");

const {
  buildObservedV4Candidate
} = require(
  "../scripts/utils/polygonV4ObservedCandidate"
);

const {
  buildV4ExecutionLegs,
  encodeV4ExecutionLegs
} = require(
  "../scripts/utils/polygonV4ExecutionRoute"
);

const WPOL =
  "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";

const DAI =
  "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";

const APEPE =
  "0xA3f751662e282E83EC3cBc387d225Ca56dD63D3A";

const POOL_KEY = {
  currency0: DAI,
  currency1: APEPE,
  fee: 10000,
  tickSpacing: 100,
  hooks:
    ethers.constants.AddressZero
};

function observation() {
  return {
    status: "QUOTE_OK",
    blockTag: 94709817,

    amounts: {
      start:
        "125000000000000000"
    },

    entry: {
      venue: "UNISWAP_V3",
      status: "QUOTE_OK",
      fee: 100,
      amountOut:
        "14481764747850506"
    },

    v4: {
      status: "QUOTE_OK",
      amountOut:
        "12592522662788687883109",
      gasEstimate: "1",
      poolKey: POOL_KEY,
      zeroForOne: true
    },

    exit: {
      venue: "UNISWAP_V3",
      status: "QUOTE_OK",
      fee: 100,
      amountOut:
        "141808483715718886"
    }
  };
}

test(
  "converts complete quote evidence into executable V4 candidate",
  () => {
    const candidate =
      buildObservedV4Candidate({
        observation:
          observation(),
        startToken: WPOL,
        entryToken: DAI,
        exitToken: APEPE
      });

    assert.equal(
      candidate.blockTag,
      94709817
    );

    assert.equal(
      candidate.amountIn.toString(),
      "125000000000000000"
    );

    assert.equal(
      candidate.legs.length,
      3
    );

    assert.equal(
      candidate.legs[0].fee,
      100
    );

    assert.equal(
      candidate.legs[1]
        .poolKey.fee,
      10000
    );

    assert.equal(
      candidate.legs[1]
        .zeroForOne,
      true
    );

    assert.equal(
      candidate.legs[2].fee,
      100
    );

    const protectedLegs =
      buildV4ExecutionLegs(
        candidate.legs,
        50
      );

    const params =
      encodeV4ExecutionLegs(
        protectedLegs
      );

    assert.ok(
      ethers.utils.isHexString(
        params
      )
    );

    assert.equal(
      protectedLegs[2]
        .minAmountOut
        .toString(),
      "141099441297140291"
    );
  }
);

test(
  "uses the actually observed V3 fee tiers",
  () => {
    const evidence =
      observation();

    evidence.entry.fee = 500;
    evidence.exit.fee = 3000;

    const candidate =
      buildObservedV4Candidate({
        observation: evidence,
        startToken: WPOL,
        entryToken: DAI,
        exitToken: APEPE
      });

    assert.equal(
      candidate.legs[0].fee,
      500
    );

    assert.equal(
      candidate.legs[2].fee,
      3000
    );
  }
);

test(
  "rejects observation without execution fee metadata",
  () => {
    const evidence =
      observation();

    delete evidence.entry.fee;

    assert.throws(
      () =>
        buildObservedV4Candidate({
          observation: evidence,
          startToken: WPOL,
          entryToken: DAI,
          exitToken: APEPE
        }),
      /requires observed V3 fee/
    );
  }
);

test(
  "rejects observed V4 direction inconsistent with PoolKey route",
  () => {
    const evidence =
      observation();

    evidence.v4.zeroForOne =
      false;

    assert.throws(
      () =>
        buildObservedV4Candidate({
          observation:
            evidence,
          startToken: WPOL,
          entryToken: DAI,
          exitToken: APEPE
        }),
      /PoolKey\/direction does not match route/
    );
  }
);

test(
  "rejects incomplete or unsuccessful quote evidence",
  () => {
    const failed =
      observation();

    failed.status =
      "NO_ROUTE";

    assert.throws(
      () =>
        buildObservedV4Candidate({
          observation: failed,
          startToken: WPOL,
          entryToken: DAI,
          exitToken: APEPE
        }),
      /requires QUOTE_OK/
    );

    const incomplete =
      observation();

    delete incomplete.exit;

    assert.throws(
      () =>
        buildObservedV4Candidate({
          observation:
            incomplete,
          startToken: WPOL,
          entryToken: DAI,
          exitToken: APEPE
        }),
      /requires all three observed legs/
    );
  }
);


test(
  "requires observed block and start-amount provenance",
  () => {
    const missingBlock =
      observation();

    delete missingBlock.blockTag;

    assert.throws(
      () =>
        buildObservedV4Candidate({
          observation:
            missingBlock,
          startToken: WPOL,
          entryToken: DAI,
          exitToken: APEPE
        }),
      /requires observed blockTag/
    );

    const missingAmounts =
      observation();

    delete missingAmounts.amounts;

    assert.throws(
      () =>
        buildObservedV4Candidate({
          observation:
            missingAmounts,
          startToken: WPOL,
          entryToken: DAI,
          exitToken: APEPE
        }),
      /requires observed start amount/
    );

    const missingStart =
      observation();

    delete missingStart.amounts.start;

    assert.throws(
      () =>
        buildObservedV4Candidate({
          observation:
            missingStart,
          startToken: WPOL,
          entryToken: DAI,
          exitToken: APEPE
        }),
      /Observed start amount/
    );

    const zeroStart =
      observation();

    zeroStart.amounts.start = "0";

    assert.throws(
      () =>
        buildObservedV4Candidate({
          observation:
            zeroStart,
          startToken: WPOL,
          entryToken: DAI,
          exitToken: APEPE
        }),
      /Observed start amount must be positive/
    );
  }
);

test(
  "preserves observed Sushi V2 entry venue without V3 fee metadata",
  () => {
    const evidence =
      observation();

    evidence.entry.venue =
      "SUSHISWAP_V2";

    evidence.entry.fee =
      null;

    evidence.entry.pool =
      null;

    const candidate =
      buildObservedV4Candidate({
        observation: evidence,
        startToken: WPOL,
        entryToken: DAI,
        exitToken: APEPE
      });

    assert.equal(
      candidate.legs[0].venue,
      "SUSHISWAP_V2"
    );

    assert.equal(
      candidate.legs[0].fee,
      undefined
    );

    const protectedLegs =
      buildV4ExecutionLegs(
        candidate.legs,
        50
      );

    assert.equal(
      protectedLegs[0].venue,
      1
    );

    assert.equal(
      protectedLegs[0].venueData,
      "0x"
    );
  }
);

test(
  "preserves observed QuickSwap V2 entry venue without V3 fee metadata",
  () => {
    const evidence =
      observation();

    evidence.entry.venue =
      "QUICKSWAP_V2";

    evidence.entry.fee =
      null;

    evidence.entry.pool =
      null;

    const candidate =
      buildObservedV4Candidate({
        observation: evidence,
        startToken: WPOL,
        entryToken: DAI,
        exitToken: APEPE
      });

    assert.equal(
      candidate.legs[0].venue,
      "QUICKSWAP_V2"
    );

    assert.equal(
      candidate.legs[0].fee,
      undefined
    );

    const protectedLegs =
      buildV4ExecutionLegs(
        candidate.legs,
        50
      );

    assert.equal(
      protectedLegs[0].venue,
      0
    );

    assert.equal(
      protectedLegs[0].venueData,
      "0x"
    );
  }
);

test(
  "rejects unsupported observed outer venue",
  () => {
    const evidence =
      observation();

    evidence.entry.venue =
      "UNKNOWN_VENUE";

    assert.throws(
      () =>
        buildObservedV4Candidate({
          observation: evidence,
          startToken: WPOL,
          entryToken: DAI,
          exitToken: APEPE
        }),
      /requires supported observed venue/
    );
  }
);
