"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const MODULE =
  "../scripts/utils/polygonV4ExecutionPolicyPlanQualification";

const {
  EXECUTION_PLAN_TYPE
} = require(
  "../scripts/utils/polygonV4ExecutionRoute"
);

function address(byte) {
  return ethers.utils.getAddress(
    "0x" + byte.repeat(40)
  );
}

function loadSubject() {
  return require(MODULE)
    .qualifyExecutionPolicyPlan;
}

test(
  "encodes the exact protected plan before evidence-bound qualification",
  async () => {
    const qualifyExecutionPolicyPlan =
      loadSubject();

    const startToken = address("1");
    const entryToken = address("2");
    const exitToken = address("3");

    const executionLegs = [
      {
        venue: 2,
        tokenIn: startToken,
        tokenOut: entryToken,
        minAmountOut:
          ethers.BigNumber.from("100"),
        venueData:
          ethers.utils.defaultAbiCoder.encode(
            ["uint24"],
            [100]
          )
      },
      {
        venue: 4,
        tokenIn: entryToken,
        tokenOut: exitToken,
        minAmountOut:
          ethers.BigNumber.from("200"),
        venueData: "0x"
      },
      {
        venue: 2,
        tokenIn: exitToken,
        tokenOut: startToken,
        minAmountOut:
          ethers.BigNumber.from("300"),
        venueData:
          ethers.utils.defaultAbiCoder.encode(
            ["uint24"],
            [100]
          )
      }
    ];

    const minimumNetProfitWei =
      ethers.utils.parseEther("0.005");

    const deadline = 2000000000;

    let received = null;

    const result =
      await qualifyExecutionPolicyPlan({
        provider: {},
        operationalResult: {},
        startToken:
          executionLegs[0].tokenIn,
        entryToken:
          executionLegs[0].tokenOut,
        exitToken:
          executionLegs[1].tokenOut,
        slippageBps: 50,
        maxSlippageBps: 100,
        maxAgeBlocks: 3,
        deadline,
        gasEvidence: {},
        safetyReserveWei:
          ethers.utils.parseEther("0.001"),
        minimumNetProfitWei,

        selectProtectedPeakHandoffFn:
          () => ({
            observation: {}
          }),

        buildObservedCandidateFn:
          () => ({
            legs: []
          }),

        buildV4ExecutionLegsFn:
          () => executionLegs,

        qualifyGasEvidenceProtectedPeakHandoffFn:
          async args => {
            received = args;

            return {
              qualified: true,
              stage: "QUALIFIED"
            };
          }
      });

    assert.equal(
      result.qualified,
      true
    );

    assert.ok(received);

    const [decoded] =
      ethers.utils.defaultAbiCoder.decode(
        [EXECUTION_PLAN_TYPE],
        received.executionPlan
      );

    assert.equal(
      decoded.deadline.toString(),
      String(deadline)
    );

    assert.equal(
      decoded.minimumProfit.toString(),
      minimumNetProfitWei.toString()
    );

    assert.equal(
      decoded.legs.length,
      3
    );

    for (
      let i = 0;
      i < executionLegs.length;
      i++
    ) {
      assert.equal(
        decoded.legs[i].venue,
        executionLegs[i].venue
      );

      assert.equal(
        decoded.legs[i].tokenIn.toLowerCase(),
        executionLegs[i].tokenIn.toLowerCase()
      );

      assert.equal(
        decoded.legs[i].tokenOut.toLowerCase(),
        executionLegs[i].tokenOut.toLowerCase()
      );

      assert.equal(
        decoded.legs[i].minAmountOut.toString(),
        executionLegs[i].minAmountOut.toString()
      );

      assert.equal(
        decoded.legs[i].venueData,
        executionLegs[i].venueData
      );
    }

    assert.strictEqual(
      received.minimumNetProfitWei,
      minimumNetProfitWei
    );
  }
);

// 1S.10 expanded fail-closed contract

