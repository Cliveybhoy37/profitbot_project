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

function requireProviderMethod(
  provider,
  method
) {
  if (
    typeof provider[method] !== "function"
  ) {
    throw new Error(
      `Provider ${method} required`
    );
  }
}

function requireBigNumber(
  value,
  label
) {
  if (!ethers.BigNumber.isBigNumber(value)) {
    throw new Error(
      `${label} must be BigNumber`
    );
  }

  return value;
}

function requirePositiveBigNumber(
  value,
  label
) {
  const checked =
    requireBigNumber(
      value,
      label
    );

  if (checked.lte(0)) {
    throw new Error(
      `${label} must be positive`
    );
  }

  return checked;
}

function requireIntent(intent) {
  requireObject(
    intent,
    "Transaction intent"
  );

  if (
    !ethers.utils.isAddress(
      intent.from
    ) ||
    intent.from ===
      ethers.constants.AddressZero
  ) {
    throw new Error(
      "Transaction intent from address invalid"
    );
  }

  if (
    !ethers.utils.isAddress(
      intent.to
    ) ||
    intent.to ===
      ethers.constants.AddressZero
  ) {
    throw new Error(
      "Transaction intent to address invalid"
    );
  }

  if (
    typeof intent.data !== "string" ||
    !ethers.utils.isHexString(
      intent.data
    ) ||
    intent.data === "0x"
  ) {
    throw new Error(
      "Transaction intent data invalid"
    );
  }

  const value =
    requireBigNumber(
      intent.value,
      "Transaction intent value"
    );

  if (!value.isZero()) {
    throw new Error(
      "Transaction intent value must remain zero"
    );
  }

  return intent;
}

function requireNonce(nonce) {
  if (
    !Number.isSafeInteger(nonce) ||
    nonce < 0
  ) {
    throw new Error(
      "Pending nonce invalid"
    );
  }

  return nonce;
}

async function acquireCurrentTransactionParameterEvidence({
  unsignedTransactionIntentEvidence,
  provider
} = {}) {
  const evidence =
    requireObject(
      unsignedTransactionIntentEvidence,
      "Unsigned transaction intent evidence"
    );

  if (
    evidence.unsignedTransactionIntentReady !==
    true
  ) {
    throw new Error(
      "Unsigned transaction intent evidence not ready"
    );
  }

  if (
    evidence.liveExecutionAuthorized !== false ||
    evidence.signerAuthorized !== false ||
    evidence.broadcastAuthorized !== false
  ) {
    throw new Error(
      "Upstream execution authorization must remain false"
    );
  }

  const account =
    requireObject(
      evidence.accountCallerIdentityEvidence,
      "Account caller identity evidence"
    );

  if (
    account.accountCallerIdentityReady !==
    true
  ) {
    throw new Error(
      "Account caller identity evidence not ready"
    );
  }

  if (
    account.liveExecutionAuthorized !== false ||
    account.signerAuthorized !== false ||
    account.broadcastAuthorized !== false
  ) {
    throw new Error(
      "Account identity authorization must remain false"
    );
  }

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
      "Current-state preflight evidence not ready"
    );
  }

  if (
    preflight.liveExecutionAuthorized !== false ||
    preflight.signerAuthorized !== false ||
    preflight.broadcastAuthorized !== false
  ) {
    throw new Error(
      "Current-state preflight authorization must remain false"
    );
  }

  const candidate =
    requireObject(
      evidence.candidate,
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
    evidence.executionLegs;

  if (
    !Array.isArray(executionLegs)
  ) {
    throw new Error(
      "Preserved execution legs required"
    );
  }

  if (
    account.executionLegs !== executionLegs ||
    preflight.executionLegs !== executionLegs
  ) {
    throw new Error(
      "Preserved execution legs identity mismatch"
    );
  }

  const executionPlan =
    evidence.executionPlan;

  if (
    typeof executionPlan !== "string" ||
    executionPlan === "0x" ||
    !ethers.utils.isHexString(
      executionPlan
    )
  ) {
    throw new Error(
      "Preserved execution plan invalid"
    );
  }

  if (
    account.executionPlan !== executionPlan ||
    preflight.executionPlan !== executionPlan
  ) {
    throw new Error(
      "Preserved execution plan identity mismatch"
    );
  }

  const callerAddress =
    account.callerAddress;

  const executorAddress =
    account.executorAddress;

  if (
    !ethers.utils.isAddress(
      callerAddress
    ) ||
    callerAddress ===
      ethers.constants.AddressZero
  ) {
    throw new Error(
      "Preserved caller identity invalid"
    );
  }

  if (
    !ethers.utils.isAddress(
      executorAddress
    ) ||
    executorAddress ===
      ethers.constants.AddressZero
  ) {
    throw new Error(
      "Preserved executor identity invalid"
    );
  }

  const transactionIntent =
    requireIntent(
      evidence.transactionIntent
    );

  if (
    ethers.utils.getAddress(
      transactionIntent.from
    ) !==
    ethers.utils.getAddress(
      callerAddress
    )
  ) {
    throw new Error(
      "Transaction from caller identity mismatch"
    );
  }

  if (
    ethers.utils.getAddress(
      transactionIntent.to
    ) !==
    ethers.utils.getAddress(
      executorAddress
    )
  ) {
    throw new Error(
      "Transaction target executor identity mismatch"
    );
  }

  requireObject(
    provider,
    "Provider"
  );

  requireProviderMethod(
    provider,
    "getNetwork"
  );

  requireProviderMethod(
    provider,
    "getTransactionCount"
  );

  requireProviderMethod(
    provider,
    "getFeeData"
  );

  const network =
    await provider.getNetwork();

  requireObject(
    network,
    "Provider network"
  );

  if (
    network.chainId !==
    POLYGON_CHAIN_ID
  ) {
    throw new Error(
      "Polygon chain ID 137 required"
    );
  }

  const nonce =
    requireNonce(
      await provider.getTransactionCount(
        transactionIntent.from,
        "pending"
      )
    );

  const feeData =
    requireObject(
      await provider.getFeeData(),
      "Fee data"
    );

  const maxFeePerGas =
    requirePositiveBigNumber(
      feeData.maxFeePerGas,
      "maxFeePerGas"
    );

  const maxPriorityFeePerGas =
    requirePositiveBigNumber(
      feeData.maxPriorityFeePerGas,
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

  return Object.freeze({
    unsignedTransactionIntentEvidence:
      evidence,

    transactionIntent,

    chainId:
      POLYGON_CHAIN_ID,

    nonce,

    maxFeePerGas,
    maxPriorityFeePerGas,

    currentTransactionParametersReady:
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
  acquireCurrentTransactionParameterEvidence
};
