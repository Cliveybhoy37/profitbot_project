"use strict";

const { ethers } = require("ethers");

const POLYGON_CHAIN_ID = 137;

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

function requireNonce(value) {
  if (
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new Error(
      "Current transaction nonce invalid"
    );
  }

  return value;
}

function buildCurrentTransactionEnvelopeEvidence({
  currentTransactionGasLimitSelectionEvidence
} = {}) {
  const selection =
    requireObject(
      currentTransactionGasLimitSelectionEvidence,
      "Current transaction gas-limit selection evidence"
    );

  if (
    selection.currentTransactionGasLimitSelectionReady !==
    true
  ) {
    throw new Error(
      "Current transaction gas-limit selection evidence must be ready"
    );
  }

  requireAuthorizationFalse(
    selection,
    "Current transaction gas-limit selection evidence"
  );

  const estimation =
    requireObject(
      selection.currentTransactionGasEstimationEvidence,
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
      selection.currentTransactionParameterEvidence,
      "Current transaction parameter evidence"
    );

  if (
    estimation.currentTransactionParameterEvidence !==
    parameters
  ) {
    throw new Error(
      "Current transaction parameter evidence identity mismatch"
    );
  }

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
      selection.unsignedTransactionIntentEvidence,
      "Unsigned transaction intent evidence"
    );

  if (
    estimation.unsignedTransactionIntentEvidence !==
      unsigned ||
    parameters.unsignedTransactionIntentEvidence !==
      unsigned
  ) {
    throw new Error(
      "Unsigned transaction intent evidence identity mismatch"
    );
  }

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

  const transactionIntent =
    requireObject(
      selection.transactionIntent,
      "Transaction intent"
    );

  if (
    estimation.transactionIntent !==
      transactionIntent ||
    parameters.transactionIntent !==
      transactionIntent ||
    unsigned.transactionIntent !==
      transactionIntent
  ) {
    throw new Error(
      "Transaction intent identity mismatch"
    );
  }

  const selectedGasLimit =
    requirePositiveBigNumber(
      selection.selectedGasLimit,
      "Selected gas limit"
    );

  const estimatedGasUnits =
    requirePositiveBigNumber(
      estimation.estimatedGasUnits,
      "Estimated gas units"
    );

  if (
    selectedGasLimit !==
    estimatedGasUnits
  ) {
    throw new Error(
      "Selected gas limit must preserve exact estimated gas identity"
    );
  }

  if (
    parameters.chainId !==
    POLYGON_CHAIN_ID
  ) {
    throw new Error(
      "Polygon chain ID 137 required"
    );
  }

  const nonce =
    requireNonce(parameters.nonce);

  const maxFeePerGas =
    requirePositiveBigNumber(
      parameters.maxFeePerGas,
      "maxFeePerGas"
    );

  const maxPriorityFeePerGas =
    requirePositiveBigNumber(
      parameters.maxPriorityFeePerGas,
      "maxPriorityFeePerGas"
    );

  if (
    maxFeePerGas.lt(
      maxPriorityFeePerGas
    )
  ) {
    throw new Error(
      "maxFeePerGas must be at least maxPriorityFeePerGas"
    );
  }

  /*
   * 1S.33 performs deterministic envelope composition
   * only. Every transaction field is owned upstream.
   *
   * No provider acquisition.
   * No nonce/fee/gas reacquisition.
   * No calldata reconstruction.
   * No gas policy or margin.
   * No signer, signing, sending or broadcast.
   */
  const transactionEnvelope =
    Object.freeze({
      from: transactionIntent.from,
      to: transactionIntent.to,
      data: transactionIntent.data,
      value: transactionIntent.value,
      chainId: parameters.chainId,
      nonce,
      maxFeePerGas,
      maxPriorityFeePerGas,
      gasLimit: selectedGasLimit
    });

  return Object.freeze({
    currentTransactionGasLimitSelectionEvidence:
      selection,

    currentTransactionGasEstimationEvidence:
      estimation,

    currentTransactionParameterEvidence:
      parameters,

    unsignedTransactionIntentEvidence:
      unsigned,

    transactionIntent,

    transactionEnvelope,

    currentTransactionEnvelopeReady: true,

    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  });
}

module.exports = {
  buildCurrentTransactionEnvelopeEvidence
};
