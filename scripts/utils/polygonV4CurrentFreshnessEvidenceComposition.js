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

function requirePositiveSafeInteger(
  value,
  label
) {
  if (
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `${label} must be a positive safe integer`
    );
  }

  return value;
}

function buildCurrentFreshnessEvidenceComposition({
  preparedExecutionContext,
  currentChainTimestampEvidence
} = {}) {
  const prepared =
    requireObject(
      preparedExecutionContext,
      "Prepared execution context"
    );

  const timestampEvidence =
    requireObject(
      currentChainTimestampEvidence,
      "Current chain timestamp evidence"
    );

  const deadline =
    requirePositiveSafeInteger(
      prepared.deadline,
      "Prepared execution context deadline"
    );

  const currentTimestamp =
    requirePositiveSafeInteger(
      timestampEvidence.currentTimestamp,
      "Current chain timestamp"
    );

  const freshnessEvidence =
    Object.freeze({
      deadline,
      currentTimestamp
    });

  return Object.freeze({
    freshnessEvidence,
    currentFreshnessEvidenceCompositionReady:
      true
  });
}

module.exports = {
  buildCurrentFreshnessEvidenceComposition
};
