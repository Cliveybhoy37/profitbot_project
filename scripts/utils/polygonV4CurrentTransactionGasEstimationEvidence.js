"use strict";

const { ethers } = require("ethers");

const POLYGON_CHAIN_ID = 137;

function requireObject(value, label) {
  if (
    !value ||
    typeof value !== "object"
  ) {
    throw new Error(
      `${label} is required`
    );
  }

  return value;
}

function requireAuthorizationFalse(
  evidence,
  label
) {
  for (const field of [
    "liveExecutionAuthorized",
    "signerAuthorized",
    "broadcastAuthorized"
  ]) {
    if (evidence[field] !== false) {
      throw new Error(
        `${label} authorization flags must remain exactly false`
      );
    }
  }
}

function requireAddress(value, label) {
  if (
    !ethers.utils.isAddress(value) ||
    value === ethers.constants.AddressZero
  ) {
    throw new Error(
      `${label} must be a valid nonzero address`
    );
  }

  return value;
}

function requirePositiveBigNumber(
  value,
  label
) {
  let parsed;

  try {
    parsed =
      ethers.BigNumber.from(value);
  } catch {
    throw new Error(
      `${label} must be a positive BigNumber`
    );
  }

  if (parsed.lte(0)) {
    throw new Error(
      `${label} must be a positive BigNumber`
    );
  }

  return parsed;
}

function requireTransactionIntent(intent) {
  requireObject(
    intent,
    "Preserved transaction intent"
  );

  requireAddress(
    intent.from,
    "Transaction intent from"
  );

  requireAddress(
    intent.to,
    "Transaction intent to"
  );

  if (
    typeof intent.data !== "string" ||
    !ethers.utils.isHexString(
      intent.data
    )
  ) {
    throw new Error(
      "Transaction intent data must be valid hex bytes"
    );
  }

  let value;

  try {
    value =
      ethers.BigNumber.from(
        intent.value
      );
  } catch {
    throw new Error(
      "Transaction intent value must be a nonnegative BigNumber"
    );
  }

  if (value.lt(0)) {
    throw new Error(
      "Transaction intent value must be a nonnegative BigNumber"
    );
  }

  return intent;
}

function validatePreservedUpstream(
  currentTransactionParameterEvidence
) {
  const current =
    requireObject(
      currentTransactionParameterEvidence,
      "Current transaction parameter evidence"
    );

  if (
    current.currentTransactionParametersReady !==
    true
  ) {
    throw new Error(
      "Current transaction parameter evidence must be ready"
    );
  }

  requireAuthorizationFalse(
    current,
    "Current transaction parameter evidence"
  );

  if (
    current.chainId !==
    POLYGON_CHAIN_ID
  ) {
    throw new Error(
      "Current transaction parameter evidence must be for Polygon chain 137"
    );
  }

  if (
    !Number.isSafeInteger(
      current.nonce
    ) ||
    current.nonce < 0
  ) {
    throw new Error(
      "Current transaction parameter nonce must be a non-negative safe integer"
    );
  }

  const maxFeePerGas =
    requirePositiveBigNumber(
      current.maxFeePerGas,
      "Current maxFeePerGas"
    );

  const maxPriorityFeePerGas =
    requirePositiveBigNumber(
      current.maxPriorityFeePerGas,
      "Current maxPriorityFeePerGas"
    );

  if (
    maxFeePerGas.lt(
      maxPriorityFeePerGas
    )
  ) {
    throw new Error(
      "Current maxFeePerGas must be greater than or equal to maxPriorityFeePerGas"
    );
  }

  const unsigned =
    requireObject(
      current.unsignedTransactionIntentEvidence,
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

  const transactionIntent =
    requireTransactionIntent(
      current.transactionIntent
    );

  if (
    unsigned.transactionIntent !==
    transactionIntent
  ) {
    throw new Error(
      "Preserved transaction intent identity mismatch"
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

  const candidate =
    requireObject(
      unsigned.candidate,
      "Preserved candidate"
    );

  if (
    account.candidate !== candidate ||
    preflight.candidate !== candidate
  ) {
    throw new Error(
      "Preserved candidate identity mismatch"
    );
  }

  const executionLegs =
    unsigned.executionLegs;

  if (
    !Array.isArray(executionLegs)
  ) {
    throw new Error(
      "Preserved execution legs are required"
    );
  }

  if (
    account.executionLegs !==
      executionLegs ||
    preflight.executionLegs !==
      executionLegs
  ) {
    throw new Error(
      "Preserved execution legs identity mismatch"
    );
  }

  const executionPlan =
    unsigned.executionPlan;

  if (
    typeof executionPlan !== "string" ||
    executionPlan === "0x" ||
    !ethers.utils.isHexString(
      executionPlan
    )
  ) {
    throw new Error(
      "Preserved execution plan must be nonempty hex bytes"
    );
  }

  if (
    account.executionPlan !==
      executionPlan ||
    preflight.executionPlan !==
      executionPlan
  ) {
    throw new Error(
      "Preserved execution plan identity mismatch"
    );
  }

  const callerAddress =
    requireAddress(
      account.callerAddress,
      "Preserved caller address"
    );

  const executorAddress =
    requireAddress(
      account.executorAddress,
      "Preserved executor address"
    );

  if (
    transactionIntent.from.toLowerCase() !==
    callerAddress.toLowerCase()
  ) {
    throw new Error(
      "Transaction intent from is not bound to preserved caller identity"
    );
  }

  if (
    transactionIntent.to.toLowerCase() !==
    executorAddress.toLowerCase()
  ) {
    throw new Error(
      "Transaction intent to is not bound to preserved executor identity"
    );
  }

  return {
    current,
    unsigned,
    transactionIntent
  };
}

async function acquireCurrentTransactionGasEstimationEvidence({
  currentTransactionParameterEvidence,
  provider
}) {
  const {
    current,
    unsigned,
    transactionIntent
  } =
    validatePreservedUpstream(
      currentTransactionParameterEvidence
    );

  if (
    !provider ||
    typeof provider.estimateGas !==
      "function"
  ) {
    throw new Error(
      "Provider with estimateGas is required"
    );
  }

  const estimatedGasUnits =
    requirePositiveBigNumber(
      await provider.estimateGas({
        from:
          transactionIntent.from,
        to:
          transactionIntent.to,
        data:
          transactionIntent.data,
        value:
          transactionIntent.value
      }),
      "Current transaction gas estimate"
    );

  return Object.freeze({
    currentTransactionParameterEvidence:
      current,

    unsignedTransactionIntentEvidence:
      unsigned,

    transactionIntent,

    estimatedGasUnits,

    currentTransactionGasEstimationReady:
      true,

    liveExecutionAuthorized:
      false,

    signerAuthorized:
      false,

    broadcastAuthorized:
      false
  });
}

module.exports = {
  acquireCurrentTransactionGasEstimationEvidence
};
