"use strict";

const { ethers } = require("ethers");

function requireObject(value, label) {
  if (
    !value ||
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

function requireControlledSubmissionEvidence(
  evidence
) {
  requireObject(
    evidence,
    "controlled exact signed transaction submission evidence"
  );

  if (
    evidence
      .controlledExactSignedTransactionSubmissionReady !==
    true
  ) {
    throw new Error(
      "controlled exact signed transaction submission evidence must be ready"
    );
  }

  for (const field of [
    "signerAuthorized",
    "signingAuthorized",
    "broadcastAuthorized",
    "liveExecutionAuthorized"
  ]) {
    if (evidence[field] !== true) {
      throw new Error(
        `controlled submission authorization required: ${field}`
      );
    }
  }

  return evidence;
}

async function produceControlledTransactionReceiptEvidence({
  controlledExactSignedTransactionSubmissionEvidence,
  acquireTransactionReceipt
}) {
  const evidence =
    requireControlledSubmissionEvidence(
      controlledExactSignedTransactionSubmissionEvidence
    );

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

  const submissionResponse =
    requireObject(
      evidence.submissionResponse,
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

  requireFunction(
    acquireTransactionReceipt,
    "acquireTransactionReceipt"
  );

  /*
   * Receipt observation is deliberately separated from
   * transaction submission.
   *
   * The acquisition capability receives only the already
   * established signed transaction hash. It receives no raw
   * transaction, signer, envelope mutation, nonce/fee/gas
   * controls, or submission capability.
   */
  const receipt =
    await acquireTransactionReceipt(
      signedTransactionHash
    );

  requireObject(
    receipt,
    "transaction receipt"
  );

  if (
    typeof receipt.transactionHash !== "string" ||
    receipt.transactionHash !==
      signedTransactionHash
  ) {
    throw new Error(
      "receipt transaction hash must match signedTransactionHash"
    );
  }

  if (receipt.status !== 1) {
    throw new Error(
      "successful transaction receipt status required"
    );
  }

  if (
    !Number.isSafeInteger(receipt.blockNumber) ||
    receipt.blockNumber <= 0
  ) {
    throw new Error(
      "positive safe receipt block number required"
    );
  }

  if (
    !ethers.BigNumber.isBigNumber(
      receipt.gasUsed
    ) ||
    receipt.gasUsed.lte(0)
  ) {
    throw new Error(
      "positive BigNumber receipt gasUsed required"
    );
  }

  return Object.freeze({
    controlledExactSignedTransactionSubmissionEvidence:
      evidence,

    transactionEnvelope:
      evidence.transactionEnvelope,

    signedRawTransaction:
      evidence.signedRawTransaction,

    signedTransactionHash,

    submissionResponse,

    receipt,

    gasUsed: receipt.gasUsed,

    controlledTransactionReceiptReady: true,

    signerAuthorized: true,
    signingAuthorized: true,
    broadcastAuthorized: true,
    liveExecutionAuthorized: true
  });
}

module.exports = {
  produceControlledTransactionReceiptEvidence
};
