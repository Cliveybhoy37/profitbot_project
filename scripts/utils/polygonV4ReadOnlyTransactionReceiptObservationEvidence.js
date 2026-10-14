"use strict";

const { ethers } = require("ethers");

const POLYGON_CHAIN_ID = 137;

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

function requireMethod(provider, method) {
  if (typeof provider[method] !== "function") {
    throw new Error(`Provider ${method} required`);
  }
}

function requireHash(value, label) {
  if (
    typeof value !== "string" ||
    !ethers.utils.isHexString(value, 32)
  ) {
    throw new Error(`${label} must be a bytes32 hash`);
  }

  return value;
}

function requirePositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive safe integer`);
  }

  return value;
}

async function observeReadOnlyTransactionReceiptEvidence({
  provider,
  signedTransactionHash,
  minimumConfirmations
} = {}) {
  requirePositiveInteger(
    minimumConfirmations,
    "Minimum confirmations"
  );

  const transactionHash = requireHash(
    signedTransactionHash,
    "Signed transaction hash"
  );

  requireObject(provider, "Provider");

  for (const method of [
    "getNetwork",
    "getTransactionReceipt",
    "getBlock",
    "getBlockNumber"
  ]) {
    requireMethod(provider, method);
  }

  const network = requireObject(
    await provider.getNetwork(),
    "Provider network"
  );

  if (network.chainId !== POLYGON_CHAIN_ID) {
    throw new Error("Polygon chain ID 137 required");
  }

  const receipt = requireObject(
    await provider.getTransactionReceipt(transactionHash),
    "Transaction receipt"
  );

  const receiptHash = requireHash(
    receipt.transactionHash,
    "Receipt transaction hash"
  );

  if (receiptHash.toLowerCase() !== transactionHash.toLowerCase()) {
    throw new Error("Receipt transaction hash mismatch");
  }

  if (receipt.status !== 1) {
    throw new Error("Successful receipt status required");
  }

  const receiptBlockNumber = requirePositiveInteger(
    receipt.blockNumber,
    "Receipt block number"
  );

  const receiptBlockHash = requireHash(
    receipt.blockHash,
    "Receipt block hash"
  );

  if (
    !ethers.BigNumber.isBigNumber(receipt.gasUsed) ||
    !receipt.gasUsed.gt(0)
  ) {
    throw new Error("Positive BigNumber gasUsed required");
  }

  const block = requireObject(
    await provider.getBlock(receiptBlockNumber),
    "Canonical block"
  );

  if (block.number !== receiptBlockNumber) {
    throw new Error("Canonical block number mismatch");
  }

  const canonicalBlockHash = requireHash(
    block.hash,
    "Canonical block hash"
  );

  if (canonicalBlockHash !== receiptBlockHash) {
    throw new Error("Canonical block hash mismatch");
  }

  const observedHead = requirePositiveInteger(
    await provider.getBlockNumber(),
    "Observed chain head"
  );

  if (observedHead < receiptBlockNumber) {
    throw new Error("Observed head precedes receipt block");
  }

  const confirmations =
    observedHead - receiptBlockNumber + 1;

  if (!Number.isSafeInteger(confirmations) || confirmations <= 0) {
    throw new Error("Unsafe confirmation count");
  }

  if (confirmations < minimumConfirmations) {
    throw new Error("Insufficient confirmation depth");
  }

  return Object.freeze({
    signedTransactionHash: transactionHash,
    receipt,
    gasUsed: receipt.gasUsed,
    receiptBlockNumber,
    receiptBlockHash,
    observedHead,
    confirmations,
    minimumConfirmations,
    chainId: POLYGON_CHAIN_ID,
    readOnlyTransactionReceiptObservationReady: true
  });
}

module.exports = {
  observeReadOnlyTransactionReceiptEvidence
};
