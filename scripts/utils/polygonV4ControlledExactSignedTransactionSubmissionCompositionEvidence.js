"use strict";

const {
  submitControlledExactSignedTransaction
} = require(
  "./polygonV4ControlledExactSignedTransactionSubmissionEvidence"
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

async function buildControlledExactSignedTransactionSubmissionCompositionEvidence({
  immediatePreSubmissionValidationCompositionEvidence,
  submitSignedTransaction
} = {}) {
  const composition =
    requireObject(
      immediatePreSubmissionValidationCompositionEvidence,
      "Immediate pre-submission validation composition evidence"
    );

  if (
    composition
      .immediatePreSubmissionValidationCompositionReady !==
    true
  ) {
    throw new Error(
      "Immediate pre-submission validation composition evidence is not ready"
    );
  }

  const immediatePreSubmissionValidationEvidence =
    requireObject(
      composition
        .immediatePreSubmissionValidationEvidence,
      "Immediate pre-submission validation evidence"
    );

  if (
    immediatePreSubmissionValidationEvidence
      .immediatePreSubmissionValidationReady !==
    true
  ) {
    throw new Error(
      "Immediate pre-submission validation evidence is not ready"
    );
  }

  const controlledExactSignedTransactionSubmissionEvidence =
    await submitControlledExactSignedTransaction({
      immediatePreSubmissionValidationEvidence,
      submitSignedTransaction
    });

  return Object.freeze({
    immediatePreSubmissionValidationCompositionEvidence:
      composition,

    controlledExactSignedTransactionSubmissionEvidence,

    controlledExactSignedTransactionSubmissionCompositionReady:
      true
  });
}

module.exports = {
  buildControlledExactSignedTransactionSubmissionCompositionEvidence
};
