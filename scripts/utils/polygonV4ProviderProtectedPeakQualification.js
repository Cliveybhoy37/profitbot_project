"use strict";

const {
  acquireQualificationPolicySnapshot
} = require("./polygonV4QualificationPolicySnapshot");

const {
  qualifyProtectedPeakHandoff
} = require("./polygonV4ProtectedPeakQualification");

async function qualifyProviderProtectedPeakHandoff({
  provider,
  operationalResult,
  startToken,
  entryToken,
  exitToken,
  slippageBps,
  maxSlippageBps,
  maxAgeBlocks,
  estimatedGas,
  safetyReserveWei,
  minimumNetProfitWei,
  acquirePolicySnapshotFn =
    acquireQualificationPolicySnapshot,
  qualifyProtectedPeakHandoffFn =
    qualifyProtectedPeakHandoff
}) {
  if (
    typeof acquirePolicySnapshotFn !==
    "function"
  ) {
    throw new Error(
      "acquirePolicySnapshotFn must be a function"
    );
  }

  if (
    typeof qualifyProtectedPeakHandoffFn !==
    "function"
  ) {
    throw new Error(
      "qualifyProtectedPeakHandoffFn must be a function"
    );
  }

  const policySnapshot =
    await acquirePolicySnapshotFn({
      provider
    });

  return qualifyProtectedPeakHandoffFn({
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
  });
}

module.exports = {
  qualifyProviderProtectedPeakHandoff
};
