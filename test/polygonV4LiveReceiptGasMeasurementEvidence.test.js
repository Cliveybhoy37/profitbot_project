"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  buildLiveReceiptGasMeasurementEvidence
} = require("../scripts/utils/polygonV4LiveReceiptGasMeasurementEvidence");

const {
  encodeV4ExecutionPlan
} = require("../scripts/utils/polygonV4ExecutionRoute");

const EXECUTOR = "0x2222222222222222222222222222222222222222";
const TOKEN_A = "0x1111111111111111111111111111111111111111";
const TOKEN_B = "0x3333333333333333333333333333333333333333";
const TOKEN_C = "0x4444444444444444444444444444444444444444";
const BLOCK_HASH = "0x" + "ab".repeat(32);
const CODE_HASH = "0x" + "cd".repeat(32);

const iface = new ethers.utils.Interface([
  "function initiateFlashloan(address token,uint256 amount,bytes params)"
]);

async function fixture() {
  // Disposable in-memory test wallet. No provider or project credentials.
  const wallet = ethers.Wallet.createRandom();
  const from = wallet.address;
  const amount = ethers.BigNumber.from("1000000000000000000");
  const candidate = { amountIn: amount };
  const executionLegs = [
    {
      venue: 0,
      tokenIn: TOKEN_A,
      tokenOut: TOKEN_B,
      minAmountOut: ethers.BigNumber.from(1000),
      venueData: "0x"
    },
    {
      venue: 1,
      tokenIn: TOKEN_B,
      tokenOut: TOKEN_C,
      minAmountOut: ethers.BigNumber.from(1000),
      venueData: "0x"
    },
    {
      venue: 0,
      tokenIn: TOKEN_C,
      tokenOut: TOKEN_A,
      minAmountOut: ethers.BigNumber.from(1000),
      venueData: "0x"
    }
  ];

  const executionPlan = encodeV4ExecutionPlan({
    legs: executionLegs,
    deadline: 2000000000,
    minimumProfit: ethers.BigNumber.from(1)
  });

  const deploymentEvidence = {
    executorAddress: EXECUTOR,
    executorCodeHash: CODE_HASH
  };

  const currentStateEvidence = { deploymentEvidence };

  const currentStatePreflightEvidence = {
    currentStatePreflightReady: true,
    currentStateEvidence,
    candidate,
    executionLegs,
    executionPlan
  };

  const accountIdentityEvidence = {
    executorAddress: EXECUTOR,
    callerAddress: from,
    ownerAddress: from
  };

  const accountCallerIdentityEvidence = {
    accountCallerIdentityReady: true,
    accountIdentityEvidence,
    currentStatePreflightEvidence,
    candidate,
    executionLegs,
    executionPlan
  };

  const data = iface.encodeFunctionData("initiateFlashloan", [
    TOKEN_A, amount, executionPlan
  ]);

  const transactionIntent = {
    from, to: EXECUTOR, data, value: ethers.constants.Zero
  };

  const unsignedTransactionIntentEvidence = {
    unsignedTransactionIntentReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false,
    transactionIntent,
    accountCallerIdentityEvidence,
    candidate,
    executionLegs,
    executionPlan,
    flashloanToken: TOKEN_A,
    flashloanAmount: amount
  };

  const transactionEnvelope = {
    ...transactionIntent,
    chainId: 137,
    nonce: 42,
    gasLimit: ethers.BigNumber.from(700000),
    maxFeePerGas: ethers.BigNumber.from("50000000000"),
    maxPriorityFeePerGas: ethers.BigNumber.from("30000000000")
  };

  const currentTransactionEnvelopeEvidence = {
    currentTransactionEnvelopeReady: true,
    transactionEnvelope,
    transactionIntent,
    unsignedTransactionIntentEvidence
  };

  const currentTransactionPreSendSimulationEvidence = {
    currentTransactionPreSendSimulationReady: true,
    transactionEnvelope,
    currentTransactionEnvelopeEvidence
  };

  const prospectiveSignerIdentityEvidence = {
    prospectiveSignerIdentityReady: true,
    transactionEnvelope,
    currentTransactionPreSendSimulationEvidence
  };

  const signerAuthorizationEvidence = {
    signerAuthorizationReady: true,
    transactionEnvelope,
    prospectiveSignerIdentityEvidence
  };

  const signingAuthorizationEvidence = {
    signingAuthorizationReady: true,
    transactionEnvelope,
    signerAuthorizationEvidence
  };

  const signerCapabilityBindingEvidence = {
    signerCapabilityBindingReady: true,
    transactionEnvelope,
    signingAuthorizationEvidence
  };

  const signedRawTransaction = await wallet.signTransaction({
    type: 2,
    chainId: 137,
    nonce: transactionEnvelope.nonce,
    to: EXECUTOR,
    data,
    value: transactionEnvelope.value,
    gasLimit: transactionEnvelope.gasLimit,
    maxFeePerGas: transactionEnvelope.maxFeePerGas,
    maxPriorityFeePerGas: transactionEnvelope.maxPriorityFeePerGas,
    accessList: []
  });

  const signedTransactionHash = ethers.utils.keccak256(
    signedRawTransaction
  );

  const transactionSigningEvidence = {
    transactionSigningReady: true,
    signerAuthorized: true,
    signingAuthorized: true,
    liveExecutionAuthorized: false,
    broadcastAuthorized: false,
    signerAddress: from,
    signerCapabilityAddress: from,
    transactionEnvelope,
    signerCapabilityBindingEvidence,
    signedRawTransaction,
    signedTransactionHash
  };

  const receipt = {
    transactionHash: signedTransactionHash,
    status: 1,
    gasUsed: ethers.BigNumber.from(618122),
    blockNumber: 100,
    blockHash: BLOCK_HASH
  };

  const receiptObservationEvidence = {
    readOnlyTransactionReceiptObservationReady: true,
    chainId: 137,
    signedTransactionHash,
    receipt,
    gasUsed: receipt.gasUsed,
    receiptBlockNumber: 100,
    receiptBlockHash: BLOCK_HASH,
    observedHead: 105,
    confirmations: 6,
    minimumConfirmations: 3
  };

  return {
    transactionSigningEvidence,
    unsignedTransactionIntentEvidence,
    receiptObservationEvidence
  };
}

