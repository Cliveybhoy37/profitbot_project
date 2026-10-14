"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  validateExecutionGasEvidence
} = require("../scripts/utils/polygonV4ExecutionGasEvidence");

const {
  WPOL,
  DAI,
  APEPE
} = require(
  "../scripts/research/runPolygonV4LiveQualification"
);

const BLOCK = 94709817;
const START =
  ethers.utils.parseEther("0.125");

const V3_500 =
  ethers.utils.defaultAbiCoder.encode(
    ["uint24"],
    [500]
  );

const V3_100 =
  ethers.utils.defaultAbiCoder.encode(
    ["uint24"],
    [100]
  );

const V4_DATA =
  ethers.utils.defaultAbiCoder.encode(
    [
      "tuple(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks,bool zeroForOne)"
    ],
    [[
      DAI,
      APEPE,
      10000,
      100,
      ethers.constants.AddressZero,
      true
    ]]
  );

function legs() {
  return [
    {
      venue: 2,
      tokenIn: WPOL,
      tokenOut: DAI,
      minAmountOut:
        ethers.BigNumber.from(
          "14409355924111253"
        ),
      venueData: V3_500
    },
    {
      venue: 4,
      tokenIn: DAI,
      tokenOut: APEPE,
      minAmountOut:
        ethers.BigNumber.from(
          "12529560049474744443693"
        ),
      venueData: V4_DATA
    },
    {
      venue: 2,
      tokenIn: APEPE,
      tokenOut: WPOL,
      minAmountOut:
        ethers.BigNumber.from(
          "141099441297140291"
        ),
      venueData: V3_100
    }
  ];
}

function candidate() {
  return {
    blockTag: BLOCK,
    amountIn: START
  };
}

function evidence() {
  return {
    observationBlock: BLOCK,
    loanToken: WPOL,
    loanAmount: START,
    executionLegs: legs(),
    gasUnits:
      ethers.BigNumber.from("650723"),
    provenance: {
      method: "FORK_RECEIPT",
      measurementBlock: BLOCK,
      source:
        "controlled Polygon fork receipt"
    }
  };
}

function cloneEvidence() {
  const source = evidence();

  return {
    ...source,
    executionLegs:
      source.executionLegs.map(
        (leg) => ({ ...leg })
      ),
    provenance: {
      ...source.provenance
    }
  };
}

test(
  "accepts gas evidence bound to the exact protected execution identity",
  () => {
    const source = evidence();

    const validated =
      validateExecutionGasEvidence({
        candidate: candidate(),
        executionLegs: legs(),
        evidence: source
      });

    assert.equal(
      validated.observationBlock,
      BLOCK
    );

    assert(
      validated.loanAmount.eq(START)
    );

    assert(
      validated.gasUnits.eq(
        ethers.BigNumber.from("650723")
      )
    );

    assert.equal(
      validated.provenance.method,
      "FORK_RECEIPT"
    );
  }
);

test(
  "rejects observation block mismatch",
  () => {
    const source = cloneEvidence();
    source.observationBlock++;

    assert.throws(
      () =>
        validateExecutionGasEvidence({
          candidate: candidate(),
          executionLegs: legs(),
          evidence: source
        }),
      /observation block mismatch/
    );
  }
);

test(
  "rejects loan amount mismatch",
  () => {
    const source = cloneEvidence();
    source.loanAmount =
      START.add(1);

    assert.throws(
      () =>
        validateExecutionGasEvidence({
          candidate: candidate(),
          executionLegs: legs(),
          evidence: source
        }),
      /loan amount mismatch/
    );
  }
);

test(
  "rejects loan token mismatch",
  () => {
    const source = cloneEvidence();
    source.loanToken = DAI;

    assert.throws(
      () =>
        validateExecutionGasEvidence({
          candidate: candidate(),
          executionLegs: legs(),
          evidence: source
        }),
      /loan token mismatch/
    );
  }
);

test(
  "rejects execution venue mismatch",
  () => {
    const source = cloneEvidence();
    source.executionLegs[0].venue = 1;

    assert.throws(
      () =>
        validateExecutionGasEvidence({
          candidate: candidate(),
          executionLegs: legs(),
          evidence: source
        }),
      /venue mismatch/
    );
  }
);

test(
  "rejects execution token mismatch",
  () => {
    const source = cloneEvidence();

    source.executionLegs[0].tokenOut =
      APEPE;
    source.executionLegs[1].tokenIn =
      APEPE;

    assert.throws(
      () =>
        validateExecutionGasEvidence({
          candidate: candidate(),
          executionLegs: legs(),
          evidence: source
        }),
      /tokenOut mismatch/
    );
  }
);

test(
  "rejects protected minAmountOut mismatch",
  () => {
    const source = cloneEvidence();

    source.executionLegs[2].minAmountOut =
      source.executionLegs[2]
        .minAmountOut.add(1);

    assert.throws(
      () =>
        validateExecutionGasEvidence({
          candidate: candidate(),
          executionLegs: legs(),
          evidence: source
        }),
      /minAmountOut mismatch/
    );
  }
);

test(
  "rejects venueData mismatch",
  () => {
    const source = cloneEvidence();

    source.executionLegs[0].venueData =
      V3_100;

    assert.throws(
      () =>
        validateExecutionGasEvidence({
          candidate: candidate(),
          executionLegs: legs(),
          evidence: source
        }),
      /venueData mismatch/
    );
  }
);

test(
  "rejects invalid gas units",
  () => {
    const source = cloneEvidence();
    source.gasUnits = 0;

    assert.throws(
      () =>
        validateExecutionGasEvidence({
          candidate: candidate(),
          executionLegs: legs(),
          evidence: source
        }),
      /gasUnits must be a positive BigNumber/
    );
  }
);

test(
  "rejects invalid measurement block",
  () => {
    const source = cloneEvidence();

    source.provenance.measurementBlock =
      0;

    assert.throws(
      () =>
        validateExecutionGasEvidence({
          candidate: candidate(),
          executionLegs: legs(),
          evidence: source
        }),
      /measurementBlock must be a positive safe integer/
    );
  }
);

test(
  "rejects unsupported measurement method",
  () => {
    const source = cloneEvidence();

    source.provenance.method =
      "ASSUMED_POLICY_VALUE";

    assert.throws(
      () =>
        validateExecutionGasEvidence({
          candidate: candidate(),
          executionLegs: legs(),
          evidence: source
        }),
      /Unsupported gas evidence method/
    );
  }
);

test(
  "rejects missing measurement source",
  () => {
    const source = cloneEvidence();

    source.provenance.source = "";

    assert.throws(
      () =>
        validateExecutionGasEvidence({
          candidate: candidate(),
          executionLegs: legs(),
          evidence: source
        }),
      /Gas evidence source is required/
    );
  }
);

test(
  "rejects evidence without exactly three legs",
  () => {
    const source = cloneEvidence();

    source.executionLegs =
      source.executionLegs.slice(0, 2);

    assert.throws(
      () =>
        validateExecutionGasEvidence({
          candidate: candidate(),
          executionLegs: legs(),
          evidence: source
        }),
      /Exactly three execution legs required/
    );
  }
);