function compositionHarness() {
  const startToken = address("4");
  const entryToken = address("5");
  const exitToken = address("6");

  const executionLegs = [
    {
      venue: 2,
      tokenIn: startToken,
      tokenOut: entryToken,
      minAmountOut:
        ethers.BigNumber.from("101"),
      venueData:
        ethers.utils.defaultAbiCoder.encode(
          ["uint24"],
          [100]
        )
    },
    {
      venue: 4,
      tokenIn: entryToken,
      tokenOut: exitToken,
      minAmountOut:
        ethers.BigNumber.from("202"),
      venueData: "0x"
    },
    {
      venue: 2,
      tokenIn: exitToken,
      tokenOut: startToken,
      minAmountOut:
        ethers.BigNumber.from("303"),
      venueData:
        ethers.utils.defaultAbiCoder.encode(
          ["uint24"],
          [100]
        )
    }
  ];

  const operationalResult = {
    id: "protected-result"
  };

  const gasEvidence = {
    id: "fork-receipt-evidence"
  };

  const provider = {
    id: "provider"
  };

  const safetyReserveWei =
    ethers.utils.parseEther("0.001");

  const minimumNetProfitWei =
    ethers.utils.parseEther("0.005");

  const deadline = 2000000001;

  const calls = {
    qualify: 0
  };

  const base = {
    provider,
    operationalResult,
    startToken,
    entryToken,
    exitToken,
    slippageBps: 50,
    maxSlippageBps: 100,
    maxAgeBlocks: 3,
    deadline,
    gasEvidence,
    safetyReserveWei,
    minimumNetProfitWei,

    selectProtectedPeakHandoffFn:
      () => ({
        observation: {}
      }),

    buildObservedCandidateFn:
      () => ({
        legs: []
      }),

    buildV4ExecutionLegsFn:
      () => executionLegs
  };

  return {
    ...base,
    executionLegs,
    calls
  };
}

test(
  "rejects invalid deadline before evidence-bound qualification",
  async () => {
    const qualifyExecutionPolicyPlan =
      loadSubject();

    const h =
      compositionHarness();

    await assert.rejects(
      qualifyExecutionPolicyPlan({
        ...h,
        deadline: 0,

        qualifyGasEvidenceProtectedPeakHandoffFn:
          async () => {
            h.calls.qualify += 1;
            return {};
          }
      }),
      /deadline must be a positive/
    );

    assert.equal(
      h.calls.qualify,
      0
    );
  }
);

test(
  "rejects zero minimum profit before evidence-bound qualification",
  async () => {
    const qualifyExecutionPolicyPlan =
      loadSubject();

    const h =
      compositionHarness();

    await assert.rejects(
      qualifyExecutionPolicyPlan({
        ...h,
        minimumNetProfitWei:
          ethers.constants.Zero,

        qualifyGasEvidenceProtectedPeakHandoffFn:
          async () => {
            h.calls.qualify += 1;
            return {};
          }
      }),
      /minimumProfit must be a positive/
    );

    assert.equal(
      h.calls.qualify,
      0
    );
  }
);

