"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  runPreparedExecutionLifecycleComposition
} = require(
  "../scripts/utils/polygonV4PreparedExecutionLifecycleComposition"
);

function harness() {
  const provider = { id: "live-read-provider" };
  const forkProvider = { id: "controlled-fork-provider" };
  const operationalResult = { id: "operational-result" };

  const preparationExecutionContext = {
    policySnapshot: {
      currentBlock: 100
    },
    policyBlockTimestamp: 2000000000,
    deadline: 2000000300
  };

  const candidate = {
    blockTag: 100,
    amountIn: {
      id: "exact-amount"
    }
  };

  const executionLegs = [
    { id: "leg-1" },
    { id: "leg-2" },
    { id: "leg-3" }
  ];

  const executionPlan = "0x1234";

  const minimumNetProfitWei = {
    id: "minimum-profit"
  };

  const preparedExecutionContext = {
    handoff: {
      id: "handoff"
    },
    candidate,
    executionLegs,
    executionPlan,
    deadline:
      preparationExecutionContext.deadline,
    minimumNetProfitWei
  };

  const forkProvenance = {
    method: "hardhat_reset",
    sourceBlock: candidate.blockTag
  };

  const executor = {
    id: "executor"
  };

  const gasEvidence = {
    id: "measured-gas-evidence"
  };

  const qualificationPolicySnapshot = {
    currentBlock: 102,
    gasPriceWei: {
      id: "fresh-gas-price"
    },
    premiumBps: 9
  };

  const qualifiedContext = {
    qualificationResult: {
      qualified: true,
      stage: "QUALIFIED"
    },
    candidate,
    executionLegs,
    executionPlan,
    deadline:
      preparedExecutionContext.deadline,
    minimumNetProfitWei,
    policySnapshot:
      qualificationPolicySnapshot,
    gasEvidence
  };

  const finalSimulation = {
    id: "final-simulation"
  };

  return {
    provider,
    forkProvider,
    operationalResult,
    preparationExecutionContext,
    candidate,
    executionLegs,
    executionPlan,
    minimumNetProfitWei,
    preparedExecutionContext,
    forkProvenance,
    executor,
    gasEvidence,
    qualificationPolicySnapshot,
    qualifiedContext,
    finalSimulation
  };
}

function args(h, overrides = {}) {
  return {
    provider: h.provider,
    operationalResult:
      h.operationalResult,
    startToken: "start",
    entryToken: "entry",
    exitToken: "exit",
    slippageBps: 50,
    maxSlippageBps: 100,
    maxAgeBlocks: 3,
    deadlineSeconds: 300,
    minimumNetProfitWei:
      h.minimumNetProfitWei,
    safetyReserveWei: {
      id: "reserve"
    },
    forkProvider:
      h.forkProvider,
    executor:
      h.executor,
    forkProvenance:
      h.forkProvenance,
    executeExactPlanFn:
      async () => ({
        id: "measurement-execute"
      }),
    executeExactQualifiedPlanFn:
      async () => ({
        id: "simulation-execute"
      }),
    ...overrides
  };
}

test(
  "preserves one prepared identity through the ordered lifecycle",
  async () => {
    const h = harness();
    const order = [];

    let planArgs;
    let gasArgs;
    let qualificationArgs;
    let simulationArgs;

    const result =
      await runPreparedExecutionLifecycleComposition(
        args(h, {
          acquirePreparationExecutionContextFn:
            async received => {
              order.push("preparation-context");

              assert.strictEqual(
                received.provider,
                h.provider
              );

              assert.equal(
                received.deadlineSeconds,
                300
              );

              return h.preparationExecutionContext;
            },

          prepareExactExecutionPlanFn:
            received => {
              order.push("prepare");
              planArgs = received;

              return h.preparedExecutionContext;
            },

          produceForkReceiptGasEvidenceFn:
            async received => {
              order.push("measure");
              gasArgs = received;

              return h.gasEvidence;
            },

          acquireQualificationExecutionContextFn:
            async received => {
              order.push("fresh-policy");

              assert.strictEqual(
                received.provider,
                h.provider
              );

              return {
              policySnapshot:
                h.qualificationPolicySnapshot,
              policyBlockTimestamp:
                2000000200,
              deadline:
                2000000500
            };
            },

          qualifyPreparedExecutionContextFn:
            received => {
              order.push("qualify");
              qualificationArgs = received;

              return h.qualifiedContext;
            },

          runQualifiedExecutionForkSimulationFn:
            async received => {
              order.push("simulate");
              simulationArgs = received;

              return h.finalSimulation;
            }
        })
      );

    assert.deepEqual(
      order,
      [
        "preparation-context",
        "prepare",
        "measure",
        "fresh-policy",
        "qualify",
        "simulate"
      ]
    );

    assert.strictEqual(
      planArgs.operationalResult,
      h.operationalResult
    );

    assert.equal(
      planArgs.deadline,
      h.preparationExecutionContext.deadline
    );

    assert.strictEqual(
      planArgs.minimumNetProfitWei,
      h.minimumNetProfitWei
    );

    assert.strictEqual(
      gasArgs.candidate,
      h.candidate
    );

    assert.strictEqual(
      gasArgs.executionLegs,
      h.executionLegs
    );

    assert.strictEqual(
      gasArgs.executionPlan,
      h.executionPlan
    );

    assert.strictEqual(
      qualificationArgs.preparedExecutionContext,
      h.preparedExecutionContext
    );

    assert.strictEqual(
      qualificationArgs.gasEvidence,
      h.gasEvidence
    );

    assert.strictEqual(
      qualificationArgs.policySnapshot,
      h.qualificationPolicySnapshot
    );

    assert.strictEqual(
      simulationArgs.qualifiedContext,
      h.qualifiedContext
    );

    assert.strictEqual(
      result.preparedExecutionContext,
      h.preparedExecutionContext
    );

    assert.strictEqual(
      result.gasEvidence,
      h.gasEvidence
    );

    assert.strictEqual(
      result.qualificationPolicySnapshot,
      h.qualificationPolicySnapshot
    );

    assert.strictEqual(
      result.qualifiedContext,
      h.qualifiedContext
    );

    assert.strictEqual(
      result.simulationResult,
      h.finalSimulation
    );
  }
);

