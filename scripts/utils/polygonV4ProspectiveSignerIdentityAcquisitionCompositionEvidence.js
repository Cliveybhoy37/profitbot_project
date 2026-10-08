"use strict";

const {
  acquireProspectiveSignerIdentityEvidence
} = require(
  "./polygonV4ProspectiveSignerIdentityEvidence"
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

async function buildProspectiveSignerIdentityAcquisitionCompositionEvidence({
  currentTransactionPreSendSimulationAcquisitionCompositionEvidence,
  getSignerAddress
} = {}) {
  const composition =
    requireObject(
      currentTransactionPreSendSimulationAcquisitionCompositionEvidence,
      "Current transaction pre-send simulation acquisition composition evidence"
    );

  if (
    composition
      .currentTransactionPreSendSimulationAcquisitionCompositionReady !==
    true
  ) {
    throw new Error(
      "Current transaction pre-send simulation acquisition composition evidence is not ready"
    );
  }

  const currentTransactionPreSendSimulationEvidence =
    requireObject(
      composition.currentTransactionPreSendSimulationEvidence,
      "Current transaction pre-send simulation evidence"
    );

  if (
    currentTransactionPreSendSimulationEvidence
      .currentTransactionPreSendSimulationReady !==
    true
  ) {
    throw new Error(
      "Current transaction pre-send simulation evidence is not ready"
    );
  }

  const prospectiveSignerIdentityEvidence =
    await acquireProspectiveSignerIdentityEvidence({
      preSendSimulationEvidence:
        currentTransactionPreSendSimulationEvidence,
      getSignerAddress
    });

  return Object.freeze({
    currentTransactionPreSendSimulationAcquisitionCompositionEvidence:
      composition,

    prospectiveSignerIdentityEvidence,

    prospectiveSignerIdentityAcquisitionCompositionReady:
      true
  });
}

module.exports = {
  buildProspectiveSignerIdentityAcquisitionCompositionEvidence
};
