"use strict";

const {
  produceControlledTransactionReceiptEvidence
} = require(
  "./polygonV4ControlledTransactionReceiptEvidence"
);

function requireObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(`${label} must be an object`);
  }

  return value;
}

async function buildControlledTransactionReceiptCompositionEvidence({
  controlledExactSignedTransactionSubmissionCompositionEvidence,
  acquireTransactionReceipt
} = {}) {
  const composition = requireObject(
    controlledExactSignedTransactionSubmissionCompositionEvidence,
    "Controlled exact signed transaction submission composition evidence"
  );

  if (
    composition
      .controlledExactSignedTransactionSubmissionCompositionReady !==
    true
  ) {
    throw new Error(
      "Controlled exact signed transaction submission composition evidence is not ready"
    );
  }

  const controlledExactSignedTransactionSubmissionEvidence =
    requireObject(
      composition
        .controlledExactSignedTransactionSubmissionEvidence,
      "Controlled exact signed transaction submission evidence"
    );

  if (
    controlledExactSignedTransactionSubmissionEvidence
      .controlledExactSignedTransactionSubmissionReady !==
    true
  ) {
    throw new Error(
      "Controlled exact signed transaction submission evidence is not ready"
    );
  }

  const controlledTransactionReceiptEvidence =
    await produceControlledTransactionReceiptEvidence({
      controlledExactSignedTransactionSubmissionEvidence,
      acquireTransactionReceipt
    });

  return Object.freeze({
    controlledExactSignedTransactionSubmissionCompositionEvidence:
      composition,

    controlledTransactionReceiptEvidence,

    controlledTransactionReceiptCompositionReady: true
  });
}

module.exports = {
  buildControlledTransactionReceiptCompositionEvidence
};