test(
  "delegates the exact encoded plan with unchanged policy and evidence inputs",
  async () => {
    const qualifyExecutionPolicyPlan =
      loadSubject();

    const h =
      compositionHarness();

    let encodedPlan = null;
    let received = null;

    const result =
      await qualifyExecutionPolicyPlan({
        ...h,

        encodeV4ExecutionPlanFn:
          args => {
            assert.strictEqual(
              args.legs,
              h.executionLegs
            );

            assert.equal(
              args.deadline,
              h.deadline
            );

            assert.strictEqual(
              args.minimumProfit,
              h.minimumNetProfitWei
            );

            encodedPlan =
              ethers.utils.defaultAbiCoder.encode(
                ["uint256", "uint256"],
                [
                  args.deadline,
                  args.minimumProfit
                ]
              );

            return encodedPlan;
          },

        qualifyGasEvidenceProtectedPeakHandoffFn:
          async args => {
            h.calls.qualify += 1;
            received = args;

            return {
              qualified: true,
              stage: "QUALIFIED"
            };
          }
      });

    assert.equal(
      result.qualified,
      true
    );

    assert.equal(
      h.calls.qualify,
      1
    );

    assert.strictEqual(
      received.provider,
      h.provider
    );

    assert.strictEqual(
      received.operationalResult,
      h.operationalResult
    );

    assert.strictEqual(
      received.gasEvidence,
      h.gasEvidence
    );

    assert.strictEqual(
      received.executionPlan,
      encodedPlan
    );

    assert.strictEqual(
      received.safetyReserveWei,
      h.safetyReserveWei
    );

    assert.strictEqual(
      received.minimumNetProfitWei,
      h.minimumNetProfitWei
    );

    assert.equal(
      received.slippageBps,
      h.slippageBps
    );

    assert.equal(
      received.maxSlippageBps,
      h.maxSlippageBps
    );

    assert.equal(
      received.maxAgeBlocks,
      h.maxAgeBlocks
    );
  }
);

test(
  "propagates evidence-bound qualification rejection unchanged",
  async () => {
    const qualifyExecutionPolicyPlan =
      loadSubject();

    const h =
      compositionHarness();

    const rejection =
      new Error(
        "execution plan hash mismatch"
      );

    await assert.rejects(
      qualifyExecutionPolicyPlan({
        ...h,

        qualifyGasEvidenceProtectedPeakHandoffFn:
          async () => {
            h.calls.qualify += 1;
            throw rejection;
          }
      }),
      error =>
        error === rejection
    );

    assert.equal(
      h.calls.qualify,
      1
    );
  }
);


test(
  "real 1S.9 validator rejects evidence bound to a different execution plan",
  async () => {
    const qualifyExecutionPolicyPlan =
      loadSubject();

    const h =
      compositionHarness();

    const candidate = {
      blockTag: 94709817,
      amountIn:
        ethers.BigNumber.from(
          "125000000000000000"
        ),
      legs: []
    };

    const evidencePlan =
      ethers.utils.defaultAbiCoder.encode(
        ["uint256"],
        [123456]
      );

    const gasEvidence = {
      observationBlock:
        candidate.blockTag,
      loanToken:
        h.startToken,
      loanAmount:
        candidate.amountIn,
      executionLegs:
        h.executionLegs,
      gasUnits:
        ethers.BigNumber.from(
          "652106"
        ),
      executionPlanHash:
        ethers.utils.keccak256(
          evidencePlan
        ),
      executorContext: {
        executorCodeHash:
          ethers.utils.keccak256(
            "0x60006000"
          ),
        v3Router: address("7"),
        v4Router: address("8"),
        permit2: address("9"),
        aaveProvider: address("a"),
        aavePool: address("b")
      },
      provenance: {
        method: "FORK_RECEIPT",
        measurementBlock:
          candidate.blockTag,
        source:
          "controlled historical Polygon fork receipt"
      }
    };

    const {
      qualifyGasEvidenceProtectedPeakHandoff
    } = require(
      "../scripts/utils/polygonV4GasEvidenceProtectedPeakQualification"
    );

    await assert.rejects(
      qualifyExecutionPolicyPlan({
        ...h,
        provider: {},
        gasEvidence,

        buildObservedCandidateFn:
          () => candidate,

        qualifyGasEvidenceProtectedPeakHandoffFn:
          args =>
            qualifyGasEvidenceProtectedPeakHandoff({
              ...args,

              selectProtectedPeakHandoffFn:
                () => ({
                  observation: {
                    blockTag:
                      candidate.blockTag
                  }
                }),

              buildObservedCandidateFn:
                () => candidate,

              buildV4ExecutionLegsFn:
                () => h.executionLegs
            })
      }),
      /execution plan mismatch/i
    );
  }
);
