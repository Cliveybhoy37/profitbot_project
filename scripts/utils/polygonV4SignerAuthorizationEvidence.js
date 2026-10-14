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

function requireUpstreamAuthorizationState(evidence) {
  if (
    evidence.liveExecutionAuthorized !== false ||
    evidence.signerAuthorized !== false ||
    evidence.broadcastAuthorized !== false
  ) {
    throw new Error(
      "prospective signer identity authorization flags must remain false"
    );
  }
}

async function acquireSignerAuthorizationEvidence({
  prospectiveSignerIdentityEvidence,
  authorizeSignerIdentity
}) {
  const evidence = requireObject(
    prospectiveSignerIdentityEvidence,
    "prospectiveSignerIdentityEvidence"
  );

  if (evidence.prospectiveSignerIdentityReady !== true) {
    throw new Error(
      "prospective signer identity evidence must be ready"
    );
  }

  requireUpstreamAuthorizationState(evidence);

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
      "prospective signer address does not match transaction envelope from"
    );
  }

  const authorize = requireFunction(
    authorizeSignerIdentity,
    "authorizeSignerIdentity"
  );

  const authorizationResult = await authorize({
    signerAddress,
    transactionEnvelope
  });

  if (authorizationResult !== true) {
    throw new Error(
      "prospective signer identity authorization must return exactly true"
    );
  }

  return Object.freeze({
    prospectiveSignerIdentityEvidence: evidence,
    transactionEnvelope,
    signerAddress,
    signerAuthorizationReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: true,
    broadcastAuthorized: false
  });
}

module.exports = {
  acquireSignerAuthorizationEvidence
};
