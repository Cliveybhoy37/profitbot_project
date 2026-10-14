"use strict";

const { ethers } = require("ethers");

const CHAIN_ID = 137;
const ZERO = ethers.constants.AddressZero;
const HASH_RE = /^0x[0-9a-fA-F]{64}$/;

const READ_ABI = new ethers.utils.Interface([
  "function owner() view returns (address)",
  "function AAVE_POOL() view returns (address)"
]);

function fail(message) {
  throw new Error(message);
}

function address(value, label) {
  if (typeof value !== "string" || !ethers.utils.isAddress(value)) {
    fail(`${label} must be a valid address`);
  }

  const normalized = ethers.utils.getAddress(value);

  if (normalized === ZERO) {
    fail(`${label} must be nonzero`);
  }

  return normalized;
}

function hash(value, label) {
  if (typeof value !== "string" || !HASH_RE.test(value)) {
    fail(`${label} must be a 32-byte hash`);
  }

  return value.toLowerCase();
}

function blockNumber(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) {
    fail(`${label} must be a positive safe integer`);
  }

  return value;
}

function providerMethod(provider, method) {
  if (
    !provider ||
    typeof provider !== "object" ||
    typeof provider[method] !== "function"
  ) {
    fail(`Provider ${method} required`);
  }
}

function decodeAddress(method, result) {
  if (
    typeof result !== "string" ||
    !/^0x[0-9a-fA-F]*$/.test(result) ||
    result.length !== 66
  ) {
    fail(`${method} returned malformed ABI data`);
  }

  let decoded;

  try {
    decoded = READ_ABI.decodeFunctionResult(method, result)[0];
  } catch (_) {
    fail(`${method} returned malformed ABI data`);
  }

  return address(decoded, `${method} result`);
}

async function verifyPolygonV4ExecutorConfigurationEvidence({
  provider,
  verifiedDeploymentEvidence,
  expectedOwnerAddress,
  expectedAavePoolAddress,
  expectedRuntimeCodeHash
} = {}) {
  for (const method of ["getNetwork", "getBlock", "getCode", "call"]) {
    providerMethod(provider, method);
  }

  if (
    !verifiedDeploymentEvidence ||
    typeof verifiedDeploymentEvidence !== "object" ||
    verifiedDeploymentEvidence.deploymentReceiptVerified !== true ||
    verifiedDeploymentEvidence.chainId !== CHAIN_ID ||
    verifiedDeploymentEvidence.liveExecutionAuthorized !== false ||
    verifiedDeploymentEvidence.signerAuthorized !== false ||
    verifiedDeploymentEvidence.broadcastAuthorized !== false
  ) {
    fail("Verified deployment evidence required");
  }

  const executorAddress = address(
    verifiedDeploymentEvidence.executorAddress,
    "Executor address"
  );

  const observationBlock = blockNumber(
    verifiedDeploymentEvidence.observationBlock,
    "Observation block"
  );

  const observationBlockHash = hash(
    verifiedDeploymentEvidence.observationBlockHash,
    "Observation block hash"
  );

  const evidenceCodeHash = hash(
    verifiedDeploymentEvidence.executorCodeHash,
    "Deployment evidence code hash"
  );

  const trustedCodeHash = hash(
    expectedRuntimeCodeHash,
    "Independently trusted runtime code hash"
  );

  if (evidenceCodeHash !== trustedCodeHash) {
    fail("Deployment evidence runtime code hash mismatch");
  }

  const expectedOwner = address(
    expectedOwnerAddress,
    "Expected owner"
  );

  const expectedPool = address(
    expectedAavePoolAddress,
    "Expected Aave pool"
  );

  const network = await provider.getNetwork();

  if (
    !network ||
    Number(network.chainId) !== CHAIN_ID
  ) {
    fail("Polygon chain ID mismatch");
  }

  async function checkObservationBlock() {
    const block = await provider.getBlock(observationBlock);

    if (
      !block ||
      block.number !== observationBlock ||
      hash(block.hash, "Observed block hash") !== observationBlockHash
    ) {
      fail("Observation block identity mismatch");
    }
  }

  await checkObservationBlock();

  const code = await provider.getCode(
    executorAddress,
    observationBlock
  );

  if (
    typeof code !== "string" ||
    !/^0x(?:[0-9a-fA-F]{2})+$/.test(code)
  ) {
    fail("Executor runtime code missing or malformed");
  }

  const executorCodeHash = ethers.utils.keccak256(code);

  if (executorCodeHash.toLowerCase() !== trustedCodeHash) {
    fail("Executor runtime code hash mismatch");
  }

  async function readAddress(method) {
    const result = await provider.call(
      {
        to: executorAddress,
        data: READ_ABI.encodeFunctionData(method)
      },
      observationBlock
    );

    return decodeAddress(method, result);
  }

  const executorOwnerAddress = await readAddress("owner");
  const aavePoolAddress = await readAddress("AAVE_POOL");

  if (executorOwnerAddress !== expectedOwner) {
    fail("Executor owner mismatch");
  }

  if (aavePoolAddress !== expectedPool) {
    fail("Executor Aave pool mismatch");
  }

  await checkObservationBlock();

  return Object.freeze({
    executorConfigurationVerified: true,
    chainId: CHAIN_ID,
    executorAddress,
    observationBlock,
    observationBlockHash,
    executorCodeHash,
    executorOwnerAddress,
    aavePoolAddress,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  });
}

module.exports = {
  verifyPolygonV4ExecutorConfigurationEvidence
};
