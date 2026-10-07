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

function buildCurrentEconomicsEvidenceComposition({
  readinessEvidence
}) {
  const readiness =
    requireObject(
      readinessEvidence,
      "readinessEvidence"
    );

  if (
    readiness.executionEvidenceReady !==
      true
  ) {
    throw new Error(
      "Execution evidence is not ready"
    );
  }

  const gasEvidence =
    requireObject(
      readiness.gasEvidence,
      "readinessEvidence.gasEvidence"
    );

  const qualificationPolicySnapshot =
    requireObject(
      readiness.qualificationPolicySnapshot,
      "readinessEvidence.qualificationPolicySnapshot"
    );

  const economicsEvidence =
    Object.freeze({
      gasEvidence,
      qualificationPolicySnapshot
    });

  return Object.freeze({
    economicsEvidence,
    currentEconomicsEvidenceCompositionReady:
      true
  });
}

module.exports = {
  buildCurrentEconomicsEvidenceComposition
};
