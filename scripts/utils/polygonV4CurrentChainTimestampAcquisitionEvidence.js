"use strict";

function requireObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(`${label} required`);
  }

  return value;
}

function requireProviderMethod(
  provider,
  method
) {
  if (
    typeof provider[method] !== "function"
  ) {
    throw new Error(
      `Provider ${method} required`
    );
  }
}

function requirePositiveSafeInteger(
  value,
  label
) {
  if (
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `${label} must be a positive safe integer`
    );
  }

  return value;
}

async function acquireCurrentChainTimestampEvidence({
  provider
} = {}) {
  requireObject(
    provider,
    "Provider"
  );

  requireProviderMethod(
    provider,
    "getBlockNumber"
  );

  requireProviderMethod(
    provider,
    "getBlock"
  );

  const currentBlock =
    requirePositiveSafeInteger(
      await provider.getBlockNumber(),
      "Current block"
    );

  const block =
    await provider.getBlock(
      currentBlock
    );

  if (
    block === null ||
    typeof block !== "object" ||
    Array.isArray(block)
  ) {
    throw new Error(
      "Current block unavailable"
    );
  }

  if (
    block.number !== undefined &&
    block.number !== null &&
    block.number !== currentBlock
  ) {
    throw new Error(
      "Current block number mismatch"
    );
  }

  const currentTimestamp =
    requirePositiveSafeInteger(
      block.timestamp,
      "Current timestamp"
    );

  const currentChainTimestampEvidence =
    Object.freeze({
      currentBlock,
      currentTimestamp
    });

  return Object.freeze({
    currentChainTimestampEvidence,

    currentChainTimestampAcquisitionReady:
      true
  });
}

module.exports = {
  acquireCurrentChainTimestampEvidence
};
