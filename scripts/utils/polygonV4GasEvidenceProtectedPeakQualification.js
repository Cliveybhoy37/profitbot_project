"use strict";

const {
  selectProtectedPeakHandoff
} = require("./polygonV4ProtectedPeakHandoff");

const {
  buildObservedV4Candidate
} = require("./polygonV4ObservedCandidate");

const {
  buildV4ExecutionLegs
} = require("./polygonV4ExecutionRoute");

const {
  validateForkReceiptGasEvidence
} = require("./polygonV4ForkReceiptGasEvidence");

const {
  acquireQualificationPolicySnapshot
} = require("./polygonV4QualificationPolicySnapshot");

const {
  qualifyProtectedPeakHandoff
} = require("./polygonV4ProtectedPeakQualification");

function requireFunction(value, label) {
  if (typeof value !== "function") {
    throw new Error(
      `${label} must be a function`
    );
  }

  return value;
}

async function qualifyGasEvidenceProtectedPeakHandoff({
  provider,
  operationalResult,
  startToken,
  entryToken,
  exitToken,
  slippageBps,
  maxSlippageBps,
  maxAgeBlocks,
  executionPlan,
  gasEvidence,
  safetyReserveWei,
  minimumNetProfitWei,
  selectProtectedPeakHandoffFn =
    selectProtectedPeakHandoff,
  buildObservedCandidateFn =
    buildObservedV4Candidate,
  buildV4ExecutionLegsFn =
    buildV4ExecutionLegs,
  validateForkReceiptGasEvidenceFn =
    validateForkReceiptGasEvidence,
  acquirePolicySnapshotFn =
    acquireQualificationPolicySnapshot,
  qualifyProtectedPeakHandoffFn =
    qualifyProtectedPeakHandoff
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

  const validateGasEvidence =
    requireFunction(
      validateForkReceiptGasEvidenceFn,
      "validateForkReceiptGasEvidenceFn"
    );

  const acquirePolicySnapshot =
    requireFunction(
      acquirePolicySnapshotFn,
      "acquirePolicySnapshotFn"
    );

  const qualifyHandoff =
    requireFunction(
      qualifyProtectedPeakHandoffFn,
      "qualifyProtectedPeakHandoffFn"
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

  const validatedGasEvidence =
    validateGasEvidence({
      candidate,
      executionLegs,
      executionPlan,
      evidence: gasEvidence
    });

  const policySnapshot =
    await acquirePolicySnapshot({
      provider
    });

  return qualifyHandoff({
    operationalResult,
    policySnapshot,
    startToken,
    entryToken,
    exitToken,
    slippageBps,
    maxSlippageBps,
    maxAgeBlocks,
    estimatedGas:
      validatedGasEvidence.gasUnits,
    safetyReserveWei,
    minimumNetProfitWei
  });
}

module.exports = {
  qualifyGasEvidenceProtectedPeakHandoff
};
