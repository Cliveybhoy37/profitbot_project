"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  WPOL,
  DAI,
  APEPE
} = require(
  "../scripts/research/runPolygonV4LiveQualification"
);

const {
  validateForkReceiptGasEvidence
} = require(
  "../scripts/utils/polygonV4ForkReceiptGasEvidence"
);

const BLOCK = 94709817;

const START =
  ethers.BigNumber.from(
    "125000000000000000"
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

function address(seed) {
  return ethers.utils.getAddress(
    `0x${seed.toString(16).padStart(40, "0")}`
  );
}

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
      venueData: V3_100
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

function executionPlan() {
  return ethers.utils.defaultAbiCoder.encode(
    [
      "tuple(uint256 deadline,uint256 minimumProfit,tuple(uint8 venue,address tokenIn,address tokenOut,uint256 minAmountOut,bytes venueData)[] legs)"
    ],
    [[
      1700000300,
      ethers.utils.parseEther("0.005"),
      legs().map((leg) => [
        leg.venue,
        leg.tokenIn,
        leg.tokenOut,
        leg.minAmountOut,
        leg.venueData
      ])
    ]]
  );
}

function evidence() {
  const plan = executionPlan();

  return {
    observationBlock: BLOCK,
    loanToken: WPOL,
    loanAmount: START,
    executionLegs: legs(),
    gasUnits:
      ethers.BigNumber.from("1"),
    executionPlanHash:
      ethers.utils.keccak256(plan),
    executorContext: {
      executorAddress: address(10),
      executorCodeHash:
        ethers.utils.keccak256("0x6000"),
      v3Router: address(1),
      v4Router: address(2),
      permit2: address(3),
      aaveProvider: address(4),
      aavePool: address(5)
    },
    provenance: {
      method: "FORK_RECEIPT",
      measurementBlock: BLOCK,
      source:
        "controlled historical Polygon fork receipt"
    }
  };
}

function validate(source = evidence()) {
  return validateForkReceiptGasEvidence({
    candidate: candidate(),
    executionLegs: legs(),
    executionPlan: executionPlan(),
    evidence: source
  });
}

test(
  "accepts exact fork receipt evidence contract",
  () => {
    const result = validate();

    assert.equal(
      result.observationBlock,
      BLOCK
    );

    assert.equal(
      result.provenance.measurementBlock,
      BLOCK
    );

    assert.equal(
      result.executionPlanHash,
      ethers.utils.keccak256(
        executionPlan()
      )
    );

    assert.equal(
      result.provenance.method,
      "FORK_RECEIPT"
    );
  }
);

test(
  "rejects measurement from a different blockchain state",
  () => {
    const source = evidence();

    source.provenance.measurementBlock =
      BLOCK + 1;

    assert.throws(
      () => validate(source),
      /measurement block must equal observation block/
    );
  }
);

test(
  "rejects a different encoded execution plan",
  () => {
    const source = evidence();

    source.executionPlanHash =
      ethers.utils.keccak256("0x1234");

    assert.throws(
      () => validate(source),
      /execution plan mismatch/
    );
  }
);

test(
  "rejects missing exact execution plan",
  () => {
    assert.throws(
      () =>
        validateForkReceiptGasEvidence({
          candidate: candidate(),
          executionLegs: legs(),
          executionPlan: "0x",
          evidence: evidence()
        }),
      /Exact encoded execution plan is required/
    );
  }
);

test(
  "rejects zero executor address",
  () => {
    const source = evidence();

    source.executorContext.executorAddress =
      ethers.constants.AddressZero;

    assert.throws(
      () => validate(source),
      /executorAddress must be a valid nonzero address/
    );
  }
);

test(
  "rejects invalid executor code hash",
  () => {
    const source = evidence();

    source.executorContext
      .executorCodeHash = "0x1234";

    assert.throws(
      () => validate(source),
      /executorCodeHash must be a bytes32 hash/
    );
  }
);

test(
  "rejects missing executor context",
  () => {
    const source = evidence();

    delete source.executorContext;

    assert.throws(
      () => validate(source),
      /executorContext is required/
    );
  }
);

test(
  "rejects invalid executor dependency address",
  () => {
    const source = evidence();

    source.executorContext.v4Router =
      ethers.constants.AddressZero;

    assert.throws(
      () => validate(source),
      /V4 router must be a valid nonzero address/
    );
  }
);

test(
  "retains underlying exact route binding",
  () => {
    const source = evidence();

    source.executionLegs[1].minAmountOut =
      source.executionLegs[1]
        .minAmountOut.add(1);

    assert.throws(
      () => validate(source),
      /minAmountOut mismatch/
    );
  }
);
