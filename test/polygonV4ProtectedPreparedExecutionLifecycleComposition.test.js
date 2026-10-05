"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

function loadSubject() {
  return require(
    "../scripts/utils/polygonV4ProtectedPreparedExecutionLifecycleComposition"
  ).runProtectedPreparedExecutionLifecycleComposition;
}

function harness() {
  return {
    provider: { id: "authoritative-provider" },

    count: 2,
    minimumBlockGap: 1,
    maxAttempts: 3,
    maxCycles: 2,
    waitMs: 5000,
    amounts: [{ id: "amount" }],

    startToken: "start",
    entryToken: "entry",
    exitToken: "exit",

    slippageBps: 50,
    maxSlippageBps: 100,
    maxAgeBlocks: 3,
    deadlineSeconds: 300,

    minimumNetProfitWei: {
      id: "minimum-profit"
    },

    safetyReserveWei: {
      id: "safety-reserve"
    },

    forkProvider: {
      id: "controlled-fork-provider"
    },

    executor: {
      id: "executor"
    },

    forkProvenance: {
      method: "hardhat_reset",
      sourceBlock: 94709817
    },

    executeExactPlanFn:
      async () => ({
        id: "measurement-execution"
      }),

    executeExactQualifiedPlanFn:
      async () => ({
        id: "final-simulation-execution"
      }),

    operationalResult: {
      id: "exact-operational-result"
    },

    lifecycleResult: {
      id: "exact-lifecycle-result"
    }
  };
}

function args(h, overrides = {}) {
  return {
    provider: h.provider,

    count: h.count,
    minimumBlockGap:
      h.minimumBlockGap,
    maxAttempts:
      h.maxAttempts,
    maxCycles:
      h.maxCycles,
    waitMs:
      h.waitMs,
    amounts:
      h.amounts,

    startToken:
      h.startToken,
    entryToken:
      h.entryToken,
    exitToken:
      h.exitToken,

    slippageBps:
      h.slippageBps,
    maxSlippageBps:
      h.maxSlippageBps,
    maxAgeBlocks:
      h.maxAgeBlocks,
    deadlineSeconds:
      h.deadlineSeconds,

    minimumNetProfitWei:
      h.minimumNetProfitWei,
    safetyReserveWei:
      h.safetyReserveWei,

    forkProvider:
      h.forkProvider,
    executor:
      h.executor,
    forkProvenance:
      h.forkProvenance,

    executeExactPlanFn:
      h.executeExactPlanFn,
    executeExactQualifiedPlanFn:
      h.executeExactQualifiedPlanFn,

    ...overrides
  };
}

test(
  "passes the exact protected operational result into the prepared lifecycle and returns its result unchanged",
  async () => {
    const runComposition =
      loadSubject();

    const h = harness();

    let cadenceCalls = 0;
    let lifecycleCalls = 0;

    let cadenceArgs;
    let lifecycleArgs;

    const result =
      await runComposition(
        args(h, {
          runTimedCadenceFn:
            async received => {
              cadenceCalls += 1;
              cadenceArgs = received;

              return h.operationalResult;
            },

          runPreparedExecutionLifecycleCompositionFn:
            async received => {
              lifecycleCalls += 1;
              lifecycleArgs = received;

              return h.lifecycleResult;
            }
        })
      );

    assert.equal(
      cadenceCalls,
      1
    );

    assert.equal(
      lifecycleCalls,
      1
    );

    assert.strictEqual(
      result,
      h.lifecycleResult
    );

    assert.strictEqual(
      cadenceArgs.provider,
      h.provider
    );

    assert.strictEqual(
      lifecycleArgs.provider,
      h.provider
    );

    assert.strictEqual(
      lifecycleArgs.operationalResult,
      h.operationalResult
    );

    assert.deepEqual(
      cadenceArgs,
      {
        provider:
          h.provider,
        count:
          h.count,
        minimumBlockGap:
          h.minimumBlockGap,
        maxAttempts:
          h.maxAttempts,
        maxCycles:
          h.maxCycles,
        waitMs:
          h.waitMs,
        amounts:
          h.amounts
      }
    );

    assert.equal(
      lifecycleArgs.startToken,
      h.startToken
    );

    assert.equal(
      lifecycleArgs.entryToken,
      h.entryToken
    );

    assert.equal(
      lifecycleArgs.exitToken,
      h.exitToken
    );

    assert.equal(
      lifecycleArgs.slippageBps,
      h.slippageBps
    );

    assert.equal(
      lifecycleArgs.maxSlippageBps,
      h.maxSlippageBps
    );

    assert.equal(
      lifecycleArgs.maxAgeBlocks,
      h.maxAgeBlocks
    );

    assert.equal(
      lifecycleArgs.deadlineSeconds,
      h.deadlineSeconds
    );

    assert.strictEqual(
      lifecycleArgs.minimumNetProfitWei,
      h.minimumNetProfitWei
    );

    assert.strictEqual(
      lifecycleArgs.safetyReserveWei,
      h.safetyReserveWei
    );

    assert.strictEqual(
      lifecycleArgs.forkProvider,
      h.forkProvider
    );

    assert.strictEqual(
      lifecycleArgs.executor,
      h.executor
    );

    assert.strictEqual(
      lifecycleArgs.forkProvenance,
      h.forkProvenance
    );

    assert.strictEqual(
      lifecycleArgs.executeExactPlanFn,
      h.executeExactPlanFn
    );

    assert.strictEqual(
      lifecycleArgs.executeExactQualifiedPlanFn,
      h.executeExactQualifiedPlanFn
    );
  }
);

