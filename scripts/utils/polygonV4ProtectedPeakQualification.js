"use strict";

const { ethers } = require("ethers");

const {
  selectProtectedPeakHandoff
} = require(
  "./polygonV4ProtectedPeakHandoff"
);

const {
  buildObservedV4Candidate
} = require(
  "./polygonV4ObservedCandidate"
);

const {
  buildV4ExecutionLegs
} = require(
  "./polygonV4ExecutionRoute"
);

const {
  preflightObservedV4Candidate
} = require(
  "./polygonV4CandidatePreflight"
);

function requirePolicySnapshot(
  policySnapshot
) {
  if (
    !policySnapshot ||
    typeof policySnapshot !== "object"
  ) {
    throw new Error(
      "Protected peak qualification requires policySnapshot"
    );
  }

  if (
    !Number.isSafeInteger(
      policySnapshot.currentBlock
    ) ||
    policySnapshot.currentBlock <= 0
  ) {
    throw new Error(
      "Policy snapshot requires valid currentBlock"
    );
  }

  if (
    !ethers.BigNumber.isBigNumber(
      policySnapshot.gasPriceWei
    ) ||
    policySnapshot.gasPriceWei.lte(0)
  ) {
    throw new Error(
      "Policy snapshot requires positive gasPriceWei"
    );
  }

  if (
    !Number.isSafeInteger(
      policySnapshot.premiumBps
    ) ||
    policySnapshot.premiumBps < 0
  ) {
    throw new Error(
      "Policy snapshot requires valid premiumBps"
    );
  }

  return policySnapshot;
}

function qualifyProtectedPeakHandoff({
  operationalResult,
  policySnapshot,
  startToken,
  entryToken,
  exitToken,
  slippageBps,
  maxSlippageBps,
  maxAgeBlocks,
  estimatedGas,
  safetyReserveWei,
  minimumNetProfitWei
}) {
  const policy =
    requirePolicySnapshot(
      policySnapshot
    );

  const handoff =
    selectProtectedPeakHandoff(
      operationalResult
    );

  const candidate =
    buildObservedV4Candidate({
      observation:
        handoff.observation,
      startToken,
      entryToken,
      exitToken
    });

  const executionLegs =
    buildV4ExecutionLegs(
      candidate.legs,
      slippageBps
    );

  try {
    const preflight =
      preflightObservedV4Candidate({
        candidate,
        executionLegs,
        requestedAmount:
          candidate.amountIn,
        currentBlock:
          policy.currentBlock,
        maxAgeBlocks,
        slippageBps,
        maxSlippageBps,
        premiumBps:
          policy.premiumBps,
        estimatedGas,
        gasPriceWei:
          policy.gasPriceWei,
        safetyReserveWei,
        minimumNetProfitWei
      });

    return {
      qualified: true,
      stage: "QUALIFIED",
      handoff,
      observation:
        handoff.observation,
      candidate,
      executionLegs,
      currentBlock:
        policy.currentBlock,
      premiumBps:
        policy.premiumBps,
      gasPriceWei:
        policy.gasPriceWei,
      preflight
    };
  } catch (error) {
    return {
      qualified: false,
      stage: "PREFLIGHT",
      handoff,
      observation:
        handoff.observation,
      candidate,
      executionLegs,
      currentBlock:
        policy.currentBlock,
      premiumBps:
        policy.premiumBps,
      gasPriceWei:
        policy.gasPriceWei,
      reason:
        error?.message ||
        "UNKNOWN_PREFLIGHT_FAILURE"
    };
  }
}

module.exports = {
  qualifyProtectedPeakHandoff
};
