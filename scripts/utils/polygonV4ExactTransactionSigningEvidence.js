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

function requireCapabilityBindingState(evidence) {
  if (
    evidence.signerCapabilityBindingReady !== true
  ) {
    throw new Error(
      "signer capability binding evidence must be ready"
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

function requireNoUpstreamSigningEvidence(evidence) {
  for (const field of [
    "transactionSigningReady",
    "signedRawTransaction",
    "signedTransactionHash",
    "signableTransaction"
  ]) {
    if (
      Object.prototype.hasOwnProperty.call(
        evidence,
        field
      )
    ) {
      throw new Error(
        `upstream signer capability binding evidence must not contain ${field}`
      );
    }
  }
}

function requireEqualBigNumber(
  actual,
  expected,
  label
) {
  if (
    !actual ||
    !ethers.BigNumber.isBigNumber(actual) ||
    !ethers.BigNumber.isBigNumber(expected) ||
    !actual.eq(expected)
  ) {
    throw new Error(
      `signed transaction ${label} does not match authorized transaction envelope`
    );
  }
}

async function acquireExactTransactionSigningEvidence({
  signerCapabilityBindingEvidence,
  signTransaction
}) {
  const evidence = requireObject(
    signerCapabilityBindingEvidence,
    "signerCapabilityBindingEvidence"
  );

  requireCapabilityBindingState(evidence);
  requireNoUpstreamSigningEvidence(evidence);

  const transactionEnvelope = requireObject(
    evidence.transactionEnvelope,
    "transactionEnvelope"
  );

  const signerAddress = ethers.utils.getAddress(
    evidence.signerAddress
  );

  const signerCapabilityAddress =
    ethers.utils.getAddress(
      evidence.signerCapabilityAddress
    );

  const envelopeFrom = ethers.utils.getAddress(
    transactionEnvelope.from
  );

  if (
    signerAddress !== envelopeFrom ||
    signerCapabilityAddress !== signerAddress
  ) {
    throw new Error(
      "signer capability identity does not match authorized transaction envelope"
    );
  }

  const sign = requireFunction(
    signTransaction,
    "signTransaction"
  );

  /*
   * The preserved 1S.33 transaction envelope deliberately
   * does not own transaction type.
   *
   * 1S.39 derives the exact EIP-1559 signing projection by
   * preserving all nine authorized envelope fields and adding
   * only type 2.
   */
  const signableTransaction =
    Object.freeze({
      type: 2,
      from: transactionEnvelope.from,
      to: transactionEnvelope.to,
      data: transactionEnvelope.data,
      value: transactionEnvelope.value,
      chainId: transactionEnvelope.chainId,
      nonce: transactionEnvelope.nonce,
      maxFeePerGas:
        transactionEnvelope.maxFeePerGas,
      maxPriorityFeePerGas:
        transactionEnvelope.maxPriorityFeePerGas,
      gasLimit: transactionEnvelope.gasLimit
    });

  const signedRawTransaction =
    await sign(signableTransaction);

  if (
    typeof signedRawTransaction !== "string" ||
    !ethers.utils.isHexString(signedRawTransaction) ||
    ethers.utils.hexDataLength(signedRawTransaction) === 0
  ) {
    throw new TypeError(
      "signTransaction must return a raw signed transaction hex string"
    );
  }

  const parsed =
    ethers.utils.parseTransaction(
      signedRawTransaction
    );

  if (parsed.type !== 2) {
    throw new Error(
      "signed transaction type does not match required EIP-1559 type 2"
    );
  }

  if (
    parsed.chainId !== transactionEnvelope.chainId
  ) {
    throw new Error(
      "signed transaction chainId does not match authorized transaction envelope"
    );
  }

  if (
    parsed.nonce !== transactionEnvelope.nonce
  ) {
    throw new Error(
      "signed transaction nonce does not match authorized transaction envelope"
    );
  }

  const parsedFrom = ethers.utils.getAddress(
    parsed.from
  );

  if (parsedFrom !== signerAddress) {
    throw new Error(
      "signed transaction recovered signer does not match authorized signer"
    );
  }

  const parsedTo = ethers.utils.getAddress(
    parsed.to
  );

  const envelopeTo = ethers.utils.getAddress(
    transactionEnvelope.to
  );

  if (parsedTo !== envelopeTo) {
    throw new Error(
      "signed transaction recipient does not match authorized transaction envelope"
    );
  }

  if (
    parsed.data !== transactionEnvelope.data
  ) {
    throw new Error(
      "signed transaction data does not match authorized transaction envelope"
    );
  }

  requireEqualBigNumber(
    parsed.value,
    transactionEnvelope.value,
    "value"
  );

  requireEqualBigNumber(
    parsed.gasLimit,
    transactionEnvelope.gasLimit,
    "gasLimit"
  );

  requireEqualBigNumber(
    parsed.maxFeePerGas,
    transactionEnvelope.maxFeePerGas,
    "maxFeePerGas"
  );

  requireEqualBigNumber(
    parsed.maxPriorityFeePerGas,
    transactionEnvelope.maxPriorityFeePerGas,
    "maxPriorityFeePerGas"
  );

  if (!Array.isArray(parsed.accessList) || parsed.accessList.length !== 0) {
    throw new Error("signed transaction accessList must be exactly empty");
  }

  const signedTransactionHash =
    ethers.utils.keccak256(
      signedRawTransaction
    );

  if (parsed.hash !== signedTransactionHash) {
    throw new Error("signed transaction hash does not match raw transaction bytes");
  }

  return Object.freeze({
    signerCapabilityBindingEvidence: evidence,

    transactionEnvelope,
    signableTransaction,

    signerAddress,
    signerCapabilityAddress,

    signedRawTransaction,
    signedTransactionHash,

    transactionSigningReady: true,

    signerAuthorized: true,
    signingAuthorized: true,

    liveExecutionAuthorized: false,
    broadcastAuthorized: false
  });
}

module.exports = {
  acquireExactTransactionSigningEvidence
};
