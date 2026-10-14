"use strict";

const {
  acquireDeployedAccountIdentityEvidence
} = require(
  "./polygonV4DeployedAccountIdentityAcquisitionEvidence"
);

function requireObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      `${label} must be an object`
    );
  }

  return value;
}

async function buildDeployedAccountIdentityAcquisitionCompositionEvidence({
  currentStatePreflightCompositionEvidence,
  getCallerAddress,
  getExecutorOwner
} = {}) {
  const composition =
    requireObject(
      currentStatePreflightCompositionEvidence,
      "Current-state preflight composition evidence"
    );

  if (
    composition.currentStatePreflightCompositionReady !==
    true
  ) {
    throw new Error(
      "Current-state preflight composition evidence is not ready"
    );
  }

  const currentStatePreflightEvidence =
    requireObject(
      composition.currentStatePreflightEvidence,
      "Current-state preflight evidence"
    );

  const deployedAccountIdentityAcquisitionEvidence =
    await acquireDeployedAccountIdentityEvidence({
      currentStatePreflightEvidence,
      getCallerAddress,
      getExecutorOwner
    });

  return Object.freeze({
    currentStatePreflightCompositionEvidence:
      composition,

    deployedAccountIdentityAcquisitionEvidence,

    deployedAccountIdentityAcquisitionCompositionReady:
      true
  });
}

module.exports = {
  buildDeployedAccountIdentityAcquisitionCompositionEvidence
};
