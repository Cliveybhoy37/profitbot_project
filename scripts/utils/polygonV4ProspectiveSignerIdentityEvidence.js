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

function requireFalseAuthorizationFlags(evidence) {
  if (
    evidence.liveExecutionAuthorized !== false ||
    evidence.signerAuthorized !== false ||
    evidence.broadcastAuthorized !== false
  ) {
    throw new Error(
      "pre-send simulation evidence authorization flags must remain false"
    );
  }
}

async function acquireProspectiveSignerIdentityEvidence({
  preSendSimulationEvidence,
  getSignerAddress
}) {
  const evidence = requireObject(
    preSendSimulationEvidence,
    "preSendSimulationEvidence"
  );

  if (
    evidence.currentTransactionPreSendSimulationReady !== true
  ) {
    throw new Error(
      "pre-send simulation evidence must be ready"
    );
  }

  requireFalseAuthorizationFlags(evidence);

  const transactionEnvelope = requireObject(
    evidence.transactionEnvelope,
    "transactionEnvelope"
  );

  const expectedFrom = ethers.utils.getAddress(
    transactionEnvelope.from
  );

  const acquireAddress = requireFunction(
    getSignerAddress,
    "getSignerAddress"
  );

  const signerAddress = ethers.utils.getAddress(
    await acquireAddress()
  );

  if (signerAddress !== expectedFrom) {
    throw new Error(
      "prospective signer address does not match transaction envelope from"
    );
  }

  return Object.freeze({
    currentTransactionPreSendSimulationEvidence: evidence,
    transactionEnvelope,
    signerAddress,
    prospectiveSignerIdentityReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  });
}

module.exports = {
  acquireProspectiveSignerIdentityEvidence
};
