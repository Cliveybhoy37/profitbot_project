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

function requireFunction(value, name) {
  if (typeof value !== "function") {
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

async function acquireDeployedAccountIdentityEvidence({
  currentStatePreflightEvidence,
  getCallerAddress,
  getExecutorOwner
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

  const executorAddress =
    requireNonzeroAddress(
      deployment.executorAddress,
      "Deployed executor address"
    );

  const acquireCaller =
    requireFunction(
      getCallerAddress,
      "getCallerAddress"
    );

  const acquireOwner =
    requireFunction(
      getExecutorOwner,
      "getExecutorOwner"
    );

  const callerAddress =
    requireNonzeroAddress(
      await acquireCaller(),
      "Caller address"
    );

  const ownerAddress =
    requireNonzeroAddress(
      await acquireOwner(executorAddress),
      "Executor owner address"
    );

  const accountIdentityEvidence =
    Object.freeze({
      callerAddress,
      ownerAddress,
      executorAddress
    });

  return Object.freeze({
    currentStatePreflightEvidence:
      preflight,

    accountIdentityEvidence,

    deployedAccountIdentityAcquisitionReady:
      true,

    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  });
}

module.exports = {
  acquireDeployedAccountIdentityEvidence
};
