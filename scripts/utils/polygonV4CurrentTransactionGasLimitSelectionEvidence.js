"use strict";

const { ethers } = require("ethers");

function requireObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(`${label} required`);
  }

  return value;
}

function requireAuthorizationFalse(
  evidence,
  label
) {
  if (
    evidence.liveExecutionAuthorized !== false ||
    evidence.signerAuthorized !== false ||
    evidence.broadcastAuthorized !== false
  ) {
    throw new Error(
      `${label} authorization must remain false`
    );
  }
}

function requirePositiveBigNumber(
  value,
  label
) {
  if (!ethers.BigNumber.isBigNumber(value)) {
    throw new Error(
      `${label} must be BigNumber`
    );
  }

  if (value.lte(0)) {
    throw new Error(
      `${label} must be positive`
    );
  }

  return value;
}

function selectCurrentTransactionGasLimitEvidence({
  currentTransactionGasEstimationEvidence
} = {}) {
  const estimation =
    requireObject(
      currentTransactionGasEstimationEvidence,
      "Current transaction gas estimation evidence"
    );

  if (
    estimation.currentTransactionGasEstimationReady !==
    true
  ) {
    throw new Error(
      "Current transaction gas estimation evidence must be ready"
    );
  }

  requireAuthorizationFalse(
    estimation,
    "Current transaction gas estimation evidence"
  );

  const parameters =
    requireObject(
      estimation.currentTransactionParameterEvidence,
      "Current transaction parameter evidence"
    );

  if (
    parameters.currentTransactionParametersReady !==
    true
  ) {
    throw new Error(
      "Current transaction parameter evidence must be ready"
    );
  }

  requireAuthorizationFalse(
    parameters,
    "Current transaction parameter evidence"
  );

  const unsigned =
    requireObject(
      estimation.unsignedTransactionIntentEvidence,
      "Unsigned transaction intent evidence"
    );

  if (
    unsigned.unsignedTransactionIntentReady !==
    true
  ) {
    throw new Error(
      "Unsigned transaction intent evidence must be ready"
    );
  }

  requireAuthorizationFalse(
    unsigned,
    "Unsigned transaction intent evidence"
  );

  if (
    parameters.unsignedTransactionIntentEvidence !==
    unsigned
  ) {
    throw new Error(
      "Unsigned transaction intent evidence identity mismatch"
    );
  }

  const transactionIntent =
    requireObject(
      estimation.transactionIntent,
      "Transaction intent"
    );

  if (
    parameters.transactionIntent !==
      transactionIntent ||
    unsigned.transactionIntent !==
      transactionIntent
  ) {
    throw new Error(
      "Transaction intent identity mismatch"
    );
  }

  const account =
    requireObject(
      unsigned.accountCallerIdentityEvidence,
      "Account caller identity evidence"
    );

  if (
    account.accountCallerIdentityReady !==
    true
  ) {
    throw new Error(
      "Account caller identity evidence must be ready"
    );
  }

  requireAuthorizationFalse(
    account,
    "Account caller identity evidence"
  );

  const preflight =
    requireObject(
      account.currentStatePreflightEvidence,
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

  requireAuthorizationFalse(
    preflight,
    "Current-state preflight evidence"
  );

  const estimatedGasUnits =
    requirePositiveBigNumber(
      estimation.estimatedGasUnits,
      "Estimated gas units"
    );

  /*
   * 1S.32 selects the exact transaction-specific
   * estimate supplied by validated 1S.31 evidence.
   *
   * It does not introduce:
   * - a percentage margin;
   * - a fixed gas buffer;
   * - qualification-policy gas;
   * - historical receipt gas;
   * - an archived experimental gas constant.
   *
   * Current-state acquisition remains upstream.
   * Transaction-envelope construction, signing and
   * broadcast remain outside this boundary.
   */
  const selectedGasLimit =
    estimatedGasUnits;

  return Object.freeze({
    currentTransactionGasEstimationEvidence:
      estimation,
    currentTransactionParameterEvidence:
      parameters,
    unsignedTransactionIntentEvidence:
      unsigned,
    transactionIntent,
    selectedGasLimit,
    currentTransactionGasLimitSelectionReady:
      true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  });
}

module.exports = {
  selectCurrentTransactionGasLimitEvidence
};
