"use strict";

const {
  selectCurrentTransactionGasLimitEvidence
} = require(
  "./polygonV4CurrentTransactionGasLimitSelectionEvidence"
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

function buildCurrentTransactionGasLimitSelectionCompositionEvidence({
  currentTransactionGasEstimationAcquisitionCompositionEvidence
} = {}) {
  const composition =
    requireObject(
      currentTransactionGasEstimationAcquisitionCompositionEvidence,
      "Current transaction gas estimation acquisition composition evidence"
    );

  if (
    composition
      .currentTransactionGasEstimationAcquisitionCompositionReady !==
    true
  ) {
    throw new Error(
      "Current transaction gas estimation acquisition composition evidence is not ready"
    );
  }

  const currentTransactionGasEstimationEvidence =
    requireObject(
      composition.currentTransactionGasEstimationEvidence,
      "Current transaction gas estimation evidence"
    );

  if (
    currentTransactionGasEstimationEvidence
      .currentTransactionGasEstimationReady !==
    true
  ) {
    throw new Error(
      "Current transaction gas estimation evidence is not ready"
    );
  }

  const currentTransactionGasLimitSelectionEvidence =
    selectCurrentTransactionGasLimitEvidence({
      currentTransactionGasEstimationEvidence
    });

  return Object.freeze({
    currentTransactionGasEstimationAcquisitionCompositionEvidence:
      composition,

    currentTransactionGasLimitSelectionEvidence,

    currentTransactionGasLimitSelectionCompositionReady:
      true
  });
}

module.exports = {
  buildCurrentTransactionGasLimitSelectionCompositionEvidence
};
