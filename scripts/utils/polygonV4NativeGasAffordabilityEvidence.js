"use strict";

const { ethers } = require("ethers");

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(label + " must be an object");
  }
  return value;
}

function requireAmount(value, label, allowZero = false) {
  if (
    !ethers.BigNumber.isBigNumber(value) ||
    (allowZero ? value.lt(0) : value.lte(0))
  ) {
    throw new Error(label + " must be a valid nonnegative amount");
  }
  return value;
}

function validateNativeGasAffordabilityEvidence({
  finalTransactionEconomicsEvidence,
  nativeBalanceEvidence
} = {}) {
  const economics = requireObject(
    finalTransactionEconomicsEvidence,
    "Final transaction economics evidence"
  );

  if (economics.finalTransactionEconomicsReady !== true) {
    throw new Error("Final transaction economics must be ready");
  }

  for (const key of [
    "liveExecutionAuthorized",
    "signerAuthorized",
    "broadcastAuthorized"
  ]) {
    if (economics[key] !== false) {
      throw new Error("Economics evidence must remain unauthorized");
    }
  }

  const envelope = requireObject(
    economics.transactionEnvelope,
    "Exact transaction envelope"
  );

  if (
    envelope.chainId !== 137 ||
    !ethers.utils.isAddress(envelope.from) ||
    envelope.from === ethers.constants.AddressZero
  ) {
    throw new Error("Invalid Polygon transaction sender or chain");
  }

  const gasLimit = requireAmount(
    envelope.gasLimit,
    "Exact gas limit"
  );

  const maxFeePerGas = requireAmount(
    envelope.maxFeePerGas,
    "Exact maximum gas fee"
  );

  const nativeValue = requireAmount(
    envelope.value,
    "Native transaction value",
    true
  );

  const balance = requireObject(
    nativeBalanceEvidence,
    "Native balance evidence"
  );

  if (
    balance.chainId !== 137 ||
    !ethers.utils.isAddress(balance.address) ||
    ethers.utils.getAddress(balance.address) !==
      ethers.utils.getAddress(envelope.from)
  ) {
    throw new Error("Native balance sender or chain mismatch");
  }

  if (
    balance.balanceSource !== "PENDING_NATIVE_BALANCE" ||
    balance.nativeBalanceReady !== true
  ) {
    throw new Error("Native balance provenance must be pending");
  }

  const nativeBalanceWei = requireAmount(
    balance.nativeBalanceWei,
    "Native POL balance",
    true
  );

  const maximumGasExposure = gasLimit.mul(maxFeePerGas);

  if (
    !ethers.BigNumber.isBigNumber(economics.maximumGasExposure) ||
    !maximumGasExposure.eq(economics.maximumGasExposure)
  ) {
    throw new Error("Maximum gas exposure evidence mismatch");
  }

  const maximumNativeExposure =
    maximumGasExposure.add(nativeValue);

  if (nativeBalanceWei.lt(maximumNativeExposure)) {
    throw new Error(
      "Insufficient native POL for maximum transaction exposure"
    );
  }

  return Object.freeze({
    finalTransactionEconomicsEvidence: economics,
    nativeBalanceEvidence: balance,
    transactionEnvelope: envelope,
    maximumNativeExposure,
    nativeBalanceWei,
    nativeGasAffordabilityReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  });
}

module.exports = {
  validateNativeGasAffordabilityEvidence
};
