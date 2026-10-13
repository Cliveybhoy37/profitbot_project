"use strict";

const {
  validateFinalTransactionEconomicsEvidence
} = require("./polygonV4FinalTransactionEconomicsEvidence");

const {
  acquireNativeGasBalanceEvidence
} = require("./polygonV4NativeGasBalanceAcquisitionEvidence");

function requireObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(label + " must be an object");
  }

  return value;
}

function requireUnauthorized(value, label) {
  for (const flag of [
    "liveExecutionAuthorized",
    "signerAuthorized",
    "broadcastAuthorized"
  ]) {
    if (value[flag] !== false) {
      throw new Error(label + " must remain unauthorized: " + flag);
    }
  }
}

async function buildPreSignerSafetyCompositionEvidence({
  currentTransactionPreSendSimulationAcquisitionCompositionEvidence,
  provider
} = {}) {
  const composition = requireObject(
    currentTransactionPreSendSimulationAcquisitionCompositionEvidence,
    "Pre-send simulation composition"
  );

  if (
    composition.currentTransactionPreSendSimulationAcquisitionCompositionReady
      !== true
  ) {
    throw new Error("Pre-send simulation composition must be ready");
  }

  const simulation = requireObject(
    composition.currentTransactionPreSendSimulationEvidence,
    "Pre-send simulation evidence"
  );

  if (simulation.currentTransactionPreSendSimulationReady !== true) {
    throw new Error("Pre-send simulation must be ready");
  }

  requireUnauthorized(simulation, "Pre-send simulation");

  const finalTransactionEconomicsEvidence =
    validateFinalTransactionEconomicsEvidence({
      preSendSimulationEvidence: simulation
    });

  requireUnauthorized(
    finalTransactionEconomicsEvidence,
    "Final transaction economics"
  );

  if (
    finalTransactionEconomicsEvidence.preSendSimulationEvidence !==
    simulation
  ) {
    throw new Error("Final economics simulation identity mismatch");
  }

  if (
    finalTransactionEconomicsEvidence.transactionEnvelope !==
    simulation.transactionEnvelope
  ) {
    throw new Error("Final economics envelope identity mismatch");
  }

  const nativeGasBalanceAcquisitionEvidence =
    await acquireNativeGasBalanceEvidence({
      finalTransactionEconomicsEvidence,
      provider
    });

  if (
    nativeGasBalanceAcquisitionEvidence.nativeGasBalanceAcquisitionReady !==
    true
  ) {
    throw new Error("Native gas balance acquisition must be ready");
  }

  requireUnauthorized(
    nativeGasBalanceAcquisitionEvidence,
    "Native balance acquisition"
  );

  if (
    nativeGasBalanceAcquisitionEvidence.finalTransactionEconomicsEvidence !==
    finalTransactionEconomicsEvidence
  ) {
    throw new Error("Native balance economics identity mismatch");
  }

  const affordability = requireObject(
    nativeGasBalanceAcquisitionEvidence.nativeGasAffordabilityEvidence,
    "Native gas affordability evidence"
  );

  if (affordability.nativeGasAffordabilityReady !== true) {
    throw new Error("Native gas affordability must be ready");
  }

  requireUnauthorized(affordability, "Native gas affordability");

  if (
    affordability.finalTransactionEconomicsEvidence !==
      finalTransactionEconomicsEvidence ||
    affordability.transactionEnvelope !==
      simulation.transactionEnvelope
  ) {
    throw new Error("Native affordability identity mismatch");
  }

  return Object.freeze({
    currentTransactionPreSendSimulationAcquisitionCompositionEvidence:
      composition,
    currentTransactionPreSendSimulationEvidence: simulation,
    finalTransactionEconomicsEvidence,
    nativeGasBalanceAcquisitionEvidence,
    nativeGasAffordabilityEvidence: affordability,
    transactionEnvelope: simulation.transactionEnvelope,
    preSignerSafetyCompositionReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  });
}

module.exports = {
  buildPreSignerSafetyCompositionEvidence
};
