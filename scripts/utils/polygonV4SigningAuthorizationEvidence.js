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

function requireSignerAuthorizationState(evidence) {
  if (evidence.signerAuthorizationReady !== true) {
    throw new Error(
      "signer authorization evidence must be ready"
    );
  }

  if (evidence.signerAuthorized !== true) {
    throw new Error(
      "signer authorization evidence must be authorized"
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

function requireNoUpstreamSigningAuthorization(evidence) {
  if (
    Object.prototype.hasOwnProperty.call(
      evidence,
      "signingAuthorized"
    )
  ) {
    throw new Error(
      "upstream signer authorization evidence must not contain signing authorization field"
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      evidence,
      "signingAuthorizationReady"
    )
  ) {
    throw new Error(
      "upstream signer authorization evidence must not contain signing authorization readiness field"
    );
  }
}

async function acquireSigningAuthorizationEvidence({
  signerAuthorizationEvidence,
  authorizeTransactionSigning
}) {
  const evidence = requireObject(
    signerAuthorizationEvidence,
    "signerAuthorizationEvidence"
  );

  requireSignerAuthorizationState(evidence);
  requireNoUpstreamSigningAuthorization(evidence);

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

  const authorize = requireFunction(
    authorizeTransactionSigning,
    "authorizeTransactionSigning"
  );

  const authorizationResult = await authorize({
    signerAddress,
    transactionEnvelope
  });

  if (authorizationResult !== true) {
    throw new Error(
      "transaction signing authorization must return exactly true"
    );
  }

  return Object.freeze({
    signerAuthorizationEvidence: evidence,
    transactionEnvelope,
    signerAddress,
    signingAuthorizationReady: true,
    signerAuthorized: true,
    signingAuthorized: true,
    liveExecutionAuthorized: false,
    broadcastAuthorized: false
  });
}

module.exports = {
  acquireSigningAuthorizationEvidence
};