function measure(h) {
  return buildLiveReceiptGasMeasurementEvidence(h);
}

test("accepts synthetic Polygon signed transaction and matching receipt", async () => {
  const h = await fixture();
  const result = measure(h);

  assert.equal(result.liveReceiptGasMeasurementReady, true);
  assert.equal(result.chainId, 137);
  assert.equal(result.gasUsed.toString(), "618122");
  assert.equal(result.provenance.method, "LIVE_POLYGON_RECEIPT");
  assert.equal(result.historicalExecutorCodeVerified, false);
  assert.equal(result.executorCodeHashProvenance, "UPSTREAM_DEPLOYMENT_EVIDENCE");
  assert.equal(result.liveExecutionAuthorized, false);
  assert.equal(result.signerAuthorized, false);
  assert.equal(result.broadcastAuthorized, false);
  assert.equal(Object.isFrozen(result), true);
});

test("rejects substituted unsigned evidence even with identical values", async () => {
  const h = await fixture();
  h.unsignedTransactionIntentEvidence = {
    ...h.unsignedTransactionIntentEvidence
  };
  assert.throws(() => measure(h), /lineage mismatch/);
});

test("rejects signed transaction hash mismatch", async () => {
  const h = await fixture();
  h.transactionSigningEvidence.signedTransactionHash =
    "0x" + "ff".repeat(32);
  assert.throws(() => measure(h), /hash mismatch/);
});

test("rejects reverted receipt", async () => {
  const h = await fixture();
  h.receiptObservationEvidence.receipt.status = 0;
  assert.throws(() => measure(h), /Successful matching receipt/);
});

test("rejects invalid receipt gasUsed", async () => {
  const h = await fixture();
  h.receiptObservationEvidence.receipt.gasUsed =
    ethers.constants.Zero;
  assert.throws(() => measure(h), /gasUsed mismatch/);
});

