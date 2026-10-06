"use strict";

const { ethers } = require("ethers");

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

function requireFunction(value, label) {
  if (typeof value !== "function") {
    throw new TypeError(`${label} must be a function`);
  }

  return value;
}

function requireSigningAuthorizationState(evidence) {
  if (evidence.signingAuthorizationReady !== true) {
    throw new Error(
      "signing authorization evidence must be ready"
    );
  }

  if (
    evidence.signerAuthorized !== true ||
    evidence.signingAuthorized !== true
  ) {
    throw new Error(
      "signer and signing authorization must remain true"
    );
  }

  if (
    evidence.liveExecutionAuthorized !== false ||
    evidence.broadcastAuthorized !== false
  ) {
    throw new Error(
      "execution and broadcast authorization must remain false"
    );
  }
}

function requireNoUpstreamCapabilityBinding(evidence) {
  if (
    Object.prototype.hasOwnProperty.call(
      evidence,
      "signerCapabilityBindingReady"
    )
  ) {
    throw new Error(
      "upstream signing authorization evidence must not contain signer capability binding readiness field"
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      evidence,
      "signerCapabilityAddress"
    )
  ) {
    throw new Error(
      "upstream signing authorization evidence must not contain signer capability address field"
    );
  }
}

async function acquireSignerCapabilityBindingEvidence({
  signingAuthorizationEvidence,
  getSignerCapabilityAddress
}) {
  const evidence = requireObject(
    signingAuthorizationEvidence,
    "signingAuthorizationEvidence"
  );

  requireSigningAuthorizationState(evidence);
  requireNoUpstreamCapabilityBinding(evidence);

  const transactionEnvelope = requireObject(
    evidence.transactionEnvelope,
    "transactionEnvelope"
  );

  const signerAddress = ethers.utils.getAddress(
    evidence.signerAddress
  );

  const envelopeFrom = ethers.utils.getAddress(
    transactionEnvelope.from
  );

  if (signerAddress !== envelopeFrom) {
    throw new Error(
      "authorized signer address does not match transaction envelope from"
    );
  }

  const acquireCapabilityAddress = requireFunction(
    getSignerCapabilityAddress,
    "getSignerCapabilityAddress"
  );

  const signerCapabilityAddress =
    ethers.utils.getAddress(
      await acquireCapabilityAddress()
    );

  if (signerCapabilityAddress !== signerAddress) {
    throw new Error(
      "signer capability address does not match authorized signer address"
    );
  }

  return Object.freeze({
    signingAuthorizationEvidence: evidence,
    transactionEnvelope,
    signerAddress,
    signerCapabilityAddress,
    signerCapabilityBindingReady: true,
    signerAuthorized: true,
    signingAuthorized: true,
    liveExecutionAuthorized: false,
    broadcastAuthorized: false
  });
}

module.exports = {
  acquireSignerCapabilityBindingEvidence
};
