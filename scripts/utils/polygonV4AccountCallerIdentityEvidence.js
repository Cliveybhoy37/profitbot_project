"use strict";

const { ethers } = require("ethers");

function requireObject(value, name) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function requireNonzeroAddress(
  value,
  name
) {
  if (
    !ethers.utils.isAddress(value) ||
    value === ethers.constants.AddressZero
  ) {
    throw new Error(
      `${name} must be a valid nonzero address`
    );
  }

  return value;
}

function sameAddress(left, right) {
  return (
    ethers.utils.getAddress(left) ===
    ethers.utils.getAddress(right)
  );
}

function buildAccountCallerIdentityEvidence({
  currentStatePreflightEvidence,
  accountIdentityEvidence
} = {}) {
  const preflight =
    requireObject(
      currentStatePreflightEvidence,
      "Current-state preflight evidence"
    );

  if (
    preflight.currentStatePreflightReady !==
    true
  ) {
    throw new Error(
      "Current-state preflight evidence must be ready"
    );
  }

  if (
    preflight.liveExecutionAuthorized !==
      false ||
    preflight.signerAuthorized !== false ||
    preflight.broadcastAuthorized !== false
  ) {
    throw new Error(
      "Upstream execution authorization must remain false"
    );
  }

  const current =
    requireObject(
      preflight.currentStateEvidence,
      "Current-state evidence"
    );

  const deployment =
    requireObject(
      current.deploymentEvidence,
      "Deployment evidence"
    );

  const deployedExecutorAddress =
    requireNonzeroAddress(
      deployment.executorAddress,
      "Deployed executor address"
    );

  const account =
    requireObject(
      accountIdentityEvidence,
      "Account identity evidence"
    );

  const callerAddress =
    requireNonzeroAddress(
      account.callerAddress,
      "Caller address"
    );

  const ownerAddress =
    requireNonzeroAddress(
      account.ownerAddress,
      "Owner address"
    );

  const accountExecutorAddress =
    requireNonzeroAddress(
      account.executorAddress,
      "Account executor deployment address"
    );

  if (
    !sameAddress(
      callerAddress,
      ownerAddress
    )
  ) {
    throw new Error(
      "Caller identity does not match deployed ProfitBot owner"
    );
  }

  if (
    !sameAddress(
      accountExecutorAddress,
      deployedExecutorAddress
    )
  ) {
    throw new Error(
      "Account executor deployment identity mismatch"
    );
  }

  return Object.freeze({
    currentStatePreflightEvidence:
      preflight,

    accountIdentityEvidence:
      account,

    candidate:
      preflight.candidate,

    executionLegs:
      preflight.executionLegs,

    executionPlan:
      preflight.executionPlan,

    gasEvidence:
      preflight.gasEvidence,

    qualificationPolicySnapshot:
      preflight.qualificationPolicySnapshot,

    qualifiedContext:
      preflight.qualifiedContext,

    accountCallerIdentityReady: true,

    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  });
}

module.exports = {
  buildAccountCallerIdentityEvidence
};
