"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const MODULE_PATH =
  "../scripts/utils/polygonV4ExecutionReadinessEvidence";

function loadSubject() {
  return require(MODULE_PATH);
}

function makeSuccessfulLifecycleResult() {
  const executionPlan =
    "0x1234";

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

  const preparationExecutionContext = {
    policySnapshot: {
      currentBlock: 94709817
    },
    policyBlockTimestamp: 1790769867,
    deadline: 1790770167
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
    minimumNetProfitWei: {
      id: "minimum-profit"
    }
  };

  const gasEvidence = {
    id: "measured-gas-evidence"
  };

  const qualificationPolicySnapshot = {
    currentBlock: 94709818,
    gasPriceWei: {
      id: "fresh-gas-price"
    },
    premiumBps: 9
  };

  const qualificationResult = {
    qualified: true,
    stage: "QUALIFIED"
  };

  const qualifiedContext = {
    qualificationResult,
    candidate,
    executionLegs,
    executionPlan,
    deadline:
      preparedExecutionContext.deadline,
    minimumNetProfitWei:
      preparedExecutionContext
        .minimumNetProfitWei,
    policySnapshot:
      qualificationPolicySnapshot,
    gasEvidence
  };

  const receipt = {
    status: 1,
    transactionHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  };

  const finalExecutionResult = {
    receipt,
    accounting: {
      exact: true
    }
  };

  const forkProvenance = {
    method: "hardhat_reset",
    sourceBlock:
      candidate.blockTag
  };

  const simulationResult = {
    qualifiedContext,
    forkProvenance,
    simulationResult:
      finalExecutionResult
  };

  const lifecycleResult = {
    preparationExecutionContext,
    preparedExecutionContext,
    gasEvidence,
    qualificationPolicySnapshot,
    qualifiedContext,
    simulationResult
  };

  return {
    lifecycleResult,
    preparationExecutionContext,
    preparedExecutionContext,
    candidate,
    executionLegs,
    executionPlan,
    gasEvidence,
    qualificationPolicySnapshot,
    qualificationResult,
    qualifiedContext,
    forkProvenance,
    simulationResult,
    finalExecutionResult,
    receipt
  };
}

test(
  "preserves the exact successful 1S.23 lifecycle identities without reconstruction",
  () => {
    const {
      buildExecutionReadinessEvidence
    } = loadSubject();

    const h =
      makeSuccessfulLifecycleResult();

    const result =
      buildExecutionReadinessEvidence({
        lifecycleResult:
          h.lifecycleResult
      });

    assert.strictEqual(
      result.lifecycleResult,
      h.lifecycleResult
    );

    assert.strictEqual(
      result.preparationExecutionContext,
      h.preparationExecutionContext
    );

    assert.strictEqual(
      result.preparedExecutionContext,
      h.preparedExecutionContext
    );

    assert.strictEqual(
      result.executionPlan,
      h.executionPlan
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
      result.qualificationResult,
      h.qualificationResult
    );

    assert.strictEqual(
      result.simulationResult,
      h.simulationResult
    );

    assert.strictEqual(
      result.finalExecutionResult,
      h.finalExecutionResult
    );

    assert.strictEqual(
      result.receipt,
      h.receipt
    );
  }
);

test(
  "marks structural evidence readiness without authorizing live execution signer or broadcast",
  () => {
    const {
      buildExecutionReadinessEvidence
    } = loadSubject();

    const h =
      makeSuccessfulLifecycleResult();

    const result =
      buildExecutionReadinessEvidence({
        lifecycleResult:
          h.lifecycleResult
      });

    assert.equal(
      result.executionEvidenceReady,
      true
    );

    assert.equal(
      result.liveExecutionAuthorized,
      false
    );

    assert.equal(
      result.signerAuthorized,
      false
    );

    assert.equal(
      result.broadcastAuthorized,
      false
    );
  }
);

test(
  "rejects missing or malformed lifecycle result",
  () => {
    const {
      buildExecutionReadinessEvidence
    } = loadSubject();

    for (const lifecycleResult of [
      null,
      undefined,
      {},
      []
    ]) {
      assert.throws(
        () =>
          buildExecutionReadinessEvidence({
            lifecycleResult
          }),
        /lifecycle|prepared/i
      );
    }
  }
);

