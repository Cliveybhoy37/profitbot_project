"use strict";

const {
  buildCurrentStatePreflightCompositionEvidence
} = require("./polygonV4CurrentStatePreflightCompositionEvidence");

const {
  buildDeployedAccountIdentityAcquisitionCompositionEvidence
} = require("./polygonV4DeployedAccountIdentityAcquisitionCompositionEvidence");

const {
  buildAccountCallerIdentityCompositionEvidence
} = require("./polygonV4AccountCallerIdentityCompositionEvidence");

const {
  buildUnsignedExactTransactionIntentCompositionEvidence
} = require("./polygonV4UnsignedExactTransactionIntentCompositionEvidence");

function requireObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(`${label} must be an object`);
  }

  return value;
}

function requireUnauthorized(evidence, label) {
  if (
    evidence.liveExecutionAuthorized !== false ||
    evidence.signerAuthorized !== false ||
    evidence.broadcastAuthorized !== false
  ) {
    throw new Error(`${label} must remain unauthorized`);
  }
}

async function buildReadOnlyExecutionHandoffComposition({
  readinessEvidence,
  currentStateEvidenceComposition,
  getCallerAddress,
  getExecutorOwner
} = {}) {
  const readiness = requireObject(
    readinessEvidence,
    "Execution readiness evidence"
  );

  const currentComposition = requireObject(
    currentStateEvidenceComposition,
    "Current-state evidence composition"
  );

  requireUnauthorized(readiness, "Execution readiness");

  if (
    currentComposition.currentStateEvidenceCompositionReady !== true
  ) {
    throw new Error("Current-state evidence composition is not ready");
  }

  const currentState = requireObject(
    currentComposition.currentStateEvidence,
    "Current-state evidence"
  );

  for (const field of [
    "liveExecutionAuthorized",
    "signerAuthorized",
    "broadcastAuthorized"
  ]) {
    if (
      Object.prototype.hasOwnProperty.call(currentState, field) &&
      currentState[field] !== false
    ) {
      throw new Error(
        "Current-state evidence must remain unauthorized"
      );
    }
  }

  const currentStatePreflightCompositionEvidence =
    buildCurrentStatePreflightCompositionEvidence({
      readinessEvidence: readiness,
      currentStateEvidenceComposition: currentComposition
    });

  const currentStatePreflightEvidence =
    currentStatePreflightCompositionEvidence.currentStatePreflightEvidence;

  requireUnauthorized(
    currentStatePreflightEvidence,
    "Current-state preflight"
  );

  const deployedAccountIdentityAcquisitionCompositionEvidence =
    await buildDeployedAccountIdentityAcquisitionCompositionEvidence({
      currentStatePreflightCompositionEvidence,
      getCallerAddress,
      getExecutorOwner
    });

  const accountCallerIdentityCompositionEvidence =
    buildAccountCallerIdentityCompositionEvidence({
      deployedAccountIdentityAcquisitionCompositionEvidence
    });

  const unsignedExactTransactionIntentCompositionEvidence =
    buildUnsignedExactTransactionIntentCompositionEvidence({
      accountCallerIdentityCompositionEvidence
    });

  const unsignedTransactionIntentEvidence =
    unsignedExactTransactionIntentCompositionEvidence
      .unsignedTransactionIntentEvidence;

  requireUnauthorized(
    unsignedTransactionIntentEvidence,
    "Unsigned transaction intent"
  );

  const accountCallerIdentityEvidence =
    accountCallerIdentityCompositionEvidence
      .accountCallerIdentityEvidence;

  if (
    unsignedTransactionIntentEvidence.accountCallerIdentityEvidence !==
      accountCallerIdentityEvidence ||
    accountCallerIdentityEvidence.currentStatePreflightEvidence !==
      currentStatePreflightEvidence ||
    unsignedTransactionIntentEvidence.candidate !==
      currentStatePreflightEvidence.candidate ||
    unsignedTransactionIntentEvidence.executionLegs !==
      currentStatePreflightEvidence.executionLegs ||
    unsignedTransactionIntentEvidence.executionPlan !==
      currentStatePreflightEvidence.executionPlan ||
    accountCallerIdentityEvidence.gasEvidence !==
      currentStatePreflightEvidence.gasEvidence ||
    accountCallerIdentityEvidence.qualificationPolicySnapshot !==
      currentStatePreflightEvidence.qualificationPolicySnapshot
  ) {
    throw new Error("Unsigned transaction evidence lineage mismatch");
  }

  return Object.freeze({
    readinessEvidence: readiness,
    currentStateEvidenceComposition: currentComposition,
    currentStatePreflightCompositionEvidence,
    deployedAccountIdentityAcquisitionCompositionEvidence,
    accountCallerIdentityCompositionEvidence,
    unsignedExactTransactionIntentCompositionEvidence,
    unsignedTransactionIntentEvidence,
    readOnlyExecutionHandoffReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  });
}

module.exports = {
  buildReadOnlyExecutionHandoffComposition
};
