"use strict";

const {
  selectProtectedPeakHandoff
} = require(
  "./polygonV4ProtectedPeakHandoff"
);

const {
  buildObservedV4Candidate
} = require(
  "./polygonV4ObservedCandidate"
);

const {
  buildV4ExecutionLegs,
  encodeV4ExecutionPlan
} = require(
  "./polygonV4ExecutionRoute"
);

const {
  qualifyGasEvidenceProtectedPeakHandoff
} = require(
  "./polygonV4GasEvidenceProtectedPeakQualification"
);

function requireFunction(value, label) {
  if (typeof value !== "function") {
    throw new Error(
      `${label} must be a function`
    );
  }

  return value;
}

async function qualifyAndPreserveExecutionContext({
  provider,
  operationalResult,
  startToken,
  entryToken,
  exitToken,
  slippageBps,
  maxSlippageBps,
  maxAgeBlocks,
  deadline,
  gasEvidence,
  safetyReserveWei,
  minimumNetProfitWei,
  policySnapshot,

  selectProtectedPeakHandoffFn =
    selectProtectedPeakHandoff,

  buildObservedCandidateFn =
    buildObservedV4Candidate,

  buildV4ExecutionLegsFn =
    buildV4ExecutionLegs,

  encodeV4ExecutionPlanFn =
    encodeV4ExecutionPlan,

  qualifyGasEvidenceProtectedPeakHandoffFn =
    qualifyGasEvidenceProtectedPeakHandoff
}) {
  const selectHandoff =
    requireFunction(
      selectProtectedPeakHandoffFn,
      "selectProtectedPeakHandoffFn"
    );

  const buildCandidate =
    requireFunction(
      buildObservedCandidateFn,
      "buildObservedCandidateFn"
    );

  const buildExecutionLegs =
    requireFunction(
      buildV4ExecutionLegsFn,
      "buildV4ExecutionLegsFn"
    );

  const encodeExecutionPlan =
    requireFunction(
      encodeV4ExecutionPlanFn,
      "encodeV4ExecutionPlanFn"
    );

  const qualifyGasEvidence =
    requireFunction(
      qualifyGasEvidenceProtectedPeakHandoffFn,
      "qualifyGasEvidenceProtectedPeakHandoffFn"
    );

  const handoff =
    selectHandoff(
      operationalResult
    );

  const candidate =
    buildCandidate({
      observation:
        handoff.observation,
      startToken,
      entryToken,
      exitToken
    });

  const executionLegs =
    buildExecutionLegs(
      candidate.legs,
      slippageBps
    );

  const executionPlan =
    encodeExecutionPlan({
      legs: executionLegs,
      deadline,
      minimumProfit:
        minimumNetProfitWei
    });

  const qualificationResult =
    await qualifyGasEvidence({
      provider,
      operationalResult,
      startToken,
      entryToken,
      exitToken,
      slippageBps,
      maxSlippageBps,
      maxAgeBlocks,
      gasEvidence,
      executionPlan,
      safetyReserveWei,
      minimumNetProfitWei,
      policySnapshot
    });

  if (
    !qualificationResult ||
    typeof qualificationResult !== "object" ||
    typeof qualificationResult.qualified !== "boolean"
  ) {
    throw new Error(
      "Qualification result with boolean qualified status required"
    );
  }

  if (!qualificationResult.qualified) {
    return qualificationResult;
  }

  return {
    qualificationResult,
    candidate,
    executionLegs,
    executionPlan,
    deadline,
    policySnapshot,
    gasEvidence
  };
}

module.exports = {
  qualifyAndPreserveExecutionContext
};