test(
  "acquires fresh qualification policy only after gas measurement",
  async () => {
    const h = harness();

    let measurementComplete = false;
    let policyCalls = 0;

    await runPreparedExecutionLifecycleComposition(
      args(h, {
        acquirePreparationExecutionContextFn:
          async () =>
            h.preparationExecutionContext,

        prepareExactExecutionPlanFn:
          () =>
            h.preparedExecutionContext,

        produceForkReceiptGasEvidenceFn:
          async () => {
            assert.equal(
              policyCalls,
              0
            );

            measurementComplete = true;

            return h.gasEvidence;
          },

        acquireQualificationExecutionContextFn:
          async () => {
            assert.equal(
              measurementComplete,
              true
            );

            policyCalls += 1;

            return {
              policySnapshot:
                h.qualificationPolicySnapshot,
              policyBlockTimestamp:
                2000000200,
              deadline:
                2000000500
            };
          },

        qualifyPreparedExecutionContextFn:
          () =>
            h.qualifiedContext,

        runQualifiedExecutionForkSimulationFn:
          async () =>
            h.finalSimulation
      })
    );

    assert.equal(
      policyCalls,
      1
    );
  }
);

test(
  "does not simulate when fresh qualification rejects the prepared context",
  async () => {
    const h = harness();

    const rejection = {
      qualified: false,
      stage: "PREFLIGHT",
      reason:
        "Candidate observation is stale",
      candidate:
        h.candidate,
      executionLegs:
        h.executionLegs,
      executionPlan:
        h.executionPlan,
      deadline:
        h.preparedExecutionContext.deadline,
      policySnapshot:
        h.qualificationPolicySnapshot,
      gasEvidence:
        h.gasEvidence
    };

    let simulationCalls = 0;

    const result =
      await runPreparedExecutionLifecycleComposition(
        args(h, {
          acquirePreparationExecutionContextFn:
            async () =>
              h.preparationExecutionContext,

          prepareExactExecutionPlanFn:
            () =>
              h.preparedExecutionContext,

          produceForkReceiptGasEvidenceFn:
            async () =>
              h.gasEvidence,

          acquireQualificationExecutionContextFn:
            async () => ({
              policySnapshot:
                h.qualificationPolicySnapshot,
              policyBlockTimestamp:
                2000000200,
              deadline:
                2000000500
            }),

          qualifyPreparedExecutionContextFn:
            () =>
              rejection,

          runQualifiedExecutionForkSimulationFn:
            async () => {
              simulationCalls += 1;
              return h.finalSimulation;
            }
        })
      );

    assert.equal(
      simulationCalls,
      0
    );

    assert.strictEqual(
      result.qualifiedContext,
      rejection
    );

    assert.equal(
      result.simulationResult,
      null
    );
  }
);

