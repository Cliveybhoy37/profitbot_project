"use strict";

const {
  validateImmediatePreSubmissionEvidence
} = require(
  "./polygonV4ImmediatePreSubmissionValidationEvidence"
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

async function buildImmediatePreSubmissionValidationCompositionEvidence({
  controlledLiveExecutionAuthorizationCompositionEvidence,
  provider
} = {}) {
  const composition =
    requireObject(
      controlledLiveExecutionAuthorizationCompositionEvidence,
      "Controlled live execution authorization composition evidence"
    );

  if (
    composition
      .controlledLiveExecutionAuthorizationCompositionReady !==
    true
  ) {
    throw new Error(
      "Controlled live execution authorization composition evidence is not ready"
    );
  }

  const controlledLiveExecutionAuthorizationEvidence =
    requireObject(
      composition
        .controlledLiveExecutionAuthorizationEvidence,
      "Controlled live execution authorization evidence"
    );

  if (
    controlledLiveExecutionAuthorizationEvidence
      .controlledLiveExecutionAuthorizationReady !==
    true
  ) {
    throw new Error(
      "Controlled live execution authorization evidence is not ready"
    );
  }

  const immediatePreSubmissionValidationEvidence =
    await validateImmediatePreSubmissionEvidence({
      controlledLiveExecutionAuthorizationEvidence,
      provider
    });

  return Object.freeze({
    controlledLiveExecutionAuthorizationCompositionEvidence:
      composition,

    immediatePreSubmissionValidationEvidence,

    immediatePreSubmissionValidationCompositionReady:
      true
  });
}

module.exports = {
  buildImmediatePreSubmissionValidationCompositionEvidence
};
