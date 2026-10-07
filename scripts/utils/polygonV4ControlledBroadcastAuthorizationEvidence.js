"use strict";

function requireObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new TypeError(
      `${label} must be an object`
    );
  }

  return value;
}

function requireFunction(value, label) {
  if (typeof value !== "function") {
    throw new TypeError(
      `${label} must be a function`
    );
  }

  return value;
}

function requireFinalCurrentStateValidation(
  evidence
) {
  if (
    evidence
      .finalSignedTransactionCurrentStateReady !==
    true
  ) {
    throw new Error(
      "final signed transaction current-state evidence must be ready"
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

function requireTransactionSigningLineage(
  evidence
) {
  const signingEvidence =
    requireObject(
      evidence.transactionSigningEvidence,
      "transaction signing evidence"
    );

  if (
    signingEvidence.transactionSigningReady !==
    true
  ) {
    throw new Error(
      "transaction signing evidence must be ready"
    );
  }

  if (
    signingEvidence.signerAuthorized !== true ||
    signingEvidence.signingAuthorized !== true ||
    signingEvidence.liveExecutionAuthorized !==
      false ||
    signingEvidence.broadcastAuthorized !== false
  ) {
    throw new Error(
      "transaction signing authorization state invalid"
    );
  }

  return signingEvidence;
}

async function acquireControlledBroadcastAuthorizationEvidence({
  finalSignedTransactionCurrentStateEvidence,
  authorizeControlledBroadcast
} = {}) {
  const evidence = requireObject(
    finalSignedTransactionCurrentStateEvidence,
    "finalSignedTransactionCurrentStateEvidence"
  );

  requireFinalCurrentStateValidation(
    evidence
  );

  const signingEvidence =
    requireTransactionSigningLineage(
      evidence
    );

  const transactionEnvelope =
    requireObject(
      evidence.transactionEnvelope,
      "transactionEnvelope"
    );

  if (
    signingEvidence.transactionEnvelope !==
    transactionEnvelope
  ) {
    throw new Error(
      "transaction envelope identity mismatch with transaction signing evidence"
    );
  }

  const signedRawTransaction =
    evidence.signedRawTransaction;

  if (
    typeof signedRawTransaction !== "string" ||
    signedRawTransaction.length === 0
  ) {
    throw new TypeError(
      "signedRawTransaction must be a non-empty string"
    );
  }

  if (
    signingEvidence.signedRawTransaction !==
    signedRawTransaction
  ) {
    throw new Error(
      "signed raw transaction mismatch with transaction signing evidence"
    );
  }

  const signedTransactionHash =
    evidence.signedTransactionHash;

  if (
    typeof signedTransactionHash !== "string" ||
    signedTransactionHash.length === 0
  ) {
    throw new TypeError(
      "signedTransactionHash must be a non-empty string"
    );
  }

  if (
    signingEvidence.signedTransactionHash !==
    signedTransactionHash
  ) {
    throw new Error(
      "signed transaction hash mismatch with transaction signing evidence"
    );
  }

  const authorize =
    requireFunction(
      authorizeControlledBroadcast,
      "authorizeControlledBroadcast"
    );

  const authorizationResult =
    await authorize({
      transactionEnvelope,
      signedTransactionHash
    });

  if (authorizationResult !== true) {
    throw new Error(
      "controlled broadcast authorization must return exactly true"
    );
  }

  return Object.freeze({
    finalSignedTransactionCurrentStateEvidence:
      evidence,

    transactionEnvelope,

    signedRawTransaction,
    signedTransactionHash,

    controlledBroadcastAuthorizationReady:
      true,

    signerAuthorized: true,
    signingAuthorized: true,

    liveExecutionAuthorized: false,
    broadcastAuthorized: true
  });
}

module.exports = {
  acquireControlledBroadcastAuthorizationEvidence
};