test(
  "rejects lifecycle evidence whose real qualificationResult is not qualified",
  () => {
    const {
      buildExecutionReadinessEvidence
    } = loadSubject();

    const h =
      makeSuccessfulLifecycleResult();

    h.qualifiedContext
      .qualificationResult = {
        qualified: false,
        reason: "NOT_PROFITABLE"
      };

    assert.throws(
      () =>
        buildExecutionReadinessEvidence({
          lifecycleResult:
            h.lifecycleResult
        }),
      /qualif/i
    );
  }
);

test(
  "rejects missing final simulation evidence",
  () => {
    const {
      buildExecutionReadinessEvidence
    } = loadSubject();

    const h =
      makeSuccessfulLifecycleResult();

    h.lifecycleResult
      .simulationResult = null;

    assert.throws(
      () =>
        buildExecutionReadinessEvidence({
          lifecycleResult:
            h.lifecycleResult
        }),
      /simulation/i
    );
  }
);

test(
  "rejects unsuccessful nested final simulation receipt",
  () => {
    const {
      buildExecutionReadinessEvidence
    } = loadSubject();

    const h =
      makeSuccessfulLifecycleResult();

    h.receipt.status = 0;

    assert.throws(
      () =>
        buildExecutionReadinessEvidence({
          lifecycleResult:
            h.lifecycleResult
        }),
      /receipt|simulation|success/i
    );
  }
);

test(
  "fails closed if prepared and qualified execution-plan identity diverges",
  () => {
    const {
      buildExecutionReadinessEvidence
    } = loadSubject();

    const h =
      makeSuccessfulLifecycleResult();

    h.qualifiedContext
      .executionPlan = "0xdead";

    assert.throws(
      () =>
        buildExecutionReadinessEvidence({
          lifecycleResult:
            h.lifecycleResult
        }),
      /identity|execution plan|plan/i
    );
  }
);

test(
  "fails closed if lifecycle and qualified gas-evidence identity diverges",
  () => {
    const {
      buildExecutionReadinessEvidence
    } = loadSubject();

    const h =
      makeSuccessfulLifecycleResult();

    h.qualifiedContext
      .gasEvidence = {
        id: "different-gas"
      };

    assert.throws(
      () =>
        buildExecutionReadinessEvidence({
          lifecycleResult:
            h.lifecycleResult
        }),
      /identity|gas/i
    );
  }
);

test(
  "fails closed if lifecycle and qualified policy-snapshot identity diverges",
  () => {
    const {
      buildExecutionReadinessEvidence
    } = loadSubject();

    const h =
      makeSuccessfulLifecycleResult();

    h.qualifiedContext
      .policySnapshot = {
        currentBlock: 999999
      };

    assert.throws(
      () =>
        buildExecutionReadinessEvidence({
          lifecycleResult:
            h.lifecycleResult
        }),
      /identity|policy/i
    );
  }
);

test(
  "fails closed if final simulation does not preserve qualified-context identity",
  () => {
    const {
      buildExecutionReadinessEvidence
    } = loadSubject();

    const h =
      makeSuccessfulLifecycleResult();

    h.simulationResult
      .qualifiedContext = {
        ...h.qualifiedContext
      };

    assert.throws(
      () =>
        buildExecutionReadinessEvidence({
          lifecycleResult:
            h.lifecycleResult
        }),
      /identity|qualified/i
    );
  }
);

test(
  "production boundary owns no signer transaction broadcast fork or reconstruction capability",
  () => {
    const sourcePath =
      path.join(
        __dirname,
        "..",
        "scripts",
        "utils",
        "polygonV4ExecutionReadinessEvidence.js"
      );

    const source =
      fs.readFileSync(
        sourcePath,
        "utf8"
      );

    const forbidden = [
      /getSigner/i,
      /getSigners/i,
      /new\s+Wallet/i,
      /privateKey/i,
      /private_key/i,
      /sendTransaction/i,
      /sendRawTransaction/i,
      /broadcastTransaction/i,
      /initiateFlashloan/i,
      /hardhat_reset/i,
      /evm_snapshot/i,
      /evm_revert/i,
      /JsonRpcProvider/i,
      /buildV4ExecutionLegs/i,
      /buildExecutionPlan/i,
      /prepareExecutionPlan/i,
      /populateTransaction/i
    ];

    for (const pattern of forbidden) {
      assert.equal(
        pattern.test(source),
        false,
        `forbidden ownership found: ${pattern}`
      );
    }
  }
);
