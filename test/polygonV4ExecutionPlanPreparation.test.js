"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const fs =
  require("node:fs");

const {
  prepareExactExecutionPlan
} = require(
  "../scripts/utils/polygonV4ExecutionPlanPreparation"
);

test(
  "builds and preserves one exact execution-plan identity",
  () => {
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
      amountIn: {
        id: "amount"
      },
      legs: [
        { id: "discovered-leg-1" },
        { id: "discovered-leg-2" },
        { id: "discovered-leg-3" }
      ]
    };

    const executionLegs = [
      { id: "execution-leg-1" },
      { id: "execution-leg-2" },
      { id: "execution-leg-3" }
    ];

    const executionPlan =
      "0x1234";

    const minimumNetProfitWei = {
      id: "minimum-net-profit"
    };

    const deadline =
      2000000000;

    let selectedInput = null;
    let candidateInput = null;
    let legsInput = null;
    let encodedInput = null;

    const result =
      prepareExactExecutionPlan({
        operationalResult,
        startToken: "start-token",
        entryToken: "entry-token",
        exitToken: "exit-token",
        slippageBps: 50,
        deadline,
        minimumNetProfitWei,

        selectProtectedPeakHandoffFn:
          input => {
            selectedInput = input;
            return handoff;
          },

        buildObservedCandidateFn:
          args => {
            candidateInput = args;
            return candidate;
          },

        buildV4ExecutionLegsFn:
          (legs, slippage) => {
            legsInput = {
              legs,
              slippage
            };

            return executionLegs;
          },

        encodeV4ExecutionPlanFn:
          args => {
            encodedInput = args;
            return executionPlan;
          }
      });

    assert.strictEqual(
      selectedInput,
      operationalResult
    );

    assert.strictEqual(
      candidateInput.observation,
      handoff.observation
    );

    assert.equal(
      candidateInput.startToken,
      "start-token"
    );

    assert.equal(
      candidateInput.entryToken,
      "entry-token"
    );

    assert.equal(
      candidateInput.exitToken,
      "exit-token"
    );

    assert.strictEqual(
      legsInput.legs,
      candidate.legs
    );

    assert.equal(
      legsInput.slippage,
      50
    );

    assert.strictEqual(
      encodedInput.legs,
      executionLegs
    );

    assert.equal(
      encodedInput.deadline,
      deadline
    );

    assert.strictEqual(
      encodedInput.minimumProfit,
      minimumNetProfitWei
    );

    assert.strictEqual(
      result.handoff,
      handoff
    );

    assert.strictEqual(
      result.candidate,
      candidate
    );

    assert.strictEqual(
      result.executionLegs,
      executionLegs
    );

    assert.strictEqual(
      result.executionPlan,
      executionPlan
    );

    assert.equal(
      result.deadline,
      deadline
    );

    assert.strictEqual(
      result.minimumNetProfitWei,
      minimumNetProfitWei
    );
  }
);

test(
  "propagates plan-construction failure unchanged",
  () => {
    const failure =
      new Error(
        "execution-plan construction failed"
      );

    assert.throws(
      () =>
        prepareExactExecutionPlan({
          operationalResult: {},
          startToken: "start",
          entryToken: "entry",
          exitToken: "exit",
          slippageBps: 50,
          deadline: 2000000000,
          minimumNetProfitWei: {},

          selectProtectedPeakHandoffFn:
            () => ({
              observation: {}
            }),

          buildObservedCandidateFn:
            () => ({
              legs: []
            }),

          buildV4ExecutionLegsFn:
            () => [],

          encodeV4ExecutionPlanFn:
            () => {
              throw failure;
            }
        }),
      error =>
        error === failure
    );
  }
);

test(
  "rejects invalid injected dependencies before plan construction",
  () => {
    let selectionCalls = 0;

    assert.throws(
      () =>
        prepareExactExecutionPlan({
          operationalResult: {},
          startToken: "start",
          entryToken: "entry",
          exitToken: "exit",
          slippageBps: 50,
          deadline: 2000000000,
          minimumNetProfitWei: {},

          selectProtectedPeakHandoffFn:
            () => {
              selectionCalls += 1;
              return {};
            },

          buildObservedCandidateFn:
            null
        }),
      /buildObservedCandidateFn must be a function/
    );

    assert.equal(
      selectionCalls,
      0
    );
  }
);

test(
  "contains no provider, RPC, gas-evidence, qualification, fork, signer, transaction, or broadcast ownership",
  () => {
    const source =
      fs.readFileSync(
        require.resolve(
          "../scripts/utils/polygonV4ExecutionPlanPreparation"
        ),
        "utf8"
      );

    const forbidden = [
      /JsonRpcProvider/,
      /\bprovider\b/,
      /getBlock\s*\(/,
      /getGasPrice\s*\(/,
      /gasEvidence/,
      /qualifyGasEvidence/,
      /acquirePolicySnapshot/,
      /produceForkReceiptGasEvidence/,
      /hardhat_reset/,
      /getSigners\s*\(/,
      /new\s+ethers\.Wallet/,
      /sendTransaction\s*\(/,
      /\.initiateFlashloan\s*\(/,
      /\.wait\s*\(/
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
