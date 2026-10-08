"use strict";

const {
  buildAccountCallerIdentityEvidence
} = require(
  "./polygonV4AccountCallerIdentityEvidence"
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

function buildAccountCallerIdentityCompositionEvidence({
  deployedAccountIdentityAcquisitionCompositionEvidence
} = {}) {
  const composition =
    requireObject(
      deployedAccountIdentityAcquisitionCompositionEvidence,
      "Deployed-account identity acquisition composition evidence"
    );

  if (
    composition
      .deployedAccountIdentityAcquisitionCompositionReady !==
    true
  ) {
    throw new Error(
      "Deployed-account identity acquisition composition evidence is not ready"
    );
  }

  const acquisition =
    requireObject(
      composition
        .deployedAccountIdentityAcquisitionEvidence,
      "Deployed-account identity acquisition evidence"
    );

  if (
    acquisition
      .deployedAccountIdentityAcquisitionReady !==
    true
  ) {
    throw new Error(
      "Deployed-account identity acquisition evidence is not ready"
    );
  }

  const currentStatePreflightEvidence =
    requireObject(
      acquisition.currentStatePreflightEvidence,
      "Current-state preflight evidence"
    );

  const accountIdentityEvidence =
    requireObject(
      acquisition.accountIdentityEvidence,
      "Account identity evidence"
    );

  const accountCallerIdentityEvidence =
    buildAccountCallerIdentityEvidence({
      currentStatePreflightEvidence,
      accountIdentityEvidence
    });

  return Object.freeze({
    deployedAccountIdentityAcquisitionCompositionEvidence:
      composition,

    accountCallerIdentityEvidence,

    accountCallerIdentityCompositionReady:
      true
  });
}

module.exports = {
  buildAccountCallerIdentityCompositionEvidence
};
