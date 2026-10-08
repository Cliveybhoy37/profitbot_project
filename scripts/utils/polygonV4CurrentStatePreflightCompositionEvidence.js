"use strict";

const {
  buildCurrentStateExecutionPreflightEvidence
} = require(
  "./polygonV4CurrentStateExecutionPreflightEvidence"
);

function requireObject(value, label) {
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

function buildCurrentStatePreflightCompositionEvidence({
  readinessEvidence,
  currentStateEvidenceComposition
} = {}) {
  const readiness =
    requireObject(
      readinessEvidence,
      "Readiness evidence"
    );

  const composition =
    requireObject(
      currentStateEvidenceComposition,
      "Current-state evidence composition"
    );

  if (
    composition
      .currentStateEvidenceCompositionReady !==
    true
  ) {
    throw new Error(
      "Current-state evidence composition is not ready"
    );
  }

  const currentStateEvidence =
    requireObject(
      composition.currentStateEvidence,
      "Current-state evidence"
    );

  const currentStatePreflightEvidence =
    buildCurrentStateExecutionPreflightEvidence({
      readinessEvidence: readiness,
      currentStateEvidence
    });

  return Object.freeze({
    currentStateEvidenceComposition:
      composition,

    currentStatePreflightEvidence,

    currentStatePreflightCompositionReady:
      true
  });
}

module.exports = {
  buildCurrentStatePreflightCompositionEvidence
};
