"use strict";

function requireObject(
  value,
  label
) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      `${label} must be an object`
    );
  }

  return value;
}

function buildExecutionReadinessEvidence({
  lifecycleResult
}) {
  const lifecycle =
    requireObject(
      lifecycleResult,
      "lifecycleResult"
    );

  const preparationExecutionContext =
    requireObject(
      lifecycle.preparationExecutionContext,
      "lifecycleResult.preparationExecutionContext"
    );

  const preparedExecutionContext =
    requireObject(
      lifecycle.preparedExecutionContext,
      "lifecycleResult.preparedExecutionContext"
    );

  const executionPlan =
    preparedExecutionContext.executionPlan;

  if (
    executionPlan === null ||
    executionPlan === undefined
  ) {
    throw new Error(
      "Prepared execution plan required"
    );
  }

  const gasEvidence =
    requireObject(
      lifecycle.gasEvidence,
      "lifecycleResult.gasEvidence"
    );

  const qualificationPolicySnapshot =
    requireObject(
      lifecycle.qualificationPolicySnapshot,
      "lifecycleResult.qualificationPolicySnapshot"
    );

  const qualifiedContext =
    requireObject(
      lifecycle.qualifiedContext,
      "lifecycleResult.qualifiedContext"
    );

  const qualificationResult =
    requireObject(
      qualifiedContext.qualificationResult,
      "qualifiedContext.qualificationResult"
    );

  if (
    qualificationResult.qualified !== true
  ) {
    throw new Error(
      "Lifecycle result is not successfully qualified"
    );
  }

  if (
    qualifiedContext.executionPlan !==
      executionPlan
  ) {
    throw new Error(
      "Execution plan identity mismatch"
    );
  }

  if (
    qualifiedContext.gasEvidence !==
      gasEvidence
  ) {
    throw new Error(
      "Gas evidence identity mismatch"
    );
  }

  if (
    qualifiedContext.policySnapshot !==
      qualificationPolicySnapshot
  ) {
    throw new Error(
      "Qualification policy identity mismatch"
    );
  }

  const simulationResult =
    requireObject(
      lifecycle.simulationResult,
      "lifecycleResult.simulationResult"
    );

  if (
    simulationResult.qualifiedContext !==
      qualifiedContext
  ) {
    throw new Error(
      "Simulation qualified-context identity mismatch"
    );
  }

  const finalExecutionResult =
    requireObject(
      simulationResult.simulationResult,
      "final simulation result"
    );

  const receipt =
    requireObject(
      finalExecutionResult.receipt,
      "final simulation receipt"
    );

  if (
    receipt.status !== 1
  ) {
    throw new Error(
      "Final simulation receipt is not successful"
    );
  }

  return Object.freeze({
    lifecycleResult:
      lifecycle,

    preparationExecutionContext,

    preparedExecutionContext,

    executionPlan,

    gasEvidence,

    qualificationPolicySnapshot,

    qualifiedContext,

    qualificationResult,

    simulationResult,

    finalExecutionResult,

    receipt,

    executionEvidenceReady:
      true,

    liveExecutionAuthorized:
      false,

    signerAuthorized:
      false,

    broadcastAuthorized:
      false
  });
}

module.exports = {
  buildExecutionReadinessEvidence
};
