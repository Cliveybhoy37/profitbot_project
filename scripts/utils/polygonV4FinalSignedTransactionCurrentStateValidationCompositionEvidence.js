"use strict";

const {
  validateFinalSignedTransactionCurrentStateEvidence
} = require(
  "./polygonV4FinalSignedTransactionCurrentStateValidationEvidence"
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

async function buildFinalSignedTransactionCurrentStateValidationCompositionEvidence({
  exactTransactionSigningCompositionEvidence,
  provider
} = {}) {
  const composition =
    requireObject(
      exactTransactionSigningCompositionEvidence,
      "Exact transaction signing composition evidence"
    );

  if (
    composition.exactTransactionSigningCompositionReady !==
    true
  ) {
    throw new Error(
      "Exact transaction signing composition evidence is not ready"
    );
  }

  const transactionSigningEvidence =
    requireObject(
      composition.exactTransactionSigningEvidence,
      "Exact transaction signing evidence"
    );

  if (
    transactionSigningEvidence.transactionSigningReady !==
    true
  ) {
    throw new Error(
      "Exact transaction signing evidence is not ready"
    );
  }

  const finalSignedTransactionCurrentStateEvidence =
    await validateFinalSignedTransactionCurrentStateEvidence({
      transactionSigningEvidence,
      provider
    });

  return Object.freeze({
    exactTransactionSigningCompositionEvidence:
      composition,

    finalSignedTransactionCurrentStateEvidence,

    finalSignedTransactionCurrentStateValidationCompositionReady:
      true
  });
}

module.exports = {
  buildFinalSignedTransactionCurrentStateValidationCompositionEvidence
};
