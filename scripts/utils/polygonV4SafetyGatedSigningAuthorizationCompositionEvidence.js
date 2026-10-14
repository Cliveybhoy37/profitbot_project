"use strict";

const { ethers } = require("ethers");

const {
  buildSigningAuthorizationCompositionEvidence
} = require("./polygonV4SigningAuthorizationCompositionEvidence");

const {
  validateGate
} = require("./polygonV4SafetyGatedSignerAuthorizationCompositionEvidence");

function requireObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new TypeError(`${label} must be an object`);
  }
  return value;
}

function requireReady(value, field, label) {
  if (value[field] !== true) {
    throw new Error(`${label} must be ready`);
  }
}

function requireSame(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} identity mismatch`);
  }
}

function requireAuthorizationState(value, label) {
  if (
    value.signerAuthorized !== true ||
    value.liveExecutionAuthorized !== false ||
    value.broadcastAuthorized !== false
  ) {
    throw new Error(`${label} authorization state invalid`);
  }
}

function validateSafetyGatedSignerAuthorization(composition) {
  const gated = requireObject(
    composition,
    "Safety-gated signer authorization composition"
  );

  requireReady(
    gated,
    "safetyGatedSignerAuthorizationCompositionReady",
    "Safety-gated signer authorization composition"
  );
  requireAuthorizationState(gated, "Safety-gated signer authorization");

  const gate = requireObject(
    gated.preAuthorizationSafetyGateCompositionEvidence,
    "Pre-authorization safety gate"
  );
  // Reuse the complete upstream simulation, economics,
  // affordability, and signer-identity evidence validator.
  validateGate(gate);

  for (const flag of [
    "signerAuthorized",
    "broadcastAuthorized",
    "liveExecutionAuthorized"
  ]) {
    if (gate[flag] !== false) {
      throw new Error(`Pre-authorization safety gate ${flag} must be false`);
    }
  }

  const signerComposition = requireObject(
    gated.signerAuthorizationCompositionEvidence,
    "Signer authorization composition"
  );
  requireReady(
    signerComposition,
    "signerAuthorizationCompositionReady",
    "Signer authorization composition"
  );

  const signerEvidence = requireObject(
    signerComposition.signerAuthorizationEvidence,
    "Signer authorization evidence"
  );
  requireReady(
    signerEvidence,
    "signerAuthorizationReady",
    "Signer authorization evidence"
  );
  requireAuthorizationState(signerEvidence, "Signer authorization evidence");

  const envelope = requireObject(
    gate.transactionEnvelope,
    "Gate transaction envelope"
  );

  requireSame(
    gated.transactionEnvelope,
    envelope,
    "Gated transaction envelope"
  );
  requireSame(
    gated.signerAuthorizationEvidence,
    signerEvidence,
    "Gated signer authorization evidence"
  );
  requireSame(
    signerEvidence.transactionEnvelope,
    envelope,
    "Authorized transaction envelope"
  );
  requireSame(
    signerComposition.prospectiveSignerIdentityAcquisitionCompositionEvidence,
    gate.prospectiveSignerIdentityAcquisitionCompositionEvidence,
    "Signer identity composition"
  );
  requireSame(
    signerEvidence.prospectiveSignerIdentityEvidence,
    gate.prospectiveSignerIdentityEvidence,
    "Prospective signer identity evidence"
  );

  const identity = requireObject(
    gate.prospectiveSignerIdentityEvidence,
    "Prospective signer identity evidence"
  );

  if (
    ethers.utils.getAddress(identity.signerAddress) !==
    ethers.utils.getAddress(signerEvidence.signerAddress) ||
    ethers.utils.getAddress(identity.signerAddress) !==
    ethers.utils.getAddress(envelope.from)
  ) {
    throw new Error("Signer identity does not match transaction envelope");
  }

  return { gated, gate, signerComposition, signerEvidence, envelope };
}

async function buildSafetyGatedSigningAuthorizationCompositionEvidence({
  safetyGatedSignerAuthorizationCompositionEvidence,
  authorizeTransactionSigning
} = {}) {
  const validated = validateSafetyGatedSignerAuthorization(
    safetyGatedSignerAuthorizationCompositionEvidence
  );

  if (typeof authorizeTransactionSigning !== "function") {
    throw new TypeError("authorizeTransactionSigning must be a function");
  }

  const guardedAuthorization = async (request) => {
    const current = validateSafetyGatedSignerAuthorization(
      safetyGatedSignerAuthorizationCompositionEvidence
    );

    requireSame(
      current.signerComposition,
      validated.signerComposition,
      "Signer composition at authorization"
    );
    requireSame(
      current.signerEvidence,
      validated.signerEvidence,
      "Signer evidence at authorization"
    );
    requireSame(
      current.envelope,
      validated.envelope,
      "Transaction envelope at authorization"
    );
    requireSame(
      request.transactionEnvelope,
      validated.envelope,
      "Signing authorization request envelope"
    );

    return authorizeTransactionSigning(request);
  };

  const signingAuthorizationCompositionEvidence =
    await buildSigningAuthorizationCompositionEvidence({
      signerAuthorizationCompositionEvidence:
        validated.signerComposition,
      authorizeTransactionSigning: guardedAuthorization
    });

  requireSame(
    signingAuthorizationCompositionEvidence.signerAuthorizationCompositionEvidence,
    validated.signerComposition,
    "Signing authorization signer composition"
  );

  return Object.freeze({
    safetyGatedSignerAuthorizationCompositionEvidence: validated.gated,
    preAuthorizationSafetyGateCompositionEvidence: validated.gate,
    signerAuthorizationCompositionEvidence: validated.signerComposition,
    signingAuthorizationCompositionEvidence,
    signingAuthorizationEvidence:
      signingAuthorizationCompositionEvidence.signingAuthorizationEvidence,
    transactionEnvelope: validated.envelope,
    safetyGatedSigningAuthorizationCompositionReady: true,
    signerAuthorized: true,
    signingAuthorized: true,
    broadcastAuthorized: false,
    liveExecutionAuthorized: false
  });
}

module.exports = {
  buildSafetyGatedSigningAuthorizationCompositionEvidence
};
