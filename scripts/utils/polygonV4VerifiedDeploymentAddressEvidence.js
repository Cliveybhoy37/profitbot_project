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

function requireBytes32(value, label) {
  if (
    typeof value !== "string" ||
    !ethers.utils.isHexString(value, 32)
  ) {
    throw new Error(
      `${label} must be a bytes32 hash`
    );
  }

  return value;
}

function requirePositiveSafeInteger(value, label) {
  if (
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `${label} must be a positive safe integer`
    );
  }

  return value;
}

function buildVerifiedDeploymentAddressEvidence({
  deploymentProvenance
} = {}) {
  const provenance =
    requireObject(
      deploymentProvenance,
      "Deployment provenance"
    );

  const executorAddress =
    requireNonzeroAddress(
      provenance.executorAddress,
      "Executor address"
    );

  const deploymentTransactionHash =
    requireBytes32(
      provenance.deploymentTransactionHash,
      "Deployment transaction hash"
    );

  const deploymentBlock =
    requirePositiveSafeInteger(
      provenance.deploymentBlock,
      "Deployment block"
    );

  if (provenance.receiptStatus !== 1) {
    throw new Error(
      "Successful deployment receipt status required"
    );
  }

  const deploymentAddressEvidence =
    Object.freeze({
      executorAddress,
      deploymentTransactionHash,
      deploymentBlock,
      receiptStatus: provenance.receiptStatus
    });

  return Object.freeze({
    deploymentAddressEvidence,
    verifiedDeploymentAddressReady: true
  });
}

module.exports = {
  buildVerifiedDeploymentAddressEvidence
};
