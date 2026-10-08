"use strict";

const {
  acquireCurrentTransactionPreSendSimulationEvidence
} = require(
  "./polygonV4CurrentTransactionPreSendSimulationEvidence"
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

async function buildCurrentTransactionPreSendSimulationAcquisitionCompositionEvidence({
  currentTransactionEnvelopeCompositionEvidence,
  provider
} = {}) {
  const composition =
    requireObject(
      currentTransactionEnvelopeCompositionEvidence,
      "Current transaction envelope composition evidence"
    );

  if (
    composition
      .currentTransactionEnvelopeCompositionReady !==
    true
  ) {
    throw new Error(
      "Current transaction envelope composition evidence is not ready"
    );
  }

  const currentTransactionEnvelopeEvidence =
    requireObject(
      composition.currentTransactionEnvelopeEvidence,
      "Current transaction envelope evidence"
    );

  if (
    currentTransactionEnvelopeEvidence
      .currentTransactionEnvelopeReady !==
    true
  ) {
    throw new Error(
      "Current transaction envelope evidence is not ready"
    );
  }

  const currentTransactionPreSendSimulationEvidence =
    await acquireCurrentTransactionPreSendSimulationEvidence({
      currentTransactionEnvelopeEvidence,
      provider
    });

  return Object.freeze({
    currentTransactionEnvelopeCompositionEvidence:
      composition,

    currentTransactionPreSendSimulationEvidence,

    currentTransactionPreSendSimulationAcquisitionCompositionReady:
      true
  });
}

module.exports = {
  buildCurrentTransactionPreSendSimulationAcquisitionCompositionEvidence
};
