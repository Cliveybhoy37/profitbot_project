"use strict";

const { ethers } = require("ethers");
const {
  verifyPolygonV4DeploymentReceiptEvidence
} = require("./polygonV4DeploymentReceiptVerificationEvidence");
const {
  verifyPolygonV4ExecutorConfigurationEvidence
} = require("./polygonV4ExecutorConfigurationVerificationEvidence");

const CHAIN_ID = 137;
const HASH = /^0x[0-9a-fA-F]{64}$/;

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} object required`);
  }
  return value;
}

function requireAddress(value, label) {
  if (typeof value !== "string" || !ethers.utils.isAddress(value)) {
    throw new Error(`${label} valid address required`);
  }
  const result = ethers.utils.getAddress(value);
  if (result === ethers.constants.AddressZero) {
    throw new Error(`${label} nonzero address required`);
  }
  return result;
}

function requireHash(value, label) {
  if (typeof value !== "string" || !HASH.test(value)) {
    throw new Error(`${label} bytes32 hash required`);
  }
  return value.toLowerCase();
}

function requireBlock(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${label} positive safe integer required`);
  }
  return value;
}

function requireFalseFlags(evidence, label) {
  for (const key of [
    "liveExecutionAuthorized",
    "signerAuthorized",
    "broadcastAuthorized"
  ]) {
    if (evidence[key] !== false) {
      throw new Error(`${label}.${key} must be false`);
    }
  }
}

async function buildPolygonV4DeploymentConfigurationVerificationCompositionEvidence({
  provider,
  deploymentProvenance,
  expectedRuntimeCodeHash,
  expectedOwnerAddress,
  expectedAavePoolAddress,
  minimumConfirmations = 64
} = {}) {
  if (!provider ||
      typeof provider.getNetwork !== "function" ||
      typeof provider.getTransaction !== "function" ||
      typeof provider.getTransactionReceipt !== "function" ||
      typeof provider.getBlockNumber !== "function" ||
      typeof provider.getBlock !== "function" ||
      typeof provider.getCode !== "function" ||
      typeof provider.call !== "function") {
    throw new Error("Read-only verification provider methods required");
  }

  requireObject(deploymentProvenance, "Deployment provenance");
  const trustedCodeHash = requireHash(
    expectedRuntimeCodeHash,
    "Trusted runtime code hash"
  );
  const trustedOwner = requireAddress(
    expectedOwnerAddress,
    "Trusted expected owner"
  );
  const trustedPool = requireAddress(
    expectedAavePoolAddress,
    "Trusted expected Aave pool"
  );

  if (!Number.isSafeInteger(minimumConfirmations) ||
      minimumConfirmations < 1) {
    throw new Error("Minimum confirmations positive safe integer required");
  }

  // The caller cannot inject a self-declared verified receipt result.
  const deployment = await verifyPolygonV4DeploymentReceiptEvidence({
    provider,
    deploymentProvenance,
    expectedRuntimeCodeHash: trustedCodeHash,
    minimumConfirmations
  });

  requireObject(deployment, "Deployment verification result");
  if (deployment.deploymentReceiptVerified !== true ||
      deployment.chainId !== CHAIN_ID) {
    throw new Error("Deployment receipt verification required");
  }
  requireFalseFlags(deployment, "Deployment evidence");

  // Use the actual deployment verifier result, never caller-supplied evidence.
  const configuration = await verifyPolygonV4ExecutorConfigurationEvidence({
    provider,
    verifiedDeploymentEvidence: deployment,
    expectedOwnerAddress: trustedOwner,
    expectedAavePoolAddress: trustedPool,
    expectedRuntimeCodeHash: trustedCodeHash
  });

  requireObject(configuration, "Configuration verification result");
  if (configuration.executorConfigurationVerified !== true ||
      configuration.chainId !== CHAIN_ID) {
    throw new Error("Executor configuration verification required");
  }
  requireFalseFlags(configuration, "Configuration evidence");

  const deploymentAddress = requireAddress(
    deployment.executorAddress,
    "Deployment executor"
  );
  const configurationAddress = requireAddress(
    configuration.executorAddress,
    "Configuration executor"
  );
  if (deploymentAddress !== configurationAddress) {
    throw new Error("Executor address verification disagreement");
  }

  const deploymentBlock = requireBlock(
    deployment.observationBlock,
    "Deployment observation block"
  );
  const configurationBlock = requireBlock(
    configuration.observationBlock,
    "Configuration observation block"
  );
  if (deploymentBlock !== configurationBlock) {
    throw new Error("Observation block verification disagreement");
  }

  const deploymentBlockHash = requireHash(
    deployment.observationBlockHash,
    "Deployment observation block hash"
  );
  const configurationBlockHash = requireHash(
    configuration.observationBlockHash,
    "Configuration observation block hash"
  );
  if (deploymentBlockHash !== configurationBlockHash) {
    throw new Error("Observation block hash verification disagreement");
  }

  const deploymentCodeHash = requireHash(
    deployment.executorCodeHash,
    "Deployment runtime code hash"
  );
  const configurationCodeHash = requireHash(
    configuration.executorCodeHash,
    "Configuration runtime code hash"
  );
  if (deploymentCodeHash !== configurationCodeHash ||
      deploymentCodeHash !== trustedCodeHash) {
    throw new Error("Runtime code verification disagreement");
  }

  const verifiedOwner = requireAddress(
    configuration.executorOwnerAddress,
    "Verified executor owner"
  );
  const verifiedPool = requireAddress(
    configuration.aavePoolAddress,
    "Verified Aave pool"
  );
  if (verifiedOwner !== trustedOwner || verifiedPool !== trustedPool) {
    throw new Error("Executor configuration identity disagreement");
  }

  if (!Number.isSafeInteger(deployment.confirmations) ||
      deployment.confirmations < minimumConfirmations) {
    throw new Error("Deployment confirmation threshold not met");
  }

  // Final block-identity check after both verification stages.
  const finalBlock = await provider.getBlock(deploymentBlock);
  if (!finalBlock ||
      finalBlock.number !== deploymentBlock ||
      requireHash(finalBlock.hash, "Final observation block hash") !==
        deploymentBlockHash) {
    throw new Error("Final observation block identity mismatch");
  }

  return Object.freeze({
    deploymentConfigurationVerified: true,
    deploymentReceiptVerified: true,
    executorConfigurationVerified: true,
    chainId: CHAIN_ID,
    executorAddress: deploymentAddress,
    deploymentTransactionHash: requireHash(
      deployment.deploymentTransactionHash,
      "Deployment transaction hash"
    ),
    deploymentBlock: requireBlock(
      deployment.deploymentBlock,
      "Deployment block"
    ),
    deploymentBlockHash: requireHash(
      deployment.deploymentBlockHash,
      "Deployment block hash"
    ),
    observationBlock: deploymentBlock,
    observationBlockHash: deploymentBlockHash,
    confirmations: deployment.confirmations,
    executorCodeHash: deploymentCodeHash,
    executorOwnerAddress: verifiedOwner,
    aavePoolAddress: verifiedPool,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  });
}

module.exports = {
  buildPolygonV4DeploymentConfigurationVerificationCompositionEvidence
};
