"use strict";

const { ethers } = require("ethers");

const {
  buildPolygonV4DeploymentConfigurationVerificationCompositionEvidence
} = require("./polygonV4DeploymentConfigurationVerificationCompositionEvidence");

const {
  buildPolygonV4ReadOnlyOrchestration
} = require("./polygonV4ReadOnlyOrchestration");

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

  const address = ethers.utils.getAddress(value);

  if (address === ethers.constants.AddressZero) {
    throw new Error(`${label} nonzero address required`);
  }

  return address;
}

function requireHash(value, label) {
  if (typeof value !== "string" || !HASH.test(value)) {
    throw new Error(`${label} bytes32 hash required`);
  }

  return value.toLowerCase();
}

function sameAddress(left, right, label) {
  if (
    requireAddress(left, `${label} left`) !==
    requireAddress(right, `${label} right`)
  ) {
    throw new Error(`${label} mismatch`);
  }
}

function sameHash(left, right, label) {
  if (
    requireHash(left, `${label} left`) !==
    requireHash(right, `${label} right`)
  ) {
    throw new Error(`${label} mismatch`);
  }
}

function requireReady(value, key, label) {
  requireObject(value, label);

  if (value[key] !== true) {
    throw new Error(`${label} must be ready`);
  }

  return value;
}

function requireUnauthorized(value, label) {
  requireObject(value, label);

  for (const field of [
    "liveExecutionAuthorized",
    "signerAuthorized",
    "broadcastAuthorized"
  ]) {
    if (value[field] !== false) {
      throw new Error(`${label}.${field} must be false`);
    }
  }
}

function requireExactUnsignedTransaction(transaction) {
  requireObject(transaction, "Unsigned transaction");

  const expected = ["data", "from", "to", "value"];
  const actual = Object.keys(transaction).sort();

  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new Error("Unsigned transaction must have exactly four safe fields");
  }

  if (
    typeof transaction.data !== "string" ||
    !ethers.utils.isHexString(transaction.data) ||
    transaction.data === "0x"
  ) {
    throw new Error("Unsigned transaction data must be nonempty hex");
  }

  if (
    !ethers.BigNumber.isBigNumber(transaction.value) ||
    !transaction.value.eq(0)
  ) {
    throw new Error("Unsigned transaction value must be zero");
  }
}

