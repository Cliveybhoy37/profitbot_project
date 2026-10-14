"use strict";

const {
  buildCurrentTransactionEnvelopeEvidence
} = require(
  "./polygonV4CurrentTransactionEnvelopeEvidence"
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

function buildCurrentTransactionEnvelopeCompositionEvidence({
  currentTransactionGasLimitSelectionCompositionEvidence
} = {}) {
  const composition =
    requireObject(
      currentTransactionGasLimitSelectionCompositionEvidence,
      "Current transaction gas-limit selection composition evidence"
    );

  if (
    composition
      .currentTransactionGasLimitSelectionCompositionReady !==
    true
  ) {
    throw new Error(
      "Current transaction gas-limit selection composition evidence is not ready"
    );
  }

  const currentTransactionGasLimitSelectionEvidence =
    requireObject(
      composition.currentTransactionGasLimitSelectionEvidence,
      "Current transaction gas-limit selection evidence"
    );

  if (
    currentTransactionGasLimitSelectionEvidence
      .currentTransactionGasLimitSelectionReady !==
    true
  ) {
    throw new Error(
      "Current transaction gas-limit selection evidence is not ready"
    );
  }

  const currentTransactionEnvelopeEvidence =
    buildCurrentTransactionEnvelopeEvidence({
      currentTransactionGasLimitSelectionEvidence
    });

  return Object.freeze({
    currentTransactionGasLimitSelectionCompositionEvidence:
      composition,

    currentTransactionEnvelopeEvidence,

    currentTransactionEnvelopeCompositionReady:
      true
  });
}

module.exports = {
  buildCurrentTransactionEnvelopeCompositionEvidence
};
