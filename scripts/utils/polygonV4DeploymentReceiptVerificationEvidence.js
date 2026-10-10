"use strict";

const { ethers } = require("ethers");

const POLYGON_CHAIN_ID = 137;
const ZERO_ADDRESS = ethers.constants.AddressZero;

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
  const address = ethers.utils.getAddress(value);
  if (address === ZERO_ADDRESS) {
    throw new Error(`${label} nonzero address required`);
  }
  return address;
}

function requireHash(value, label) {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(`${label} bytes32 hash required`);
  }
  return value.toLowerCase();
}

function requireInteger(value, label, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${label} safe integer >= ${minimum} required`);
  }
  return value;
}

function requireProvider(provider) {
  requireObject(provider, "Provider");
  for (const method of [
    "getNetwork",
    "getTransaction",
    "getTransactionReceipt",
    "getBlockNumber",
    "getBlock",
    "getCode"
  ]) {
    if (typeof provider[method] !== "function") {
      throw new Error(`Provider.${method} function required`);
    }
  }
  return provider;
}

async function verifyPolygonV4DeploymentReceiptEvidence({
  provider,
  deploymentProvenance,
  expectedRuntimeCodeHash,
  minimumConfirmations = 64
} = {}) {
  const currentProvider = requireProvider(provider);
  const provenance = requireObject(
    deploymentProvenance,
    "Deployment provenance"
  );

  const executorAddress = requireAddress(
    provenance.executorAddress,
    "Executor"
  );
  const deploymentTransactionHash = requireHash(
    provenance.deploymentTransactionHash,
    "Deployment transaction"
  );
  const deploymentBlock = requireInteger(
    provenance.deploymentBlock,
    "Deployment block",
    1
  );
  if (provenance.receiptStatus !== 1) {
    throw new Error("Successful deployment receipt status required");
  }

  const trustedCodeHash = requireHash(
    expectedRuntimeCodeHash,
    "Independently trusted expected runtime code"
  );
  requireInteger(minimumConfirmations, "Minimum confirmations", 1);

  const network = requireObject(
    await currentProvider.getNetwork(),
    "Provider network"
  );
  if (network.chainId !== POLYGON_CHAIN_ID) {
    throw new Error("Polygon chain ID 137 required");
  }

  const transaction = await currentProvider.getTransaction(
    deploymentTransactionHash
  );
  if (!transaction) {
    throw new Error("Deployment transaction not found");
  }
  requireObject(transaction, "Deployment transaction");

  if (
    requireHash(transaction.hash, "Transaction hash") !==
    deploymentTransactionHash
  ) {
    throw new Error("Deployment transaction hash mismatch");
  }
  if (transaction.to !== null) {
    throw new Error("Direct contract-creation transaction required");
  }
  if (
    requireInteger(
      transaction.blockNumber,
      "Transaction block",
      1
    ) !== deploymentBlock
  ) {
    throw new Error("Deployment transaction block mismatch");
  }

  const receipt = await currentProvider.getTransactionReceipt(
    deploymentTransactionHash
  );
  if (!receipt) {
    throw new Error("Deployment receipt not found");
  }
  requireObject(receipt, "Deployment receipt");

  if (receipt.status !== 1) {
    throw new Error("Successful deployment receipt required");
  }
  if (
    requireHash(receipt.transactionHash, "Receipt transaction hash") !==
    deploymentTransactionHash
  ) {
    throw new Error("Deployment receipt transaction hash mismatch");
  }
  if (
    requireInteger(receipt.blockNumber, "Receipt block", 1) !==
    deploymentBlock
  ) {
    throw new Error("Deployment receipt block mismatch");
  }
  if (
    requireAddress(receipt.contractAddress, "Receipt contract") !==
    executorAddress
  ) {
    throw new Error("Deployment receipt contract address mismatch");
  }

  const transactionBlockHash = requireHash(
    transaction.blockHash,
    "Transaction block"
  );
  const receiptBlockHash = requireHash(
    receipt.blockHash,
    "Receipt block"
  );
  if (transactionBlockHash !== receiptBlockHash) {
    throw new Error("Transaction and receipt block hashes mismatch");
  }

  const deploymentBlockData = await currentProvider.getBlock(
    deploymentBlock
  );
  requireObject(deploymentBlockData, "Canonical deployment block");
  if (
    requireInteger(
      deploymentBlockData.number,
      "Canonical deployment block number",
      1
    ) !== deploymentBlock ||
    requireHash(
      deploymentBlockData.hash,
      "Canonical deployment block hash"
    ) !== receiptBlockHash
  ) {
    throw new Error("Canonical deployment block mismatch");
  }

  const observationBlock = requireInteger(
    await currentProvider.getBlockNumber(),
    "Observation block",
    1
  );
  if (observationBlock < deploymentBlock) {
    throw new Error("Observation block precedes deployment");
  }

  const confirmations = observationBlock - deploymentBlock + 1;
  if (confirmations < minimumConfirmations) {
    throw new Error("Insufficient deployment confirmations");
  }

  const observationBlockData = await currentProvider.getBlock(
    observationBlock
  );
  requireObject(observationBlockData, "Observation block data");
  if (
    requireInteger(
      observationBlockData.number,
      "Observation block number",
      1
    ) !== observationBlock
  ) {
    throw new Error("Observation block number mismatch");
  }
  const observationBlockHash = requireHash(
    observationBlockData.hash,
    "Observation block hash"
  );

  const code = await currentProvider.getCode(
    executorAddress,
    observationBlock
  );
  if (
    typeof code !== "string" ||
    !/^0x(?:[0-9a-fA-F]{2})+$/.test(code)
  ) {
    throw new Error("Nonempty deployed executor bytecode required");
  }

  const executorCodeHash = ethers.utils.keccak256(code).toLowerCase();
  if (executorCodeHash !== trustedCodeHash) {
    throw new Error("Deployed executor runtime code hash mismatch");
  }

  // Recheck the canonical deployment block after the code read.
  const finalDeploymentBlock = await currentProvider.getBlock(
    deploymentBlock
  );
  requireObject(finalDeploymentBlock, "Final deployment block");
  if (
    requireHash(
      finalDeploymentBlock.hash,
      "Final deployment block hash"
    ) !== receiptBlockHash
  ) {
    throw new Error("Deployment block changed during verification");
  }

  const finalObservationBlock = await currentProvider.getBlock(
    observationBlock
  );
  requireObject(finalObservationBlock, "Final observation block");
  if (
    requireHash(
      finalObservationBlock.hash,
      "Final observation block hash"
    ) !== observationBlockHash
  ) {
    throw new Error("Observation block changed during verification");
  }

  return Object.freeze({
    deploymentReceiptVerified: true,
    chainId: POLYGON_CHAIN_ID,
    executorAddress,
    deploymentTransactionHash,
    deploymentBlock,
    deploymentBlockHash: receiptBlockHash,
    observationBlock,
    observationBlockHash,
    confirmations,
    executorCodeHash,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  });
}

module.exports = {
  verifyPolygonV4DeploymentReceiptEvidence
};
