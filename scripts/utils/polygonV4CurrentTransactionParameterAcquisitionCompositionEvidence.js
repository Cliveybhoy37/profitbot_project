"use strict";

const {
  acquireCurrentTransactionParameterEvidence
} = require(
  "./polygonV4CurrentTransactionParameterEvidence"
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

async function buildCurrentTransactionParameterAcquisitionCompositionEvidence({
  unsignedExactTransactionIntentCompositionEvidence,
  provider
} = {}) {
  const composition =
    requireObject(
      unsignedExactTransactionIntentCompositionEvidence,
      "Unsigned exact transaction intent composition evidence"
    );

  if (
    composition
      .unsignedExactTransactionIntentCompositionReady !==
    true
  ) {
    throw new Error(
      "Unsigned exact transaction intent composition evidence is not ready"
    );
  }

  const unsignedTransactionIntentEvidence =
    requireObject(
      composition.unsignedTransactionIntentEvidence,
      "Unsigned transaction intent evidence"
    );

  if (
    unsignedTransactionIntentEvidence
      .unsignedTransactionIntentReady !==
    true
  ) {
    throw new Error(
      "Unsigned transaction intent evidence is not ready"
    );
  }

  const currentTransactionParameterEvidence =
    await acquireCurrentTransactionParameterEvidence({
      unsignedTransactionIntentEvidence,
      provider
    });

  return Object.freeze({
    unsignedExactTransactionIntentCompositionEvidence:
      composition,

    currentTransactionParameterEvidence,

    currentTransactionParameterAcquisitionCompositionReady:
      true
  });
}

module.exports = {
  buildCurrentTransactionParameterAcquisitionCompositionEvidence
};
