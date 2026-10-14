"use strict";

const { ethers } = require("ethers");

const {
  buildSignerAuthorizationCompositionEvidence
} = require("./polygonV4SignerAuthorizationCompositionEvidence");

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

function requireReady(value, field, label) {
  if (value[field] !== true) {
    throw new Error(`${label} must be ready`);
  }
}

function requireUnauthorized(value, label) {
  for (const flag of [
    "liveExecutionAuthorized",
    "signerAuthorized",
    "broadcastAuthorized"
  ]) {
    if (value[flag] !== false) {
      throw new Error(`${label} must remain unauthorized: ${flag}`);
    }
  }
}

function requireSame(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} identity mismatch`);
  }
}

function validateGate(gate) {
  requireReady(
    gate,
    "preAuthorizationSafetyGateCompositionReady",
    "Pre-authorization safety gate"
  );
  requireUnauthorized(gate, "Pre-authorization safety gate");

  const simulationComposition = requireObject(
    gate.currentTransactionPreSendSimulationAcquisitionCompositionEvidence,
    "Simulation composition"
  );
  requireReady(
    simulationComposition,
    "currentTransactionPreSendSimulationAcquisitionCompositionReady",
    "Simulation composition"
  );

  const simulation = requireObject(
    simulationComposition.currentTransactionPreSendSimulationEvidence,
    "Simulation evidence"
  );
  requireReady(
    simulation,
    "currentTransactionPreSendSimulationReady",
    "Simulation evidence"
  );
  requireUnauthorized(simulation, "Simulation evidence");

  const envelope = requireObject(
    simulation.transactionEnvelope,
    "Transaction envelope"
  );
  requireSame(
    gate.transactionEnvelope,
    envelope,
    "Gate transaction envelope"
  );

  const safety = requireObject(
    gate.preSignerSafetyCompositionEvidence,
    "Pre-signer safety composition"
  );
  requireReady(
    safety,
    "preSignerSafetyCompositionReady",
    "Pre-signer safety composition"
  );
  requireUnauthorized(safety, "Pre-signer safety composition");

  requireSame(
    safety.currentTransactionPreSendSimulationAcquisitionCompositionEvidence,
    simulationComposition,
    "Safety simulation composition"
  );
  requireSame(
    safety.currentTransactionPreSendSimulationEvidence,
    simulation,
    "Safety simulation evidence"
  );
  requireSame(
    safety.transactionEnvelope,
    envelope,
    "Safety transaction envelope"
  );

  const economics = requireObject(
    safety.finalTransactionEconomicsEvidence,
    "Final transaction economics evidence"
  );
  requireUnauthorized(economics, "Final transaction economics");
  requireSame(
    economics.preSendSimulationEvidence,
    simulation,
    "Economics simulation evidence"
  );
  requireSame(
    economics.transactionEnvelope,
    envelope,
    "Economics transaction envelope"
  );

  const balance = requireObject(
    safety.nativeGasBalanceAcquisitionEvidence,
    "Native gas balance acquisition evidence"
  );
  requireReady(
    balance,
    "nativeGasBalanceAcquisitionReady",
    "Native gas balance acquisition"
  );
  requireUnauthorized(balance, "Native gas balance acquisition");
  requireSame(
    balance.finalTransactionEconomicsEvidence,
    economics,
    "Balance economics evidence"
  );

  const affordability = requireObject(
    safety.nativeGasAffordabilityEvidence,
    "Native gas affordability evidence"
  );
  requireReady(
    affordability,
    "nativeGasAffordabilityReady",
    "Native gas affordability"
  );
  requireUnauthorized(affordability, "Native gas affordability");
  requireSame(
    balance.nativeGasAffordabilityEvidence,
    affordability,
    "Balance affordability evidence"
  );
  requireSame(
    affordability.finalTransactionEconomicsEvidence,
    economics,
    "Affordability economics evidence"
  );
  requireSame(
    affordability.transactionEnvelope,
    envelope,
    "Affordability transaction envelope"
  );

  const identityComposition = requireObject(
    gate.prospectiveSignerIdentityAcquisitionCompositionEvidence,
    "Prospective signer identity composition"
  );
  requireReady(
    identityComposition,
    "prospectiveSignerIdentityAcquisitionCompositionReady",
    "Prospective signer identity composition"
  );
  requireSame(
    identityComposition.currentTransactionPreSendSimulationAcquisitionCompositionEvidence,
    simulationComposition,
    "Signer identity simulation composition"
  );

  const identity = requireObject(
    identityComposition.prospectiveSignerIdentityEvidence,
    "Prospective signer identity evidence"
  );
  requireReady(
    identity,
    "prospectiveSignerIdentityReady",
    "Prospective signer identity"
  );
  requireUnauthorized(identity, "Prospective signer identity");

  requireSame(
    gate.prospectiveSignerIdentityEvidence,
    identity,
    "Gate signer identity evidence"
  );
  requireSame(
    identity.currentTransactionPreSendSimulationEvidence,
    simulation,
    "Signer identity simulation evidence"
  );
  requireSame(
    identity.transactionEnvelope,
    envelope,
    "Signer identity transaction envelope"
  );

  if (
    ethers.utils.getAddress(identity.signerAddress) !==
    ethers.utils.getAddress(envelope.from)
  ) {
    throw new Error("Signer address does not match envelope from");
  }

  return { identityComposition, identity, envelope };
}

async function buildSafetyGatedSignerAuthorizationCompositionEvidence({
  preAuthorizationSafetyGateCompositionEvidence,
  authorizeSignerIdentity
} = {}) {
  const gate = requireObject(
    preAuthorizationSafetyGateCompositionEvidence,
    "Pre-authorization safety gate evidence"
  );

  const { identityComposition, identity, envelope } =
    validateGate(gate);

  if (typeof authorizeSignerIdentity !== "function") {
    throw new TypeError("authorizeSignerIdentity must be a function");
  }

  /*
   * The callback is guarded again at invocation time.
   * This does not establish freshness of external RPC state.
   */
  const guardedAuthorization = async ({
    signerAddress,
    transactionEnvelope
  }) => {
    const checked = validateGate(gate);

    requireSame(
      checked.identityComposition,
      identityComposition,
      "Authorization signer composition"
    );
    requireSame(
      checked.identity,
      identity,
      "Authorization signer evidence"
    );
    requireSame(
      checked.envelope,
      envelope,
      "Authorization transaction envelope"
    );
    requireSame(
      transactionEnvelope,
      envelope,
      "Authorization callback envelope"
    );

    if (
      ethers.utils.getAddress(signerAddress) !==
      ethers.utils.getAddress(identity.signerAddress)
    ) {
      throw new Error("Authorization callback signer mismatch");
    }

    return authorizeSignerIdentity({
      signerAddress,
      transactionEnvelope
    });
  };

  const signerAuthorizationCompositionEvidence =
    await buildSignerAuthorizationCompositionEvidence({
      prospectiveSignerIdentityAcquisitionCompositionEvidence:
        identityComposition,
      authorizeSignerIdentity: guardedAuthorization
    });

  requireReady(
    signerAuthorizationCompositionEvidence,
    "signerAuthorizationCompositionReady",
    "Signer authorization composition"
  );

  const authorization = requireObject(
    signerAuthorizationCompositionEvidence.signerAuthorizationEvidence,
    "Signer authorization evidence"
  );

  requireSame(
    authorization.prospectiveSignerIdentityEvidence,
    identity,
    "Authorized signer identity"
  );
  requireSame(
    authorization.transactionEnvelope,
    envelope,
    "Authorized transaction envelope"
  );

  if (
    authorization.signerAuthorizationReady !== true ||
    authorization.signerAuthorized !== true ||
    authorization.liveExecutionAuthorized !== false ||
    authorization.broadcastAuthorized !== false
  ) {
    throw new Error("Signer authorization state mismatch");
  }

  return Object.freeze({
    preAuthorizationSafetyGateCompositionEvidence: gate,
    signerAuthorizationCompositionEvidence,
    signerAuthorizationEvidence: authorization,
    transactionEnvelope: envelope,
    safetyGatedSignerAuthorizationCompositionReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: true,
    broadcastAuthorized: false
  });
}

module.exports = {
  buildSafetyGatedSignerAuthorizationCompositionEvidence,
  validateGate
};
