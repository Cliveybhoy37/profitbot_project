"use strict";

const { ethers } = require("ethers");

const POLYGON_CHAIN_ID = 137;
const EXECUTOR_ABI = [
  "function initiateFlashloan(address token,uint256 amount,bytes params)"
];

function requireObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(`${label} object required`);
  }
  return value;
}

function requireHash(value, label) {
  if (
    typeof value !== "string" ||
    !ethers.utils.isHexString(value, 32)
  ) {
    throw new Error(`${label} must be a bytes32 hash`);
  }
  return value;
}

function sameHex(left, right) {
  return (
    typeof left === "string" &&
    typeof right === "string" &&
    left.toLowerCase() === right.toLowerCase()
  );
}

function sameAddress(left, right) {
  return (
    typeof left === "string" &&
    typeof right === "string" &&
    ethers.utils.isAddress(left) &&
    ethers.utils.isAddress(right) &&
    left.toLowerCase() === right.toLowerCase()
  );
}

function requireEqualBigNumber(left, right, label) {
  if (
    !ethers.BigNumber.isBigNumber(left) ||
    !ethers.BigNumber.isBigNumber(right) ||
    !left.eq(right)
  ) {
    throw new Error(`${label} mismatch`);
  }
}

function buildLiveReceiptGasMeasurementEvidence({
  transactionSigningEvidence,
  unsignedTransactionIntentEvidence,
  receiptObservationEvidence
} = {}) {
  const signing = requireObject(
    transactionSigningEvidence,
    "Transaction signing evidence"
  );
  const unsigned = requireObject(
    unsignedTransactionIntentEvidence,
    "Unsigned transaction intent evidence"
  );
  const observation = requireObject(
    receiptObservationEvidence,
    "Receipt observation evidence"
  );

  if (
    signing.transactionSigningReady !== true ||
    unsigned.unsignedTransactionIntentReady !== true ||
    observation.readOnlyTransactionReceiptObservationReady !== true
  ) {
    throw new Error("Required evidence is not ready");
  }

  if (
    signing.signerAuthorized !== true ||
    signing.signingAuthorized !== true ||
    signing.liveExecutionAuthorized !== false ||
    signing.broadcastAuthorized !== false ||
    unsigned.liveExecutionAuthorized !== false ||
    unsigned.signerAuthorized !== false ||
    unsigned.broadcastAuthorized !== false
  ) {
    throw new Error("Unexpected upstream authorization state");
  }

  if (
    observation.chainId !== POLYGON_CHAIN_ID
  ) {
    throw new Error("Polygon receipt observation required");
  }

  const raw = signing.signedRawTransaction;

  if (
    typeof raw !== "string" ||
    !ethers.utils.isHexString(raw) ||
    ethers.utils.hexDataLength(raw) === 0
  ) {
    throw new Error("Valid signed raw transaction required");
  }

  const hash = ethers.utils.keccak256(raw);
  const declaredHash = requireHash(
    signing.signedTransactionHash,
    "Signed transaction hash"
  );

  if (
    !sameHex(hash, declaredHash) ||
    !sameHex(hash, observation.signedTransactionHash)
  ) {
    throw new Error("Signed transaction hash mismatch");
  }

  const receipt = requireObject(
    observation.receipt,
    "Observed receipt"
  );

  if (
    !sameHex(hash, receipt.transactionHash) ||
    receipt.status !== 1
  ) {
    throw new Error("Successful matching receipt required");
  }

  if (
    !ethers.BigNumber.isBigNumber(receipt.gasUsed) ||
    !receipt.gasUsed.gt(0) ||
    !ethers.BigNumber.isBigNumber(observation.gasUsed) ||
    !observation.gasUsed.eq(receipt.gasUsed)
  ) {
    throw new Error("Receipt gasUsed mismatch");
  }

  if (
    !Number.isSafeInteger(observation.receiptBlockNumber) ||
    observation.receiptBlockNumber <= 0 ||
    !ethers.utils.isHexString(observation.receiptBlockHash, 32) ||
    receipt.blockNumber !== observation.receiptBlockNumber ||
    !sameHex(receipt.blockHash, observation.receiptBlockHash)
  ) {
    throw new Error("Receipt block identity mismatch");
  }

  if (
    !Number.isSafeInteger(observation.minimumConfirmations) ||
    observation.minimumConfirmations <= 0 ||
    !Number.isSafeInteger(observation.observedHead) ||
    observation.observedHead < observation.receiptBlockNumber ||
    !Number.isSafeInteger(observation.confirmations) ||
    observation.confirmations <= 0 ||
    !Number.isSafeInteger(
      observation.observedHead - observation.receiptBlockNumber + 1
    ) ||
    observation.confirmations !==
      observation.observedHead - observation.receiptBlockNumber + 1 ||
    observation.confirmations < observation.minimumConfirmations
  ) {
    throw new Error("Receipt confirmation evidence mismatch");
  }

  const parsed = ethers.utils.parseTransaction(raw);
  const envelope = requireObject(
    signing.transactionEnvelope,
    "Authorized transaction envelope"
  );
  const intent = requireObject(
    unsigned.transactionIntent,
    "Unsigned transaction intent"
  );

  if (
    parsed.type !== 2 ||
    parsed.chainId !== POLYGON_CHAIN_ID ||
    envelope.chainId !== POLYGON_CHAIN_ID ||
    parsed.nonce !== envelope.nonce ||
    !sameAddress(parsed.from, envelope.from) ||
    !sameAddress(parsed.from, signing.signerAddress) ||
    !sameAddress(parsed.from, signing.signerCapabilityAddress) ||
    !sameAddress(parsed.to, envelope.to) ||
    !sameAddress(parsed.to, intent.to) ||
    !sameAddress(intent.from, envelope.from) ||
    parsed.data !== envelope.data ||
    parsed.data !== intent.data ||
    !Array.isArray(parsed.accessList) ||
    parsed.accessList.length !== 0
  ) {
    throw new Error("Signed transaction envelope mismatch");
  }

  for (const field of [
    "value",
    "gasLimit",
    "maxFeePerGas",
    "maxPriorityFeePerGas"
  ]) {
    requireEqualBigNumber(
      parsed[field],
      envelope[field],
      field
    );
  }

  requireEqualBigNumber(
    parsed.value,
    intent.value,
    "Transaction intent value"
  );

  const capability = requireObject(
    signing.signerCapabilityBindingEvidence,
    "Signer capability binding evidence"
  );
  const authorization = requireObject(
    capability.signingAuthorizationEvidence,
    "Signing authorization evidence"
  );
  const signerAuthorization = requireObject(
    authorization.signerAuthorizationEvidence,
    "Signer authorization evidence"
  );
  const prospective = requireObject(
    signerAuthorization.prospectiveSignerIdentityEvidence,
    "Prospective signer identity evidence"
  );
  const simulation = requireObject(
    prospective.currentTransactionPreSendSimulationEvidence,
    "Pre-send simulation evidence"
  );
  const envelopeEvidence = requireObject(
    simulation.currentTransactionEnvelopeEvidence,
    "Current transaction envelope evidence"
  );

  if (
    capability.signerCapabilityBindingReady !== true ||
    authorization.signingAuthorizationReady !== true ||
    signerAuthorization.signerAuthorizationReady !== true ||
    prospective.prospectiveSignerIdentityReady !== true ||
    simulation.currentTransactionPreSendSimulationReady !== true ||
    envelopeEvidence.currentTransactionEnvelopeReady !== true ||
    capability.transactionEnvelope !== envelope ||
    authorization.transactionEnvelope !== envelope ||
    signerAuthorization.transactionEnvelope !== envelope ||
    prospective.transactionEnvelope !== envelope ||
    simulation.transactionEnvelope !== envelope ||
    envelopeEvidence.transactionEnvelope !== envelope ||
    envelopeEvidence.unsignedTransactionIntentEvidence !== unsigned ||
    envelopeEvidence.transactionIntent !== intent ||
    unsigned.transactionIntent !== intent
  ) {
    throw new Error("Signed transaction evidence lineage mismatch");
  }

  const account = requireObject(
    unsigned.accountCallerIdentityEvidence,
    "Account caller identity evidence"
  );
  const identity = requireObject(
    account.accountIdentityEvidence,
    "Account identity evidence"
  );
  const preflight = requireObject(
    account.currentStatePreflightEvidence,
    "Current-state preflight evidence"
  );
  const state = requireObject(
    preflight.currentStateEvidence,
    "Current-state evidence"
  );
  const deployment = requireObject(
    state.deploymentEvidence,
    "Deployment evidence"
  );

  if (
    account.accountCallerIdentityReady !== true ||
    preflight.currentStatePreflightReady !== true ||
    preflight.executionPlan !== unsigned.executionPlan ||
    preflight.candidate !== unsigned.candidate ||
    preflight.executionLegs !== unsigned.executionLegs ||
    account.candidate !== unsigned.candidate ||
    account.executionPlan !== unsigned.executionPlan ||
    account.executionLegs !== unsigned.executionLegs ||
    !sameAddress(identity.executorAddress, intent.to) ||
    !sameAddress(deployment.executorAddress, intent.to) ||
    !sameAddress(identity.callerAddress, parsed.from) ||
    !sameAddress(identity.ownerAddress, parsed.from)
  ) {
    throw new Error("Execution context identity mismatch");
  }

  const iface = new ethers.utils.Interface(EXECUTOR_ABI);
  const decoded = iface.decodeFunctionData(
    "initiateFlashloan",
    parsed.data
  );

  if (
    !sameAddress(decoded.token, unsigned.flashloanToken) ||
    !ethers.BigNumber.isBigNumber(unsigned.flashloanAmount) ||
    !decoded.amount.eq(unsigned.flashloanAmount) ||
    !ethers.BigNumber.isBigNumber(unsigned.candidate.amountIn) ||
    !decoded.amount.eq(unsigned.candidate.amountIn) ||
    !sameHex(decoded.params, unsigned.executionPlan)
  ) {
    throw new Error("Flashloan calldata identity mismatch");
  }

  const expectedData = iface.encodeFunctionData(
    "initiateFlashloan",
    [
      unsigned.flashloanToken,
      unsigned.flashloanAmount,
      unsigned.executionPlan
    ]
  );

  if (!sameHex(parsed.data, expectedData)) {
    throw new Error("Noncanonical flashloan calldata");
  }

  const executorCodeHash = requireHash(
    deployment.executorCodeHash,
    "Executor code hash"
  );

  return Object.freeze({
    chainId: POLYGON_CHAIN_ID,
    signedTransactionHash: hash,
    receiptBlockNumber: observation.receiptBlockNumber,
    receiptBlockHash: observation.receiptBlockHash,
    observedHead: observation.observedHead,
    confirmations: observation.confirmations,
    minimumConfirmations: observation.minimumConfirmations,
    gasUsed: observation.gasUsed,
    executionPlanHash: ethers.utils.keccak256(
      unsigned.executionPlan
    ),
    executorAddress: intent.to,
    executorCodeHash,
    executorCodeHashProvenance: "UPSTREAM_DEPLOYMENT_EVIDENCE",
    historicalExecutorCodeVerified: false,
    provenance: Object.freeze({
      method: "LIVE_POLYGON_RECEIPT"
    }),
    transactionSigningEvidence: signing,
    unsignedTransactionIntentEvidence: unsigned,
    receiptObservationEvidence: observation,
    liveReceiptGasMeasurementReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  });
}

module.exports = {
  buildLiveReceiptGasMeasurementEvidence
};
