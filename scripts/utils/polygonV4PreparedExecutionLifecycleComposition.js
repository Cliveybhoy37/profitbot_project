"use strict";

const {
  acquireQualificationExecutionContext
} = require(
  "./polygonV4QualificationExecutionContext"
);

const {
  prepareExactExecutionPlan
} = require(
  "./polygonV4ExecutionPlanPreparation"
);

const {
  produceForkReceiptGasEvidence
} = require(
  "./polygonV4ForkReceiptGasEvidenceProducer"
);

const {
  qualifyPreparedExecutionContext
} = require(
  "./polygonV4PreparedExecutionContextQualification"
);

const {
  runQualifiedExecutionForkSimulation
} = require(
  "./polygonV4QualifiedExecutionForkSimulation"
);

function requireFunction(value, label) {
  if (typeof value !== "function") {
    throw new Error(
      `${label} function required`
    );
  }

  return value;
}

async function runPreparedExecutionLifecycleComposition({
  provider,
  operationalResult,
  startToken,
  entryToken,
  exitToken,
  slippageBps,
  maxSlippageBps,
  maxAgeBlocks,
  deadlineSeconds,
  minimumNetProfitWei,
  safetyReserveWei,

  forkProvider,
  executor,
  forkProvenance,
  executeExactPlanFn,
  executeExactQualifiedPlanFn,

  acquirePreparationExecutionContextFn =
    acquireQualificationExecutionContext,

  prepareExactExecutionPlanFn =
    prepareExactExecutionPlan,

  produceForkReceiptGasEvidenceFn =
    produceForkReceiptGasEvidence,

  acquireQualificationExecutionContextFn =
    acquireQualificationExecutionContext,

  qualifyPreparedExecutionContextFn =
    qualifyPreparedExecutionContext,

  runQualifiedExecutionForkSimulationFn =
    runQualifiedExecutionForkSimulation
}) {
  const acquirePreparationContext =
    requireFunction(
      acquirePreparationExecutionContextFn,
      "acquirePreparationExecutionContextFn"
    );

  const preparePlan =
    requireFunction(
      prepareExactExecutionPlanFn,
      "prepareExactExecutionPlanFn"
    );

  const produceGasEvidence =
    requireFunction(
      produceForkReceiptGasEvidenceFn,
      "produceForkReceiptGasEvidenceFn"
    );

  const acquireFreshQualificationContext =
    requireFunction(
      acquireQualificationExecutionContextFn,
      "acquireQualificationExecutionContextFn"
    );

  const qualifyPrepared =
    requireFunction(
      qualifyPreparedExecutionContextFn,
      "qualifyPreparedExecutionContextFn"
    );

  const runFinalSimulation =
    requireFunction(
      runQualifiedExecutionForkSimulationFn,
      "runQualifiedExecutionForkSimulationFn"
    );

  const preparationExecutionContext =
    await acquirePreparationContext({
      provider,
      deadlineSeconds
    });

  if (
    !preparationExecutionContext ||
    typeof preparationExecutionContext !== "object" ||
    !Number.isSafeInteger(
      preparationExecutionContext.deadline
    ) ||
    preparationExecutionContext.deadline <= 0
  ) {
    throw new Error(
      "Preparation execution context with deadline required"
    );
  }

  const preparedExecutionContext =
    preparePlan({
      operationalResult,
      startToken,
      entryToken,
      exitToken,
      slippageBps,
      deadline:
        preparationExecutionContext.deadline,
      minimumNetProfitWei
    });

  if (
    !preparedExecutionContext ||
    typeof preparedExecutionContext !== "object"
  ) {
    throw new Error(
      "Prepared execution context required"
    );
  }

  const gasEvidence =
    await produceGasEvidence({
      provider: forkProvider,
      executor,
      candidate:
        preparedExecutionContext.candidate,
      executionLegs:
        preparedExecutionContext.executionLegs,
      executionPlan:
        preparedExecutionContext.executionPlan,
      forkProvenance,
      execute:
        executeExactPlanFn
    });

  const qualificationExecutionContext =
    await acquireFreshQualificationContext({
      provider,
      deadlineSeconds
    });

  if (
    !qualificationExecutionContext ||
    typeof qualificationExecutionContext !== "object" ||
    !Number.isSafeInteger(
      qualificationExecutionContext.policyBlockTimestamp
    ) ||
    qualificationExecutionContext.policyBlockTimestamp <= 0 ||
    !qualificationExecutionContext.policySnapshot ||
    typeof qualificationExecutionContext.policySnapshot !== "object"
  ) {
    throw new Error(
      "Fresh qualification execution context required"
    );
  }

  if (
    preparedExecutionContext.deadline <=
      qualificationExecutionContext.policyBlockTimestamp
  ) {
    throw new Error(
      "Prepared execution deadline expired before qualification"
    );
  }

  const qualificationPolicySnapshot =
    qualificationExecutionContext.policySnapshot;

  const qualifiedContext =
    qualifyPrepared({
      preparedExecutionContext,
      gasEvidence,
      policySnapshot:
        qualificationPolicySnapshot,
      slippageBps,
      maxSlippageBps,
      maxAgeBlocks,
      safetyReserveWei
    });

  if (
    !qualifiedContext ||
    typeof qualifiedContext !== "object"
  ) {
    throw new Error(
      "Prepared qualification result required"
    );
  }

  if (
    !qualifiedContext.qualificationResult ||
    qualifiedContext.qualificationResult.qualified !== true
  ) {
    return {
      preparationExecutionContext,
      preparedExecutionContext,
      gasEvidence,
      qualificationPolicySnapshot,
      qualifiedContext,
      simulationResult: null
    };
  }

  const simulationResult =
    await runFinalSimulation({
      qualifiedContext,
      forkProvenance,
      executeExactQualifiedPlanFn
    });

  return {
    preparationExecutionContext,
    preparedExecutionContext,
    gasEvidence,
    qualificationPolicySnapshot,
    qualifiedContext,
    simulationResult
  };
}

module.exports = {
  runPreparedExecutionLifecycleComposition
};