test("rejects insufficient confirmations", async () => {
  const h = await fixture();
  h.receiptObservationEvidence.minimumConfirmations = 7;
  assert.throws(() => measure(h), /confirmation evidence mismatch/);
});

test("rejects signer capability address mismatch", async () => {
  const h = await fixture();
  h.transactionSigningEvidence.signerCapabilityAddress = TOKEN_B;
  assert.throws(() => measure(h), /envelope mismatch/);
});

test("rejects changed preflight execution plan identity", async () => {
  const h = await fixture();
  h.unsignedTransactionIntentEvidence
    .accountCallerIdentityEvidence
    .currentStatePreflightEvidence
    .executionPlan = "0xabcd";
  assert.throws(() => measure(h), /Execution context identity mismatch/);
});

test("rejects unsafe confirmation arithmetic", async () => {
  const h = await fixture();
  h.receiptObservationEvidence.observedHead =
    Number.MAX_SAFE_INTEGER;
  h.receiptObservationEvidence.confirmations =
    Number.MAX_SAFE_INTEGER;
  assert.throws(() => measure(h), /confirmation evidence mismatch/);
});

test("rejects signing authorization drift", async () => {
  const h = await fixture();
  h.transactionSigningEvidence.signingAuthorized = false;
  assert.throws(() => measure(h), /authorization state/);
});

test("rejects non-Polygon receipt observation", async () => {
  const h = await fixture();
  h.receiptObservationEvidence.chainId = 1;
  assert.throws(() => measure(h), /Polygon receipt observation required/);
});

test("rejects mismatched receipt transaction hash", async () => {
  const h = await fixture();
  h.receiptObservationEvidence.receipt.transactionHash =
    "0x" + "ef".repeat(32);
  assert.throws(() => measure(h), /Successful matching receipt/);
});

test("rejects mismatched receipt block hash", async () => {
  const h = await fixture();
  h.receiptObservationEvidence.receipt.blockHash =
    "0x" + "ef".repeat(32);
  assert.throws(() => measure(h), /Receipt block identity mismatch/);
});

test("rejects mismatched receipt block number", async () => {
  const h = await fixture();
  h.receiptObservationEvidence.receipt.blockNumber = 101;
  assert.throws(() => measure(h), /Receipt block identity mismatch/);
});

test("rejects mismatched signed transaction nonce", async () => {
  const h = await fixture();
  h.transactionSigningEvidence.transactionEnvelope.nonce = 43;
  assert.throws(() => measure(h), /Signed transaction envelope mismatch/);
});

test("rejects mismatched signed transaction gas limit", async () => {
  const h = await fixture();
  h.transactionSigningEvidence.transactionEnvelope.gasLimit =
    ethers.BigNumber.from(700001);
  assert.throws(() => measure(h), /gasLimit mismatch/);
});

test("rejects mismatched signed transaction calldata", async () => {
  const h = await fixture();
  h.unsignedTransactionIntentEvidence.transactionIntent.data =
    "0x12345678";
  assert.throws(() => measure(h), /Signed transaction envelope mismatch/);
});

test("rejects missing receipt observation readiness", async () => {
  const h = await fixture();
  h.receiptObservationEvidence.readOnlyTransactionReceiptObservationReady =
    false;
  assert.throws(() => measure(h), /Required evidence is not ready/);
});

test("rejects missing preserved signer authorization evidence", async () => {
  const h = await fixture();
  h.transactionSigningEvidence
    .signerCapabilityBindingEvidence
    .signingAuthorizationEvidence
    .signerAuthorizationEvidence = null;

  assert.throws(
    () => measure(h),
    /Signer authorization evidence object required/
  );
});

test("rejects invalid executor deployment code hash", async () => {
  const h = await fixture();
  h.unsignedTransactionIntentEvidence
    .accountCallerIdentityEvidence
    .currentStatePreflightEvidence
    .currentStateEvidence
    .deploymentEvidence
    .executorCodeHash = "0x1234";

  assert.throws(
    () => measure(h),
    /Executor code hash must be a bytes32 hash/
  );
});
