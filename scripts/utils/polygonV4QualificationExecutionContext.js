"use strict";

const {
  acquireQualificationPolicySnapshot
} = require(
  "./polygonV4QualificationPolicySnapshot"
);

function requireFunction(
  value,
  label
) {
  if (typeof value !== "function") {
    throw new Error(
      `${label} must be a function`
    );
  }

  return value;
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

async function acquireQualificationExecutionContext({
  provider,
  deadlineSeconds,
  acquirePolicySnapshotFn =
    acquireQualificationPolicySnapshot
}) {
  if (!provider) {
    throw new Error(
      "provider required"
    );
  }

  const duration =
    requirePositiveSafeInteger(
      deadlineSeconds,
      "deadlineSeconds"
    );

  const acquirePolicySnapshot =
    requireFunction(
      acquirePolicySnapshotFn,
      "acquirePolicySnapshotFn"
    );

  const policySnapshot =
    await acquirePolicySnapshot({
      provider
    });

  if (
    !policySnapshot ||
    typeof policySnapshot !== "object"
  ) {
    throw new Error(
      "Qualification policy snapshot required"
    );
  }

  const policyBlock =
    requirePositiveSafeInteger(
      policySnapshot.currentBlock,
      "policySnapshot.currentBlock"
    );

  if (
    typeof provider.getBlock !==
      "function"
  ) {
    throw new Error(
      "provider requires getBlock"
    );
  }

  const block =
    await provider.getBlock(
      policyBlock
    );

  if (
    !block ||
    typeof block !== "object"
  ) {
    throw new Error(
      "Qualification policy block unavailable"
    );
  }

  const policyBlockTimestamp =
    requirePositiveSafeInteger(
      block.timestamp,
      "policy block timestamp"
    );

  if (
    block.number !== undefined &&
    block.number !== null &&
    block.number !== policyBlock
  ) {
    throw new Error(
      "Qualification policy block number mismatch"
    );
  }

  const deadline =
    policyBlockTimestamp +
    duration;

  if (
    !Number.isSafeInteger(deadline) ||
    deadline <= policyBlockTimestamp
  ) {
    throw new Error(
      "Execution deadline exceeds safe integer range"
    );
  }

  return {
    policySnapshot,
    policyBlockTimestamp,
    deadline
  };
}

module.exports = {
  acquireQualificationExecutionContext
};
