"use strict";

const {
  PROTECTED_QUALIFICATION_RUNTIME_POLICY
} = require(
  "./polygonV4ProtectedQualificationRuntimePolicy"
);

const {
  runProtectedPeakQualificationOperationalComposition
} = require(
  "./polygonV4ProtectedPeakQualificationOperationalComposition"
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

async function runProtectedQualificationRuntimeComposition({
  provider,
  gasEvidence,
  amounts,

  runOperationalQualificationFn =
    runProtectedPeakQualificationOperationalComposition
}) {
  const runOperationalQualification =
    requireFunction(
      runOperationalQualificationFn,
      "runOperationalQualificationFn"
    );

  const {
    route,
    qualification,
    operational
  } =
    PROTECTED_QUALIFICATION_RUNTIME_POLICY;

  return runOperationalQualification({
    provider,

    count:
      operational.count,
    minimumBlockGap:
      operational.minimumBlockGap,
    maxAttempts:
      operational.maxAttempts,
    maxCycles:
      operational.maxCycles,
    waitMs:
      operational.waitMs,

    ...(amounts === undefined
      ? {}
      : { amounts }),

    startToken:
      route.startToken,
    entryToken:
      route.entryToken,
    exitToken:
      route.exitToken,

    slippageBps:
      qualification.slippageBps,
    maxSlippageBps:
      qualification.maxSlippageBps,
    maxAgeBlocks:
      qualification.maxAgeBlocks,
    deadlineSeconds:
      qualification.deadlineSeconds,

    gasEvidence,

    safetyReserveWei:
      qualification.safetyReserveWei,
    minimumNetProfitWei:
      qualification.minimumNetProfitWei
  });
}

module.exports = {
  runProtectedQualificationRuntimeComposition
};
