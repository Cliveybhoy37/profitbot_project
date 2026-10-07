"use strict";

const { ethers } = require("ethers");

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

function buildCurrentStateExecutionPreflightEvidence({
  readinessEvidence,
  currentStateEvidence
}) {
  const readiness =
    requireObject(
      readinessEvidence,
      "readinessEvidence"
    );

  const current =
    requireObject(
      currentStateEvidence,
      "currentStateEvidence"
    );

  if (
    readiness.executionEvidenceReady !==
    true
  ) {
    throw new Error(
      "Execution evidence must be ready"
    );
  }

  if (
    readiness.liveExecutionAuthorized !==
      false ||
    readiness.signerAuthorized !== false ||
    readiness.broadcastAuthorized !== false
  ) {
    throw new Error(
      "Upstream execution authorization must remain false"
    );
  }

  const prepared =
    requireObject(
      readiness.preparedExecutionContext,
      "preparedExecutionContext"
    );

  const qualified =
    requireObject(
      readiness.qualifiedContext,
      "qualifiedContext"
    );

  const executionPlan =
    readiness.executionPlan;

  if (
    executionPlan === null ||
    executionPlan === undefined
  ) {
    throw new Error(
      "Execution plan is required"
    );
  }

  if (
    prepared.executionPlan !==
      executionPlan ||
    qualified.executionPlan !==
      executionPlan
  ) {
    throw new Error(
      "Execution plan identity mismatch"
    );
  }

  if (
    qualified.gasEvidence !==
      readiness.gasEvidence
  ) {
    throw new Error(
      "Gas evidence identity mismatch"
    );
  }

  if (
    qualified.policySnapshot !==
      readiness.qualificationPolicySnapshot
  ) {
    throw new Error(
      "Qualification policy identity mismatch"
    );
  }

  const chain =
    requireObject(
      current.chainEvidence,
      "chainEvidence"
    );

  if (chain.chainId !== 137) {
    throw new Error(
      "Current chain must be Polygon"
    );
  }

  const deployment =
    requireObject(
      current.deploymentEvidence,
      "deploymentEvidence"
    );

  if (
    !ethers.utils.isAddress(
      deployment.executorAddress
    ) ||
    deployment.executorAddress ===
      ethers.constants.AddressZero
  ) {
    throw new Error(
      "Executor deployment address evidence is invalid"
    );
  }

  if (
    typeof deployment.executorCodeHash !==
      "string" ||
    !ethers.utils.isHexString(
      deployment.executorCodeHash,
      32
    )
  ) {
    throw new Error(
      "Executor deployment code hash evidence is invalid"
    );
  }

  const executorContext =
    requireObject(
      readiness.gasEvidence.executorContext,
      "readinessEvidence.gasEvidence.executorContext"
    );

  if (
    executorContext.executorAddress !== undefined
  ) {
    if (
      !ethers.utils.isAddress(
        executorContext.executorAddress
      ) ||
      executorContext.executorAddress ===
        ethers.constants.AddressZero
    ) {
      throw new Error(
        "Measured executor address evidence is invalid"
      );
    }

    if (
      deployment.executorAddress.toLowerCase() !==
        executorContext.executorAddress.toLowerCase()
    ) {
      throw new Error(
        "Executor deployment address identity mismatch"
      );
    }
  }

  if (
    typeof executorContext.executorCodeHash !==
      "string" ||
    !ethers.utils.isHexString(
      executorContext.executorCodeHash,
      32
    )
  ) {
    throw new Error(
      "Measured executor code hash evidence is invalid"
    );
  }

  if (
    deployment.executorCodeHash.toLowerCase() !==
      executorContext.executorCodeHash.toLowerCase()
  ) {
    throw new Error(
      "Executor deployment code hash identity mismatch"
    );
  }

  const routeAmount =
    requireObject(
      current.routeAmountEvidence,
      "routeAmountEvidence"
    );

  if (
    routeAmount.executionPlan !==
      executionPlan
  ) {
    throw new Error(
      "Route execution plan identity mismatch"
    );
  }

  if (
    routeAmount.candidate !==
      prepared.candidate ||
    qualified.candidate !==
      prepared.candidate
  ) {
    throw new Error(
      "Candidate identity mismatch"
    );
  }

  if (
    routeAmount.executionLegs !==
      prepared.executionLegs ||
    qualified.executionLegs !==
      prepared.executionLegs
  ) {
    throw new Error(
      "Execution legs identity mismatch"
    );
  }

  if (
    routeAmount.amountIn !==
      prepared.candidate.amountIn
  ) {
    throw new Error(
      "Route amount identity mismatch"
    );
  }

  const economics =
    requireObject(
      current.economicsEvidence,
      "economicsEvidence"
    );

  if (
    economics.gasEvidence !==
      readiness.gasEvidence
  ) {
    throw new Error(
      "Gas evidence identity mismatch"
    );
  }

  if (
    economics.qualificationPolicySnapshot !==
      readiness.qualificationPolicySnapshot
  ) {
    throw new Error(
      "Qualification policy identity mismatch"
    );
  }

  const freshness =
    requireObject(
      current.freshnessEvidence,
      "freshnessEvidence"
    );

  if (
    freshness.deadline !==
      prepared.deadline
  ) {
    throw new Error(
      "Deadline identity mismatch"
    );
  }

  if (
    !Number.isFinite(
      freshness.currentTimestamp
    ) ||
    !Number.isFinite(
      freshness.deadline
    ) ||
    freshness.currentTimestamp >=
      freshness.deadline
  ) {
    throw new Error(
      "Current-state deadline is expired"
    );
  }

  const balanceAllowance =
    requireObject(
      current.balanceAllowanceEvidence,
      "balanceAllowanceEvidence"
    );

  if (
    balanceAllowance.checked !== true ||
    balanceAllowance.sufficient !== true
  ) {
    throw new Error(
      "Balance and allowance evidence must be sufficient"
    );
  }

  const qualificationResult =
    requireObject(
      qualified.qualificationResult,
      "qualifiedContext.qualificationResult"
    );

  if (
    qualificationResult.qualified !== true ||
    qualificationResult.stage !==
      "QUALIFIED"
  ) {
    throw new Error(
      "Qualified execution context must preserve a successful QUALIFIED result"
    );
  }

  const authoritativePreflight =
    requireObject(
      qualificationResult.preflight,
      "qualifiedContext.qualificationResult.preflight"
    );

  const preflight =
    requireObject(
      current.preflightEvidence,
      "preflightEvidence"
    );

  if (
    preflight !==
      authoritativePreflight
  ) {
    throw new Error(
      "Current-state preflight identity mismatch"
    );
  }

  return Object.freeze({
    readinessEvidence: readiness,
    currentStateEvidence: current,

    candidate:
      prepared.candidate,

    executionLegs:
      prepared.executionLegs,

    executionPlan,

    gasEvidence:
      readiness.gasEvidence,

    qualificationPolicySnapshot:
      readiness
        .qualificationPolicySnapshot,

    qualifiedContext:
      qualified,

    currentStatePreflightReady: true,

    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  });
}

module.exports = {
  buildCurrentStateExecutionPreflightEvidence
};
