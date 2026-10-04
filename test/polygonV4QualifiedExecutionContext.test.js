"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  qualifyAndPreserveExecutionContext
} = require(
  "../scripts/utils/polygonV4QualifiedExecutionContext"
);

function address(byte) {
  return ethers.utils.getAddress(
    "0x" + byte.repeat(40)
  );
}

function harness() {
  const startToken = address("1");
  const entryToken = address("2");
  const exitToken = address("3");

  const provider = {};
  const operationalResult = {
    id: "operational-result"
  };

  const handoff = {
    observation: {
      id: "observation"
    }
  };

  const candidate = {
    blockTag: 94709817,
    amountIn:
      ethers.BigNumber.from(
        "125000000000000000"
      ),
    legs: [
      { id: "candidate-leg-1" },
      { id: "candidate-leg-2" },
      { id: "candidate-leg-3" }
    ]
  };

  const executionLegs = [
    {
      venue: 2,
      tokenIn: startToken,
      tokenOut: entryToken,
      minAmountOut:
        ethers.BigNumber.from("100"),
      venueData: "0x01"
    },
    {
      venue: 4,
      tokenIn: entryToken,
      tokenOut: exitToken,
      minAmountOut:
        ethers.BigNumber.from("200"),
      venueData: "0x02"
    },
    {
      venue: 2,
      tokenIn: exitToken,
      tokenOut: startToken,
      minAmountOut:
        ethers.BigNumber.from("300"),
      venueData: "0x03"
    }
  ];

  const executionPlan =
    ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint256"],
      [
        2000000000,
        ethers.utils.parseEther("0.005")
      ]
    );

  const policySnapshot = {
    currentBlock: 94709817,
    gasPriceWei:
      ethers.BigNumber.from(
        "30000000000"
      ),
    premiumBps: 9
  };

  const gasEvidence = {
    id: "exact-gas-evidence"
  };

  const qualificationResult = {
    qualified: true,
    stage: "QUALIFIED"
  };

  return {
    provider,
    operationalResult,
    startToken,
    entryToken,
    exitToken,
    slippageBps: 50,
    maxSlippageBps: 100,
    maxAgeBlocks: 3,
    deadline: 2000000000,
    gasEvidence,
    safetyReserveWei:
      ethers.utils.parseEther("0.001"),
    minimumNetProfitWei:
      ethers.utils.parseEther("0.005"),
    policySnapshot,

    handoff,
    candidate,
    executionLegs,
    executionPlan,
    qualificationResult
  };
}

test(
  "preserves the exact successful qualification execution context",
  async () => {
    const h = harness();

    let receivedQualification = null;

    const result =
      await qualifyAndPreserveExecutionContext({
        ...h,

        selectProtectedPeakHandoffFn:
          value => {
            assert.strictEqual(
              value,
              h.operationalResult
            );

            return h.handoff;
          },

        buildObservedCandidateFn:
          args => {
            assert.strictEqual(
              args.observation,
              h.handoff.observation
            );

            return h.candidate;
          },

        buildV4ExecutionLegsFn:
          (legs, slippageBps) => {
            assert.strictEqual(
              legs,
              h.candidate.legs
            );

            assert.equal(
              slippageBps,
              h.slippageBps
            );

            return h.executionLegs;
          },

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

            return h.executionPlan;
          },

        qualifyGasEvidenceProtectedPeakHandoffFn:
          async args => {
            receivedQualification = args;
            return h.qualificationResult;
          }
      });

    assert.ok(receivedQualification);

    assert.strictEqual(
      receivedQualification.provider,
      h.provider
    );

    assert.strictEqual(
      receivedQualification.operationalResult,
      h.operationalResult
    );

    assert.strictEqual(
      receivedQualification.gasEvidence,
      h.gasEvidence
    );

    assert.strictEqual(
      receivedQualification.executionPlan,
      h.executionPlan
    );

    assert.strictEqual(
      receivedQualification.policySnapshot,
      h.policySnapshot
    );

    assert.strictEqual(
      result.qualificationResult,
      h.qualificationResult
    );

    assert.strictEqual(
      result.candidate,
      h.candidate
    );

    assert.strictEqual(
      result.executionLegs,
      h.executionLegs
    );

    assert.strictEqual(
      result.executionPlan,
      h.executionPlan
    );

    assert.equal(
      result.deadline,
      h.deadline
    );

    assert.strictEqual(
      result.policySnapshot,
      h.policySnapshot
    );

    assert.strictEqual(
      result.gasEvidence,
      h.gasEvidence
    );
  }
);

