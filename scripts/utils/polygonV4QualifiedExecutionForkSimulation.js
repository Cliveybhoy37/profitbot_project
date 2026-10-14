"use strict";

function requireObject(value, label) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(`${label} object required`);
  }

  return value;
}

function requireFunction(value, label) {
  if (typeof value !== "function") {
    throw new Error(`${label} function required`);
  }

  return value;
}

async function runQualifiedExecutionForkSimulation({
  qualifiedContext,
  forkProvenance,
  executeExactQualifiedPlanFn
}) {
  const context =
    requireObject(
      qualifiedContext,
      "Qualified execution context"
    );

  const qualificationResult =
    requireObject(
      context.qualificationResult,
      "Qualified execution context qualificationResult"
    );

  if (qualificationResult.qualified !== true) {
    throw new Error(
      "Successful qualified execution context required"
    );
  }

  const candidate =
    requireObject(
      context.candidate,
      "Qualified execution context candidate"
    );

  if (
    !Number.isSafeInteger(candidate.blockTag) ||
    candidate.blockTag <= 0
  ) {
    throw new Error(
      "Qualified execution context candidate requires positive safe blockTag"
    );
  }

  if (
    !Array.isArray(context.executionLegs) ||
    context.executionLegs.length !== 3
  ) {
    throw new Error(
      "Qualified execution context requires exactly three execution legs"
    );
  }

  if (
    typeof context.executionPlan !== "string" ||
    context.executionPlan === "0x" ||
    !/^0x[0-9a-fA-F]+$/.test(
      context.executionPlan
    ) ||
    context.executionPlan.length % 2 !== 0
  ) {
    throw new Error(
      "Qualified execution context executionPlan required"
    );
  }

  if (
    !Number.isSafeInteger(context.deadline) ||
    context.deadline <= 0
  ) {
    throw new Error(
      "Qualified execution context deadline required"
    );
  }

  requireObject(
    context.policySnapshot,
    "Qualified execution context policySnapshot"
  );

  requireObject(
    context.gasEvidence,
    "Qualified execution context gasEvidence"
  );

  const provenance =
    requireObject(
      forkProvenance,
      "Controlled fork provenance"
    );

  if (
    provenance.method !== "hardhat_reset" ||
    !Number.isSafeInteger(
      provenance.sourceBlock
    ) ||
    provenance.sourceBlock <= 0
  ) {
    throw new Error(
      "Controlled hardhat_reset fork provenance required"
    );
  }

  if (
    provenance.sourceBlock !==
    candidate.blockTag
  ) {
    throw new Error(
      "Fork source block must equal qualified candidate blockTag"
    );
  }

  const executeExactQualifiedPlan =
    requireFunction(
      executeExactQualifiedPlanFn,
      "executeExactQualifiedPlanFn"
    );

  const simulationResult =
    await executeExactQualifiedPlan({
      qualificationResult,
      candidate,
      executionLegs:
        context.executionLegs,
      executionPlan:
        context.executionPlan,
      deadline:
        context.deadline,
      policySnapshot:
        context.policySnapshot,
      gasEvidence:
        context.gasEvidence,
      forkProvenance:
        provenance
    });

  return {
    qualifiedContext: context,
    forkProvenance: provenance,
    simulationResult
  };
}

module.exports = {
  runQualifiedExecutionForkSimulation
};
