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

function requireControlledBroadcastAuthorization(
  evidence
) {
  if (
    evidence.controlledBroadcastAuthorizationReady !==
    true
  ) {
    throw new Error(
      "controlled broadcast authorization evidence must be ready"
    );
  }

  if (
    evidence.signerAuthorized !== true ||
    evidence.signingAuthorized !== true ||
    evidence.broadcastAuthorized !== true
  ) {
    throw new Error(
      "signer, signing, and broadcast authorization must remain true"
    );
  }

  if (evidence.liveExecutionAuthorized !== false) {
    throw new Error(
      "live execution authorization must remain false"
    );
  }
}

function requireFinalCurrentStateLineage(
  evidence
) {
  const finalEvidence =
    requireObject(
      evidence.finalSignedTransactionCurrentStateEvidence,
      "final signed transaction current-state evidence"
    );

  const transactionEnvelope =
    requireObject(
      evidence.transactionEnvelope,
      "transactionEnvelope"
    );

  if (
    finalEvidence.transactionEnvelope !==
    transactionEnvelope
  ) {
    throw new Error(
      "transaction envelope identity mismatch with final signed transaction current-state evidence"
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
    finalEvidence.signedRawTransaction !==
    signedRawTransaction
  ) {
    throw new Error(
      "signed raw transaction mismatch with final signed transaction current-state evidence"
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
    finalEvidence.signedTransactionHash !==
    signedTransactionHash
  ) {
    throw new Error(
      "signed transaction hash mismatch with final signed transaction current-state evidence"
    );
  }

  return {
    finalEvidence,
    transactionEnvelope,
    signedRawTransaction,
    signedTransactionHash
  };
}

async function acquireControlledLiveExecutionAuthorizationEvidence({
  controlledBroadcastAuthorizationEvidence,
  authorizeControlledLiveExecution
} = {}) {
  const evidence =
    requireObject(
      controlledBroadcastAuthorizationEvidence,
      "controlledBroadcastAuthorizationEvidence"
    );

  requireControlledBroadcastAuthorization(
    evidence
  );

  const {
    finalEvidence,
    transactionEnvelope,
    signedRawTransaction,
    signedTransactionHash
  } = requireFinalCurrentStateLineage(
    evidence
  );

  const authorize =
    requireFunction(
      authorizeControlledLiveExecution,
      "authorizeControlledLiveExecution"
    );

  const authorizationResult =
    await authorize({
      transactionEnvelope,
      signedTransactionHash
    });

  if (authorizationResult !== true) {
    throw new Error(
      "controlled live execution authorization must return exactly true"
    );
  }

  return Object.freeze({
    controlledBroadcastAuthorizationEvidence:
      evidence,

    finalSignedTransactionCurrentStateEvidence:
      finalEvidence,

    transactionEnvelope,

    signedRawTransaction,
    signedTransactionHash,

    controlledLiveExecutionAuthorizationReady:
      true,

    signerAuthorized: true,
    signingAuthorized: true,

    liveExecutionAuthorized: true,
    broadcastAuthorized: true
  });
}

module.exports = {
  acquireControlledLiveExecutionAuthorizationEvidence
};
