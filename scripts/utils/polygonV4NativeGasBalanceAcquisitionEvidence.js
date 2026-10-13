"use strict";

const { ethers } = require("ethers");

const {
  validateNativeGasAffordabilityEvidence
} = require("./polygonV4NativeGasAffordabilityEvidence");

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(label + " must be an object");
  }
  return value;
}

async function acquireNativeGasBalanceEvidence({
  finalTransactionEconomicsEvidence,
  provider
} = {}) {
  const economics = requireObject(
    finalTransactionEconomicsEvidence,
    "Final transaction economics evidence"
  );

  if (economics.finalTransactionEconomicsReady !== true) {
    throw new Error("Final transaction economics must be ready");
  }

  if (
    economics.liveExecutionAuthorized !== false ||
    economics.signerAuthorized !== false ||
    economics.broadcastAuthorized !== false
  ) {
    throw new Error("Final economics must remain unauthorized");
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
    throw new Error("Invalid Polygon sender or chain");
  }

  const currentProvider = requireObject(
    provider,
    "Polygon provider"
  );

  if (
    typeof currentProvider.getNetwork !== "function" ||
    typeof currentProvider.getBalance !== "function"
  ) {
    throw new Error("Provider network and balance methods required");
  }

  const network = requireObject(
    await currentProvider.getNetwork(),
    "Provider network"
  );

  if (network.chainId !== 137) {
    throw new Error("Native balance provider must be Polygon chain 137");
  }

  const nativeBalanceWei = await currentProvider.getBalance(
    envelope.from,
    "pending"
  );

  if (
    !ethers.BigNumber.isBigNumber(nativeBalanceWei) ||
    nativeBalanceWei.lt(0)
  ) {
    throw new Error("Pending native balance must be nonnegative BigNumber");
  }

  const nativeBalanceEvidence = Object.freeze({
    chainId: 137,
    address: envelope.from,
    nativeBalanceWei,
    balanceSource: "PENDING_NATIVE_BALANCE",
    nativeBalanceReady: true
  });

  const nativeGasAffordabilityEvidence =
    validateNativeGasAffordabilityEvidence({
      finalTransactionEconomicsEvidence: economics,
      nativeBalanceEvidence
    });

  return Object.freeze({
    finalTransactionEconomicsEvidence: economics,
    nativeBalanceEvidence,
    nativeGasAffordabilityEvidence,
    nativeGasBalanceAcquisitionReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  });
}

module.exports = {
  acquireNativeGasBalanceEvidence
};
