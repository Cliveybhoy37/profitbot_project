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
  produceForkReceiptGasEvidence
} = require(
  "../scripts/utils/polygonV4ForkReceiptGasEvidenceProducer"
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
        ethers.BigNumber.from("1"),
      venueData: V3_100
    },
    {
      venue: 4,
      tokenIn: DAI,
      tokenOut: APEPE,
      minAmountOut:
        ethers.BigNumber.from("2"),
      venueData: V4_DATA
    },
    {
      venue: 2,
      tokenIn: APEPE,
      tokenOut: WPOL,
      minAmountOut:
        ethers.BigNumber.from("3"),
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
      ethers.BigNumber.from("1"),
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

function harness({
  sourceBlock = BLOCK,
  code = "0x60006000",
  receiptStatus = 1,
  gasUsed = ethers.BigNumber.from("123456")
} = {}) {
  const calls = {
    getCode: 0,
    v3Router: 0,
    v4Router: 0,
    permit2: 0,
    aaveProvider: 0,
    aavePool: 0,
    execute: 0
  };

  const values = {
    executor: address(10),
    v3Router: address(11),
    v4Router: address(12),
    permit2: address(13),
    aaveProvider: address(14),
    aavePool: address(15)
  };

  const provider = {
    async getCode(target) {
      calls.getCode += 1;

      assert.equal(
        target,
        values.executor
      );

      return code;
    }
  };

  const executor = {
    address: values.executor,

    async V3_ROUTER() {
      calls.v3Router += 1;
      return values.v3Router;
    },

    async V4_ROUTER() {
      calls.v4Router += 1;
      return values.v4Router;
    },

    async PERMIT2() {
      calls.permit2 += 1;
      return values.permit2;
    },

    async AAVE_PROVIDER() {
      calls.aaveProvider += 1;
      return values.aaveProvider;
    },

    async AAVE_POOL() {
      calls.aavePool += 1;
      return values.aavePool;
    }
  };

  async function execute(args) {
    calls.execute += 1;

    assert.strictEqual(
      args.executor,
      executor
    );

    assert.equal(
      args.candidate.blockTag,
      BLOCK
    );

    assert.equal(
      args.executionPlan,
      executionPlan()
    );

    return {
      receipt: {
        status: receiptStatus,
        gasUsed
      }
    };
  }

  return {
    calls,
    values,
    provider,
    executor,
    execute,
    sourceBlock
  };
}

function produce(h) {
  return produceForkReceiptGasEvidence({
    provider: h.provider,
    executor: h.executor,
    candidate: candidate(),
    executionLegs: legs(),
    executionPlan: executionPlan(),
    forkProvenance: {
      method: "hardhat_reset",
      sourceBlock: h.sourceBlock
    },
    execute: h.execute
  });
}

test(
  "produces exact evidence from receipt and deployed executor context",
  async () => {
    const h = harness();

    const result = await produce(h);

    assert(
      result.gasUnits.eq("123456")
    );

    assert.equal(
      result.executionPlanHash,
      ethers.utils.keccak256(
        executionPlan()
      )
    );

    assert.equal(
      result.executorContext.executorCodeHash,
      ethers.utils.keccak256(
        "0x60006000"
      )
    );

    assert.equal(
      result.executorContext.v3Router,
      h.values.v3Router
    );

    assert.equal(
      result.executorContext.v4Router,
      h.values.v4Router
    );

    assert.equal(
      result.executorContext.permit2,
      h.values.permit2
    );

    assert.equal(
      result.executorContext.aaveProvider,
      h.values.aaveProvider
    );

    assert.equal(
      result.executorContext.aavePool,
      h.values.aavePool
    );

    assert.equal(
      result.provenance.measurementBlock,
      BLOCK
    );

    assert.equal(
      h.calls.execute,
      1
    );
  }
);

test(
  "rejects wrong fork source block before context reads or execution",
  async () => {
    const h = harness({
      sourceBlock: BLOCK + 1
    });

    await assert.rejects(
      () => produce(h),
      /Fork source block does not equal candidate observation block/
    );

    assert.equal(h.calls.getCode, 0);
    assert.equal(h.calls.v3Router, 0);
    assert.equal(h.calls.v4Router, 0);
    assert.equal(h.calls.permit2, 0);
    assert.equal(h.calls.aaveProvider, 0);
    assert.equal(h.calls.aavePool, 0);
    assert.equal(h.calls.execute, 0);
  }
);

test(
  "rejects missing controlled fork provenance before context reads or execution",
  async () => {
    const h = harness();

    await assert.rejects(
      () =>
        produceForkReceiptGasEvidence({
          provider: h.provider,
          executor: h.executor,
          candidate: candidate(),
          executionLegs: legs(),
          executionPlan: executionPlan(),
          execute: h.execute
        }),
      /Controlled hardhat_reset fork provenance is required/
    );

    assert.equal(h.calls.getCode, 0);
    assert.equal(h.calls.execute, 0);
  }
);

test(
  "rejects non-hardhat-reset provenance before context reads or execution",
  async () => {
    const h = harness();

    await assert.rejects(
      () =>
        produceForkReceiptGasEvidence({
          provider: h.provider,
          executor: h.executor,
          candidate: candidate(),
          executionLegs: legs(),
          executionPlan: executionPlan(),
          forkProvenance: {
            method: "caller_assertion",
            sourceBlock: BLOCK
          },
          execute: h.execute
        }),
      /Controlled hardhat_reset fork provenance is required/
    );

    assert.equal(h.calls.getCode, 0);
    assert.equal(h.calls.execute, 0);
  }
);

test(
  "rejects executor without deployed runtime bytecode before execution",
  async () => {
    const h = harness({
      code: "0x"
    });

    await assert.rejects(
      () => produce(h),
      /Executor has no deployed runtime bytecode/
    );

    assert.equal(
      h.calls.execute,
      0
    );
  }
);

test(
  "rejects failed fork transaction receipt",
  async () => {
    const h = harness({
      receiptStatus: 0
    });

    await assert.rejects(
      () => produce(h),
      /Successful fork transaction receipt with gasUsed is required/
    );

    assert.equal(
      h.calls.execute,
      1
    );
  }
);

test(
  "rejects zero gasUsed on successful receipt",
  async () => {
    const h = harness({
      receiptStatus: 1,
      gasUsed: ethers.constants.Zero
    });

    await assert.rejects(
      () => produce(h),
      /Successful fork transaction receipt with gasUsed is required/
    );

    assert.equal(
      h.calls.execute,
      1
    );
  }
);

test(
  "does not substitute policy gas for receipt gas",
  async () => {
    const measured =
      ethers.BigNumber.from("7");

    const h = harness({
      gasUsed: measured
    });

    const result = await produce(h);

    assert(
      result.gasUnits.eq(measured)
    );
  }
);
