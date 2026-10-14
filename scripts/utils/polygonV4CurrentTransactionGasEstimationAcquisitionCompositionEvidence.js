"use strict";

const {
  acquireCurrentTransactionGasEstimationEvidence
} = require(
  "./polygonV4CurrentTransactionGasEstimationEvidence"
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

async function buildCurrentTransactionGasEstimationAcquisitionCompositionEvidence({
  currentTransactionParameterAcquisitionCompositionEvidence,
  provider
} = {}) {
  const composition =
    requireObject(
      currentTransactionParameterAcquisitionCompositionEvidence,
      "Current transaction parameter acquisition composition evidence"
    );

  if (
    composition
      .currentTransactionParameterAcquisitionCompositionReady !==
    true
  ) {
    throw new Error(
      "Current transaction parameter acquisition composition evidence is not ready"
    );
  }

  const currentTransactionParameterEvidence =
    requireObject(
      composition.currentTransactionParameterEvidence,
      "Current transaction parameter evidence"
    );

  if (
    currentTransactionParameterEvidence
      .currentTransactionParametersReady !==
    true
  ) {
    throw new Error(
      "Current transaction parameter evidence is not ready"
    );
  }

  const currentTransactionGasEstimationEvidence =
    await acquireCurrentTransactionGasEstimationEvidence({
      currentTransactionParameterEvidence,
      provider
    });

  return Object.freeze({
    currentTransactionParameterAcquisitionCompositionEvidence:
      composition,

    currentTransactionGasEstimationEvidence,

    currentTransactionGasEstimationAcquisitionCompositionReady:
      true
  });
}

module.exports = {
  buildCurrentTransactionGasEstimationAcquisitionCompositionEvidence
};
