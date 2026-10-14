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

function requireNonzeroAddress(value, label) {
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

function requireProvider(provider) {
  if (
    provider === null ||
    typeof provider !== "object" ||
    typeof provider.getCode !== "function"
  ) {
    throw new Error(
      "Provider with getCode required"
    );
  }

  return provider;
}

async function buildCurrentDeploymentCodeIdentityAcquisitionEvidence({
  deploymentAddressEvidence,
  provider
} = {}) {
  const addressEvidence =
    requireObject(
      deploymentAddressEvidence,
      "Deployment address evidence"
    );

  const executorAddress =
    requireNonzeroAddress(
      addressEvidence.executorAddress,
      "Executor address"
    );

  const currentProvider =
    requireProvider(provider);

  const runtimeBytecode =
    await currentProvider.getCode(
      executorAddress
    );

  if (
    typeof runtimeBytecode !== "string" ||
    !ethers.utils.isHexString(runtimeBytecode) ||
    runtimeBytecode === "0x"
  ) {
    throw new Error(
      "Executor has no deployed runtime bytecode"
    );
  }

  const deploymentEvidence =
    Object.freeze({
      executorAddress,
      executorCodeHash:
        ethers.utils.keccak256(runtimeBytecode)
    });

  return Object.freeze({
    deploymentEvidence,
    currentDeploymentCodeIdentityAcquisitionReady: true
  });
}

module.exports = {
  buildCurrentDeploymentCodeIdentityAcquisitionEvidence
};
