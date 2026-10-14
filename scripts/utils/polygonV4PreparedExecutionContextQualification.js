"use strict";

const { ethers } = require("ethers");

const {
  validateForkReceiptGasEvidence
} = require(
  "./polygonV4ForkReceiptGasEvidence"
);

const {
  preflightObservedV4Candidate
} = require(
  "./polygonV4CandidatePreflight"
);

function requireObject(value, label) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      `${label} object required`
    );
  }

  return value;
}

function requireFunction(value, label) {
  if (typeof value !== "function") {
    throw new Error(
      `${label} function required`
    );
  }

  return value;
}

function requirePolicySnapshot(
  policySnapshot
) {
  const policy =
    requireObject(
      policySnapshot,
      "Authoritative policySnapshot"
    );

  if (
    !Number.isSafeInteger(
      policy.currentBlock
    ) ||
    policy.currentBlock <= 0
  ) {
    throw new Error(
      "Policy snapshot requires valid currentBlock"
    );
  }

  if (
    !ethers.BigNumber.isBigNumber(
      policy.gasPriceWei
    ) ||
    policy.gasPriceWei.lte(0)
  ) {
    throw new Error(
      "Policy snapshot requires positive gasPriceWei"
    );
  }

  if (
    !Number.isSafeInteger(
      policy.premiumBps
    ) ||
    policy.premiumBps < 0 ||
    policy.premiumBps >= 10000
  ) {
    throw new Error(
      "Policy snapshot requires valid premiumBps"
    );
  }

  return policy;
}

function qualifyPreparedExecutionContext({
  preparedExecutionContext,
  gasEvidence,
  policySnapshot,
  slippageBps,
  maxSlippageBps,
  maxAgeBlocks,
  safetyReserveWei,

  validateForkReceiptGasEvidenceFn =
    validateForkReceiptGasEvidence,

  preflightObservedV4CandidateFn =
    preflightObservedV4Candidate
}) {
  const prepared =
    requireObject(
      preparedExecutionContext,
      "Prepared execution context"
    );

  const policy =
    requirePolicySnapshot(
      policySnapshot
    );

  const validateGasEvidence =
    requireFunction(
      validateForkReceiptGasEvidenceFn,
      "validateForkReceiptGasEvidenceFn"
    );

  const runPreflight =
    requireFunction(
      preflightObservedV4CandidateFn,
      "preflightObservedV4CandidateFn"
    );

  const candidate =
    requireObject(
      prepared.candidate,
      "Prepared execution context candidate"
    );

  if (
    !Array.isArray(
      prepared.executionLegs
    ) ||
    prepared.executionLegs.length !== 3
  ) {
    throw new Error(
      "Prepared execution context requires exactly three execution legs"
    );
  }

  if (
    typeof prepared.executionPlan !== "string" ||
    prepared.executionPlan === "0x" ||
    !ethers.utils.isHexString(
      prepared.executionPlan
    )
  ) {
    throw new Error(
      "Prepared execution context executionPlan required"
    );
  }

  if (
    !Number.isSafeInteger(
      prepared.deadline
    ) ||
    prepared.deadline <= 0
  ) {
    throw new Error(
      "Prepared execution context deadline required"
    );
  }

  if (
    !ethers.BigNumber.isBigNumber(
      prepared.minimumNetProfitWei
    ) ||
    prepared.minimumNetProfitWei.lt(0)
  ) {
    throw new Error(
      "Prepared execution context minimumNetProfitWei required"
    );
  }

  const validatedGasEvidence =
    validateGasEvidence({
      candidate,
      executionLegs:
        prepared.executionLegs,
      executionPlan:
        prepared.executionPlan,
      evidence:
        gasEvidence
    });

  let preflight;

  try {
    preflight =
      runPreflight({
        candidate,
        executionLegs:
          prepared.executionLegs,
        requestedAmount:
          candidate.amountIn,
        currentBlock:
          policy.currentBlock,
        maxAgeBlocks,
        slippageBps,
        maxSlippageBps,
        premiumBps:
          policy.premiumBps,
        estimatedGas:
          validatedGasEvidence.gasUnits,
        gasPriceWei:
          policy.gasPriceWei,
        safetyReserveWei,
        minimumNetProfitWei:
          prepared.minimumNetProfitWei
      });
  } catch (error) {
    return {
      qualified: false,
      stage: "PREFLIGHT",
      handoff:
        prepared.handoff,
      candidate,
      executionLegs:
        prepared.executionLegs,
      executionPlan:
        prepared.executionPlan,
      deadline:
        prepared.deadline,
      minimumNetProfitWei:
        prepared.minimumNetProfitWei,
      policySnapshot:
        policy,
      gasEvidence,
      reason:
        error?.message ||
        "UNKNOWN_PREFLIGHT_FAILURE"
    };
  }

  const qualificationResult = {
    qualified: true,
    stage: "QUALIFIED",
    handoff:
      prepared.handoff,
    candidate,
    executionLegs:
      prepared.executionLegs,
    currentBlock:
      policy.currentBlock,
    premiumBps:
      policy.premiumBps,
    gasPriceWei:
      policy.gasPriceWei,
    preflight
  };

  return {
    qualificationResult,
    handoff:
      prepared.handoff,
    candidate,
    executionLegs:
      prepared.executionLegs,
    executionPlan:
      prepared.executionPlan,
    deadline:
      prepared.deadline,
    minimumNetProfitWei:
      prepared.minimumNetProfitWei,
    policySnapshot:
      policy,
    gasEvidence
  };
}

module.exports = {
  qualifyPreparedExecutionContext
};
