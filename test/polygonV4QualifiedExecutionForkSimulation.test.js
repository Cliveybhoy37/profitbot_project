"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  runQualifiedExecutionForkSimulation
} = require(
  "../scripts/utils/polygonV4QualifiedExecutionForkSimulation"
);

function harness() {
  const qualificationResult = {
    qualified: true,
    stage: "QUALIFIED"
  };

  const candidate = {
    blockTag: 94709817,
    amountIn: {
      exact: "candidate-amount"
    }
  };

  const executionLegs = [
    { id: "leg-1" },
    { id: "leg-2" },
    { id: "leg-3" }
  ];

  const executionPlan = "0x1234";
  const deadline = 1790770167;

  const policySnapshot = {
    currentBlock: 94709817
  };

  const gasEvidence = {
    provenance: {
      method: "FORK_RECEIPT"
    }
  };

  const qualifiedContext = {
    qualificationResult,
    candidate,
    executionLegs,
    executionPlan,
    deadline,
    policySnapshot,
    gasEvidence
  };

  const forkProvenance = {
    method: "hardhat_reset",
    sourceBlock: candidate.blockTag
  };

  const simulationResult = {
    receipt: {
      status: 1
    },
    accounting: {
      exact: true
    }
  };

  return {
    qualificationResult,
    candidate,
    executionLegs,
    executionPlan,
    deadline,
    policySnapshot,
    gasEvidence,
    qualifiedContext,
    forkProvenance,
    simulationResult
  };
}

test(
  "delegates the exact successful qualified execution context to controlled fork simulation",
  async () => {
    const h = harness();

    let calls = 0;
    let received;

    const result =
      await runQualifiedExecutionForkSimulation({
        qualifiedContext:
          h.qualifiedContext,
        forkProvenance:
          h.forkProvenance,
        executeExactQualifiedPlanFn:
          async (args) => {
            calls += 1;
            received = args;
            return h.simulationResult;
          }
      });

    assert.equal(calls, 1);

    assert.strictEqual(
      received.qualificationResult,
      h.qualificationResult
    );

    assert.strictEqual(
      received.candidate,
      h.candidate
    );

    assert.strictEqual(
      received.executionLegs,
      h.executionLegs
    );

    assert.strictEqual(
      received.executionPlan,
      h.executionPlan
    );

    assert.strictEqual(
      received.deadline,
      h.deadline
    );

    assert.strictEqual(
      received.policySnapshot,
      h.policySnapshot
    );

    assert.strictEqual(
      received.gasEvidence,
      h.gasEvidence
    );

    assert.strictEqual(
      received.forkProvenance,
      h.forkProvenance
    );

    assert.strictEqual(
      result.qualifiedContext,
      h.qualifiedContext
    );

    assert.strictEqual(
      result.forkProvenance,
      h.forkProvenance
    );

    assert.strictEqual(
      result.simulationResult,
      h.simulationResult
    );
  }
);

test(
  "rejects an unqualified context before fork execution",
  async () => {
    const h = harness();
    let calls = 0;

    h.qualifiedContext.qualificationResult = {
      qualified: false,
      reason: "NOT_PROFITABLE"
    };

    await assert.rejects(
      runQualifiedExecutionForkSimulation({
        qualifiedContext:
          h.qualifiedContext,
        forkProvenance:
          h.forkProvenance,
        executeExactQualifiedPlanFn:
          async () => {
            calls += 1;
          }
      }),
      /Successful qualified execution context required/
    );

    assert.equal(calls, 0);
  }
);

test(
  "rejects malformed preserved execution identity before fork execution",
  async () => {
    const cases = [
      ["candidate", null],
      ["executionLegs", []],
      ["executionPlan", "0x"],
      ["deadline", 0],
      ["policySnapshot", null],
      ["gasEvidence", null]
    ];

    for (const [field, value] of cases) {
      const h = harness();
      let calls = 0;

      h.qualifiedContext[field] = value;

      await assert.rejects(
        runQualifiedExecutionForkSimulation({
          qualifiedContext:
            h.qualifiedContext,
          forkProvenance:
            h.forkProvenance,
          executeExactQualifiedPlanFn:
            async () => {
              calls += 1;
            }
        })
      );

      assert.equal(
        calls,
        0,
        `${field} reached fork execution`
      );
    }
  }
);

test(
  "rejects uncontrolled or mismatched fork provenance before execution",
  async () => {
    const cases = [
      null,
      {},
      {
        method: "caller_assertion",
        sourceBlock: 94709817
      },
      {
        method: "hardhat_reset",
        sourceBlock: 94709818
      }
    ];

    for (const forkProvenance of cases) {
      const h = harness();
      let calls = 0;

      await assert.rejects(
        runQualifiedExecutionForkSimulation({
          qualifiedContext:
            h.qualifiedContext,
          forkProvenance,
          executeExactQualifiedPlanFn:
            async () => {
              calls += 1;
            }
        })
      );

      assert.equal(calls, 0);
    }
  }
);

test(
  "propagates controlled fork simulation failure unchanged",
  async () => {
    const h = harness();

    const failure =
      new Error("controlled fork failure");

    await assert.rejects(
      runQualifiedExecutionForkSimulation({
        qualifiedContext:
          h.qualifiedContext,
        forkProvenance:
          h.forkProvenance,
        executeExactQualifiedPlanFn:
          async () => {
            throw failure;
          }
      }),
      (error) => error === failure
    );
  }
);

test(
  "rejects invalid execution dependency before delegation",
  async () => {
    const h = harness();

    await assert.rejects(
      runQualifiedExecutionForkSimulation({
        qualifiedContext:
          h.qualifiedContext,
        forkProvenance:
          h.forkProvenance,
        executeExactQualifiedPlanFn:
          null
      }),
      /executeExactQualifiedPlanFn/
    );
  }
);

test(
  "contains no provider, fork reset, signer, transaction, broadcast, or execution reconstruction ownership",
  () => {
    const source =
      require("node:fs").readFileSync(
        require.resolve(
          "../scripts/utils/polygonV4QualifiedExecutionForkSimulation"
        ),
        "utf8"
      );

    const forbidden = [
      "JsonRpcProvider",
      "provider.send",
      "ethers.provider.send",
      "getSigners",
      "new Wallet",
      "sendTransaction",
      "initiateFlashloan",
      ".wait(",
      "buildV4ExecutionLegs",
      "encodeV4ExecutionPlan",
      "produceForkReceiptGasEvidence",
      "acquirePolicySnapshot",
      "policyGasUnits"
    ];

    for (const value of forbidden) {
      assert.equal(
        source.includes(value),
        false,
        `forbidden ownership detected: ${value}`
      );
    }
  }
);
