"use strict";

function requireObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(`${label} object required`);
  }

  return value;
}

function requireFunction(value, label) {
  if (typeof value !== "function") {
    throw new Error(`${label} function required`);
  }

  return value;
}

function requireImmediatePreSubmissionValidation(evidence) {
  requireObject(
    evidence,
    "immediate pre-submission validation evidence"
  );

  if (
    evidence.immediatePreSubmissionValidationReady !==
    true
  ) {
    throw new Error(
      "immediate pre-submission validation must be ready"
    );
  }

  for (const flag of [
    "signerAuthorized",
    "signingAuthorized",
    "broadcastAuthorized",
    "liveExecutionAuthorized"
  ]) {
    if (evidence[flag] !== true) {
      throw new Error(`${flag} must be true`);
    }
  }

  return evidence;
}

async function submitControlledExactSignedTransaction({
  immediatePreSubmissionValidationEvidence,
  submitSignedTransaction
} = {}) {
  const evidence =
    requireImmediatePreSubmissionValidation(
      immediatePreSubmissionValidationEvidence
    );

  const transactionEnvelope =
    requireObject(
      evidence.transactionEnvelope,
      "transactionEnvelope"
    );

  const signedRawTransaction =
    evidence.signedRawTransaction;

  if (
    typeof signedRawTransaction !== "string" ||
    signedRawTransaction.length === 0
  ) {
    throw new Error(
      "signedRawTransaction must be a non-empty string"
    );
  }

  const signedTransactionHash =
    evidence.signedTransactionHash;

  if (
    typeof signedTransactionHash !== "string" ||
    signedTransactionHash.length === 0
  ) {
    throw new Error(
      "signedTransactionHash must be a non-empty string"
    );
  }

  requireFunction(
    submitSignedTransaction,
    "submitSignedTransaction"
  );

  /*
   * This is the single submission boundary.
   *
   * The capability receives only the exact signed raw bytes
   * already validated and authorized by 1S.43.
   *
   * No signer, envelope mutation, nonce repair, fee refresh,
   * transaction reconstruction, retry, or receipt waiting
   * occurs here.
   */
  const submissionResponse =
    await submitSignedTransaction(
      signedRawTransaction
    );

  requireObject(
    submissionResponse,
    "submission response"
  );

  if (
    typeof submissionResponse.hash !== "string" ||
    submissionResponse.hash.length === 0
  ) {
    throw new Error(
      "submission response hash required"
    );
  }

  if (
    submissionResponse.hash !==
    signedTransactionHash
  ) {
    throw new Error(
      "submission response hash must match signedTransactionHash"
    );
  }

  return Object.freeze({
    immediatePreSubmissionValidationEvidence:
      evidence,

    transactionEnvelope,

    signedRawTransaction,
    signedTransactionHash,

    submissionResponse,

    controlledExactSignedTransactionSubmissionReady:
      true,

    signerAuthorized: true,
    signingAuthorized: true,
    broadcastAuthorized: true,
    liveExecutionAuthorized: true
  });
}

module.exports = {
  submitControlledExactSignedTransaction
};