async function buildPolygonV4VerifiedReadOnlyOrchestrationCompositionEvidence({
  lifecycleResult,
  provider,
  deploymentProvenance,
  expectedRuntimeCodeHash,
  expectedOwnerAddress,
  expectedAavePoolAddress,
  minimumConfirmations = 64,
  getCallerAddress,
  getExecutorOwner
} = {}) {
  requireObject(lifecycleResult, "Completed lifecycle result");
  requireObject(provider, "Read-only provider");
  requireObject(deploymentProvenance, "Deployment provenance");

  const trustedCodeHash = requireHash(
    expectedRuntimeCodeHash,
    "Trusted runtime code hash"
  );
  const trustedOwner = requireAddress(
    expectedOwnerAddress,
    "Trusted executor owner"
  );
  const trustedPool = requireAddress(
    expectedAavePoolAddress,
    "Trusted Aave pool"
  );

  if (
    !Number.isSafeInteger(minimumConfirmations) ||
    minimumConfirmations < 1
  ) {
    throw new Error("Minimum confirmations positive safe integer required");
  }

  if (
    typeof getCallerAddress !== "function" ||
    typeof getExecutorOwner !== "function"
  ) {
    throw new Error("Read-only account callbacks required");
  }

  // Verification must be derived from actual provider reads.
  // Caller-supplied claims of verification are never accepted.
  const verification =
    await buildPolygonV4DeploymentConfigurationVerificationCompositionEvidence({
      provider,
      deploymentProvenance,
      expectedRuntimeCodeHash: trustedCodeHash,
      expectedOwnerAddress: trustedOwner,
      expectedAavePoolAddress: trustedPool,
      minimumConfirmations
    });

  requireReady(
    verification,
    "deploymentConfigurationVerified",
    "Deployment/configuration verification"
  );
  requireUnauthorized(verification, "Deployment/configuration verification");

  if (
    verification.chainId !== CHAIN_ID ||
    verification.deploymentReceiptVerified !== true ||
    verification.executorConfigurationVerified !== true
  ) {
    throw new Error("Complete Polygon deployment verification required");
  }

  sameAddress(
    verification.executorAddress,
    deploymentProvenance.executorAddress,
    "Verified deployment provenance executor"
  );
  sameAddress(
    verification.executorOwnerAddress,
    trustedOwner,
    "Verified owner"
  );
  sameAddress(
    verification.aavePoolAddress,
    trustedPool,
    "Verified Aave pool"
  );
  sameHash(
    verification.executorCodeHash,
    trustedCodeHash,
    "Verified runtime code"
  );

  // Existing orchestration remains unchanged and independently fail-closed.
  const orchestration = await buildPolygonV4ReadOnlyOrchestration({
    lifecycleResult,
    provider,
    deploymentProvenance,
    getCallerAddress,
    getExecutorOwner
  });

  requireReady(
    orchestration,
    "readOnlyOrchestrationReady",
    "Read-only orchestration"
  );
  requireUnauthorized(orchestration, "Read-only orchestration");

  const chainAcquisition = requireReady(
    orchestration.currentChainIdentityAcquisitionEvidence,
    "currentChainIdentityAcquisitionReady",
    "Current chain acquisition"
  );

  if (
    requireObject(chainAcquisition.chainEvidence, "Current chain evidence")
      .chainId !== CHAIN_ID
  ) {
    throw new Error("Current chain identity mismatch");
  }

  const provenanceEvidence = requireReady(
    orchestration.verifiedDeploymentAddressEvidence,
    "verifiedDeploymentAddressReady",
    "Deployment address evidence"
  );

  sameAddress(
    verification.executorAddress,
    requireObject(
      provenanceEvidence.deploymentAddressEvidence,
      "Deployment address identity"
    ).executorAddress,
    "Deployment address lineage"
  );

  const currentAcquisition = requireReady(
    orchestration.currentDeploymentCodeIdentityAcquisitionEvidence,
    "currentDeploymentCodeIdentityAcquisitionReady",
    "Current deployment code acquisition"
  );

  const currentStateComposition = requireReady(
    orchestration.currentStateEvidenceComposition,
    "currentStateEvidenceCompositionReady",
    "Current-state composition"
  );

  const currentState = requireObject(
    currentStateComposition.currentStateEvidence,
    "Current-state evidence"
  );

  const currentDeployment = requireObject(
    currentState.deploymentEvidence,
    "Current-state deployment evidence"
  );

  if (
    currentAcquisition.deploymentEvidence !== currentDeployment
  ) {
    throw new Error("Current deployment evidence lineage mismatch");
  }

  sameAddress(
    verification.executorAddress,
    currentDeployment.executorAddress,
    "Current-state executor"
  );
  sameHash(
    verification.executorCodeHash,
    currentDeployment.executorCodeHash,
    "Current-state runtime code"
  );

  const readiness = requireReady(
    orchestration.readinessEvidence,
    "executionEvidenceReady",
    "Execution readiness"
  );
  requireUnauthorized(readiness, "Execution readiness");

  const measuredExecutor = requireObject(
    requireObject(readiness.gasEvidence, "Gas evidence").executorContext,
    "Measured executor context"
  );

  if (measuredExecutor.executorAddress !== undefined) {
    sameAddress(
      verification.executorAddress,
      measuredExecutor.executorAddress,
      "Measured executor"
    );
  }

  sameHash(
    verification.executorCodeHash,
    measuredExecutor.executorCodeHash,
    "Measured runtime code"
  );

  const handoff = requireReady(
    orchestration.readOnlyExecutionHandoffComposition,
    "readOnlyExecutionHandoffReady",
    "Read-only handoff"
  );
  requireUnauthorized(handoff, "Read-only handoff");

  if (
    handoff.readinessEvidence !== readiness ||
    handoff.currentStateEvidenceComposition !== currentStateComposition
  ) {
    throw new Error("Read-only handoff lineage mismatch");
  }

  const accountAcquisitionComposition = requireReady(
    handoff.deployedAccountIdentityAcquisitionCompositionEvidence,
    "deployedAccountIdentityAcquisitionCompositionReady",
    "Account acquisition composition"
  );

  const accountAcquisition = requireReady(
    accountAcquisitionComposition.deployedAccountIdentityAcquisitionEvidence,
    "deployedAccountIdentityAcquisitionReady",
    "Account acquisition"
  );
  requireUnauthorized(accountAcquisition, "Account acquisition");

  const account = requireObject(
    accountAcquisition.accountIdentityEvidence,
    "Acquired account identity"
  );

  const accountComposition = requireReady(
    handoff.accountCallerIdentityCompositionEvidence,
    "accountCallerIdentityCompositionReady",
    "Account/caller composition"
  );

  const accountCaller = requireReady(
    accountComposition.accountCallerIdentityEvidence,
    "accountCallerIdentityReady",
    "Account/caller identity"
  );
  requireUnauthorized(accountCaller, "Account/caller identity");

  if (accountCaller.accountIdentityEvidence !== account) {
    throw new Error("Account identity evidence lineage mismatch");
  }

  const unsignedComposition = requireReady(
    handoff.unsignedExactTransactionIntentCompositionEvidence,
    "unsignedExactTransactionIntentCompositionReady",
    "Unsigned transaction composition"
  );

  const unsigned = requireReady(
    orchestration.unsignedTransactionIntentEvidence,
    "unsignedTransactionIntentReady",
    "Unsigned transaction intent"
  );
  requireUnauthorized(unsigned, "Unsigned transaction intent");

  if (
    unsignedComposition.unsignedTransactionIntentEvidence !== unsigned ||
    handoff.unsignedTransactionIntentEvidence !== unsigned ||
    unsigned.accountCallerIdentityEvidence !== accountCaller
  ) {
    throw new Error("Unsigned transaction evidence lineage mismatch");
  }

  sameAddress(
    verification.executorAddress,
    account.executorAddress,
    "Account executor"
  );
  sameAddress(
    verification.executorOwnerAddress,
    account.ownerAddress,
    "Account owner"
  );
  sameAddress(
    verification.executorOwnerAddress,
    account.callerAddress,
    "Account caller"
  );

  const transaction = unsigned.transactionIntent;
  requireExactUnsignedTransaction(transaction);

  sameAddress(
    verification.executorAddress,
    transaction.to,
    "Unsigned transaction destination"
  );
  sameAddress(
    verification.executorOwnerAddress,
    transaction.from,
    "Unsigned transaction sender"
  );

  // Verification is pinned to observationBlock/observationBlockHash.
  // Orchestration performs separate latest-state reads. No atomic snapshot
  // or live-execution authorization is implied by their agreement.
  return Object.freeze({
    deploymentConfigurationVerificationEvidence: verification,
    readOnlyOrchestrationEvidence: orchestration,
    unsignedTransactionIntentEvidence: unsigned,
    verificationObservationBlock: verification.observationBlock,
    verificationObservationBlockHash: verification.observationBlockHash,
    observationsAreAtomic: false,
    verifiedReadOnlyOrchestrationReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  });
}

module.exports = {
  buildPolygonV4VerifiedReadOnlyOrchestrationCompositionEvidence
};