test(
  "does not promote an unqualified result into an execution context",
  async () => {
    const h = harness();

    const rejected = {
      qualified: false,
      stage: "PREFLIGHT",
      reason: "NOT_PROFITABLE"
    };

    const result =
      await qualifyAndPreserveExecutionContext({
        ...h,

        selectProtectedPeakHandoffFn:
          () => h.handoff,

        buildObservedCandidateFn:
          () => h.candidate,

        buildV4ExecutionLegsFn:
          () => h.executionLegs,

        encodeV4ExecutionPlanFn:
          () => h.executionPlan,

        qualifyGasEvidenceProtectedPeakHandoffFn:
          async () => rejected
      });

    assert.strictEqual(
      result,
      rejected
    );

    assert.equal(
      result.executionPlan,
      undefined
    );

    assert.equal(
      result.gasEvidence,
      undefined
    );
  }
);

test(
  "rejects malformed qualification results instead of promoting them",
  async () => {
    const h = harness();

    for (const malformed of [
      null,
      undefined,
      "QUALIFIED",
      {},
      { qualified: "true" }
    ]) {
      await assert.rejects(
        qualifyAndPreserveExecutionContext({
          ...h,

          selectProtectedPeakHandoffFn:
            () => h.handoff,

          buildObservedCandidateFn:
            () => h.candidate,

          buildV4ExecutionLegsFn:
            () => h.executionLegs,

          encodeV4ExecutionPlanFn:
            () => h.executionPlan,

          qualifyGasEvidenceProtectedPeakHandoffFn:
            async () => malformed
        }),
        /Qualification result with boolean qualified status required/
      );
    }
  }
);

test(
  "propagates qualification exceptions unchanged",
  async () => {
    const h = harness();

    const failure =
      new Error("EXACT_QUALIFICATION_FAILURE");

    await assert.rejects(
      qualifyAndPreserveExecutionContext({
        ...h,

        selectProtectedPeakHandoffFn:
          () => h.handoff,

        buildObservedCandidateFn:
          () => h.candidate,

        buildV4ExecutionLegsFn:
          () => h.executionLegs,

        encodeV4ExecutionPlanFn:
          () => h.executionPlan,

        qualifyGasEvidenceProtectedPeakHandoffFn:
          async () => {
            throw failure;
          }
      }),
      error => error === failure
    );
  }
);

test(
  "rejects missing or invalid authoritative policy snapshot before composition or qualification",
  async () => {
    const h = harness();

    for (const policySnapshot of [
      undefined,
      null,
      "snapshot",
      137,
      true
    ]) {
      let compositionCalls = 0;
      let qualificationCalls = 0;

      await assert.rejects(
        qualifyAndPreserveExecutionContext({
          ...h,
          policySnapshot,

          selectProtectedPeakHandoffFn:
            () => {
              compositionCalls += 1;
              return h.handoff;
            },

          buildObservedCandidateFn:
            () => {
              compositionCalls += 1;
              return h.candidate;
            },

          buildV4ExecutionLegsFn:
            () => {
              compositionCalls += 1;
              return h.executionLegs;
            },

          encodeV4ExecutionPlanFn:
            () => {
              compositionCalls += 1;
              return h.executionPlan;
            },

          qualifyGasEvidenceProtectedPeakHandoffFn:
            async () => {
              qualificationCalls += 1;
              return h.qualificationResult;
            }
        }),
        /policySnapshot/i
      );

      assert.equal(
        compositionCalls,
        0
      );

      assert.equal(
        qualificationCalls,
        0
      );
    }
  }
);

test(
  "rejects invalid injected dependencies before qualification",
  async () => {
    const h = harness();

    let qualificationCalls = 0;

    await assert.rejects(
      qualifyAndPreserveExecutionContext({
        ...h,

        encodeV4ExecutionPlanFn: null,

        qualifyGasEvidenceProtectedPeakHandoffFn:
          async () => {
            qualificationCalls += 1;
            return h.qualificationResult;
          }
      }),
      /encodeV4ExecutionPlanFn must be a function/
    );

    assert.equal(
      qualificationCalls,
      0
    );
  }
);

test(
  "contains no provider construction, RPC, fork, signer, transaction, broadcast, or historical-evidence ownership",
  () => {
    const fs = require("node:fs");

    const source =
      fs.readFileSync(
        require.resolve(
          "../scripts/utils/polygonV4QualifiedExecutionContext"
        ),
        "utf8"
      );

    const forbidden = [
      /JsonRpcProvider/,
      /getBlock\s*\(/,
      /getGasPrice\s*\(/,
      /hardhat_reset/,
      /HISTORICAL_EXECUTION_GAS_EVIDENCE/,
      /polygonV4HistoricalExecutionGasEvidence/,
      /getSigners\s*\(/,
      /new\s+ethers\.Wallet/,
      /sendTransaction\s*\(/,
      /\.initiateFlashloan\s*\(/,
      /\.wait\s*\(/,
      /policyGasUnits/
    ];

    for (const pattern of forbidden) {
      assert.equal(
        pattern.test(source),
        false,
        `forbidden production surface: ${pattern}`
      );
    }
  }
);