test(
  "preserves omission of optional operational amounts",
  async () => {
    const runComposition =
      loadSubject();

    const h = harness();

    let cadenceArgs;

    const withoutAmounts =
      args(h, {
        amounts: undefined,

        runTimedCadenceFn:
          async received => {
            cadenceArgs = received;
            return h.operationalResult;
          },

        runPreparedExecutionLifecycleCompositionFn:
          async () =>
            h.lifecycleResult
      });

    await runComposition(
      withoutAmounts
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        cadenceArgs,
        "amounts"
      ),
      false
    );
  }
);

test(
  "rejects an invalid operational result before lifecycle execution",
  async () => {
    const runComposition =
      loadSubject();

    const h = harness();

    let lifecycleCalls = 0;

    await assert.rejects(
      runComposition(
        args(h, {
          runTimedCadenceFn:
            async () => null,

          runPreparedExecutionLifecycleCompositionFn:
            async () => {
              lifecycleCalls += 1;
              return h.lifecycleResult;
            }
        })
      ),
      /Operational result required/
    );

    assert.equal(
      lifecycleCalls,
      0
    );
  }
);

test(
  "propagates cadence failure unchanged and does not start the lifecycle",
  async () => {
    const runComposition =
      loadSubject();

    const h = harness();

    const failure =
      new Error(
        "protected cadence failure"
      );

    let lifecycleCalls = 0;

    await assert.rejects(
      runComposition(
        args(h, {
          runTimedCadenceFn:
            async () => {
              throw failure;
            },

          runPreparedExecutionLifecycleCompositionFn:
            async () => {
              lifecycleCalls += 1;
              return h.lifecycleResult;
            }
        })
      ),
      error => error === failure
    );

    assert.equal(
      lifecycleCalls,
      0
    );
  }
);

test(
  "requires both composition dependencies before cadence acquisition begins",
  async () => {
    const runComposition =
      loadSubject();

    const h = harness();

    for (
      const name of [
        "runTimedCadenceFn",
        "runPreparedExecutionLifecycleCompositionFn"
      ]
    ) {
      let cadenceCalls = 0;

      const overrides = {
        runTimedCadenceFn:
          async () => {
            cadenceCalls += 1;
            return h.operationalResult;
          },

        runPreparedExecutionLifecycleCompositionFn:
          async () =>
            h.lifecycleResult
      };

      overrides[name] = null;

      await assert.rejects(
        runComposition(
          args(h, overrides)
        ),
        /function required/
      );

      assert.equal(
        cadenceCalls,
        0,
        `${name} allowed cadence acquisition`
      );
    }
  }
);

test(
  "contains no provider construction, signer, fork control, transaction, broadcast, reconstruction, or gas ownership",
  () => {
    const fs =
      require("node:fs");

    const source =
      fs.readFileSync(
        require.resolve(
          "../scripts/utils/polygonV4ProtectedPreparedExecutionLifecycleComposition"
        ),
        "utf8"
      );

    const forbidden = [
      /JsonRpcProvider/,
      /PRIVATE_KEY/,
      /new\s+ethers\.Wallet/,
      /getSigner\s*\(/,
      /getSigners\s*\(/,
      /hardhat_reset/,
      /evm_snapshot/,
      /evm_revert/,
      /\.initiateFlashloan\s*\(/,
      /sendTransaction\s*\(/,
      /broadcastTransaction\s*\(/,
      /HISTORICAL_EXECUTION_GAS_EVIDENCE/,
      /selectProtectedPeakHandoff/,
      /buildObservedV4Candidate/,
      /buildV4ExecutionLegs/,
      /encodeV4ExecutionPlan/,
      /policyGasUnits/
    ];

    for (const pattern of forbidden) {
      assert.equal(
        pattern.test(source),
        false,
        `forbidden ownership: ${pattern}`
      );
    }
  }
);