test(
  "propagates measurement failure before fresh policy or qualification",
  async () => {
    const h = harness();

    const failure =
      new Error(
        "measurement-failure"
      );

    let policyCalls = 0;
    let qualificationCalls = 0;
    let simulationCalls = 0;

    await assert.rejects(
      runPreparedExecutionLifecycleComposition(
        args(h, {
          acquirePreparationExecutionContextFn:
            async () =>
              h.preparationExecutionContext,

          prepareExactExecutionPlanFn:
            () =>
              h.preparedExecutionContext,

          produceForkReceiptGasEvidenceFn:
            async () => {
              throw failure;
            },

          acquireQualificationExecutionContextFn:
            async () => {
              policyCalls += 1;
              return {
              policySnapshot:
                h.qualificationPolicySnapshot,
              policyBlockTimestamp:
                2000000200,
              deadline:
                2000000500
            };
            },

          qualifyPreparedExecutionContextFn:
            () => {
              qualificationCalls += 1;
              return h.qualifiedContext;
            },

          runQualifiedExecutionForkSimulationFn:
            async () => {
              simulationCalls += 1;
              return h.finalSimulation;
            }
        })
      ),
      error => error === failure
    );

    assert.equal(
      policyCalls,
      0
    );

    assert.equal(
      qualificationCalls,
      0
    );

    assert.equal(
      simulationCalls,
      0
    );
  }
);

test(
  "requires all lifecycle dependencies before acquisition begins",
  async () => {
    const h = harness();

    const names = [
      "acquirePreparationExecutionContextFn",
      "prepareExactExecutionPlanFn",
      "produceForkReceiptGasEvidenceFn",
      "acquireQualificationExecutionContextFn",
      "qualifyPreparedExecutionContextFn",
      "runQualifiedExecutionForkSimulationFn"
    ];

    for (const name of names) {
      let acquisitionCalls = 0;

      const overrides = {
        acquirePreparationExecutionContextFn:
          async () => {
            acquisitionCalls += 1;
            return h.preparationExecutionContext;
          },

        prepareExactExecutionPlanFn:
          () =>
            h.preparedExecutionContext,

        produceForkReceiptGasEvidenceFn:
          async () =>
            h.gasEvidence,

        acquireQualificationExecutionContextFn:
          async () =>
            h.qualificationPolicySnapshot,

        qualifyPreparedExecutionContextFn:
          () =>
            h.qualifiedContext,

        runQualifiedExecutionForkSimulationFn:
          async () =>
            h.finalSimulation
      };

      overrides[name] = null;

      await assert.rejects(
        runPreparedExecutionLifecycleComposition(
          args(h, overrides)
        ),
        /function required/
      );

      assert.equal(
        acquisitionCalls,
        0,
        `${name} allowed acquisition`
      );
    }
  }
);

test(
  "contains no reset, signer, transaction, broadcast, reconstruction, or historical gas ownership",
  () => {
    const fs =
      require("node:fs");

    const source =
      fs.readFileSync(
        require.resolve(
          "../scripts/utils/polygonV4PreparedExecutionLifecycleComposition"
        ),
        "utf8"
      );

    const forbidden = [
      /hardhat_reset/,
      /getSigners\s*\(/,
      /new\s+ethers\.Wallet/,
      /sendTransaction\s*\(/,
      /\.initiateFlashloan\s*\(/,
      /\.wait\s*\(/,
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

test(
  "rejects an expired immutable prepared deadline before qualification or simulation",
  async () => {
    const h = harness();

    let qualificationCalls = 0;
    let simulationCalls = 0;

    await assert.rejects(
      runPreparedExecutionLifecycleComposition(
        args(h, {
          acquirePreparationExecutionContextFn:
            async () =>
              h.preparationExecutionContext,

          prepareExactExecutionPlanFn:
            () =>
              h.preparedExecutionContext,

          produceForkReceiptGasEvidenceFn:
            async received => {
              assert.strictEqual(
                received.executionPlan,
                h.executionPlan
              );

              return h.gasEvidence;
            },

          acquireQualificationExecutionContextFn:
            async () => ({
              policySnapshot:
                h.qualificationPolicySnapshot,

              policyBlockTimestamp:
                h.preparedExecutionContext.deadline,

              deadline:
                h.preparedExecutionContext.deadline +
                300
            }),

          qualifyPreparedExecutionContextFn:
            () => {
              qualificationCalls += 1;
              return h.qualifiedContext;
            },

          runQualifiedExecutionForkSimulationFn:
            async () => {
              simulationCalls += 1;
              return h.finalSimulation;
            }
        })
      ),
      /Prepared execution deadline expired before qualification/
    );

    assert.equal(
      qualificationCalls,
      0
    );

    assert.equal(
      simulationCalls,
      0
    );

    assert.equal(
      h.preparedExecutionContext.deadline,
      h.preparationExecutionContext.deadline
    );

    assert.strictEqual(
      h.preparedExecutionContext.executionPlan,
      h.executionPlan
    );
  }
);
