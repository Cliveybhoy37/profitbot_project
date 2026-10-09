"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  buildExactTransactionSigningCompositionEvidence
} = require("../scripts/utils/polygonV4ExactTransactionSigningCompositionEvidence");

const {
  observeReadOnlyTransactionReceiptEvidence
} = require("../scripts/utils/polygonV4ReadOnlyTransactionReceiptObservationEvidence");

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

async function makeFixture() {
  // Disposable local wallet: no provider, environment secrets or project signer.
  const wallet = ethers.Wallet.createRandom();
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
    callerAddress: wallet.address,
    ownerAddress: wallet.address
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
    TOKEN_A,
    amount,
    executionPlan
  ]);

  const transactionIntent = {
    from: wallet.address,
    to: EXECUTOR,
    data,
    value: ethers.constants.Zero
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
    signerAuthorized: true,
    signingAuthorized: true,
    liveExecutionAuthorized: false,
    broadcastAuthorized: false,
    transactionEnvelope,
    signerAddress: wallet.address,
    signerCapabilityAddress: wallet.address,
    signingAuthorizationEvidence
  };

  const signerCapabilityBindingCompositionEvidence = {
    signerCapabilityBindingCompositionReady: true,
    signerCapabilityBindingEvidence
  };

  let signingCalls = 0;

  const signingComposition =
    await buildExactTransactionSigningCompositionEvidence({
      signerCapabilityBindingCompositionEvidence,
      signTransaction: async signableTransaction => {
        signingCalls += 1;
        return wallet.signTransaction(signableTransaction);
      }
    });

  const transactionSigningEvidence =
    signingComposition.exactTransactionSigningEvidence;

  const receipt = {
    transactionHash: transactionSigningEvidence.signedTransactionHash,
    status: 1,
    gasUsed: ethers.BigNumber.from(618122),
    blockNumber: 100,
    blockHash: BLOCK_HASH
  };

  const calls = [];
  const provider = {
    async getNetwork() {
      calls.push("getNetwork");
      return { chainId: 137 };
    },
    async getTransactionReceipt(hash) {
      calls.push(["getTransactionReceipt", hash]);
      return receipt;
    },
    async getBlock(number) {
      calls.push(["getBlock", number]);
      return { number: 100, hash: BLOCK_HASH };
    },
    async getBlockNumber() {
      calls.push("getBlockNumber");
      return 105;
    }
  };

  return {
    signingComposition,
    transactionSigningEvidence,
    unsignedTransactionIntentEvidence,
    provider,
    receipt,
    calls,
    signingCalls: () => signingCalls
  };
}

async function observe(fixture, overrides = {}) {
  return observeReadOnlyTransactionReceiptEvidence({
    provider: fixture.provider,
    signedTransactionHash:
      fixture.transactionSigningEvidence.signedTransactionHash,
    minimumConfirmations: 3,
    ...overrides
  });
}

test("connects real signing composition, read-only observer and gas validator", async () => {
  const fixture = await makeFixture();
  const observation = await observe(fixture);

  const measurement = buildLiveReceiptGasMeasurementEvidence({
    transactionSigningEvidence: fixture.transactionSigningEvidence,
    unsignedTransactionIntentEvidence:
      fixture.unsignedTransactionIntentEvidence,
    receiptObservationEvidence: observation
  });

  assert.equal(fixture.signingCalls(), 1);
  assert.deepEqual(fixture.calls, [
    "getNetwork",
    [
      "getTransactionReceipt",
      fixture.transactionSigningEvidence.signedTransactionHash
    ],
    ["getBlock", 100],
    "getBlockNumber"
  ]);

  assert.equal(measurement.liveReceiptGasMeasurementReady, true);
  assert.equal(
    measurement.signedTransactionHash,
    fixture.transactionSigningEvidence.signedTransactionHash
  );
  assert.equal(measurement.gasUsed, fixture.receipt.gasUsed);
  assert.equal(measurement.receiptObservationEvidence, observation);
  assert.equal(
    measurement.transactionSigningEvidence,
    fixture.transactionSigningEvidence
  );
  assert.equal(
    measurement.unsignedTransactionIntentEvidence,
    fixture.unsignedTransactionIntentEvidence
  );
  assert.equal(measurement.confirmations, 6);
  assert.equal(measurement.historicalExecutorCodeVerified, false);
  assert.equal(
    measurement.executorCodeHashProvenance,
    "UPSTREAM_DEPLOYMENT_EVIDENCE"
  );
  assert.equal(measurement.liveExecutionAuthorized, false);
  assert.equal(measurement.signerAuthorized, false);
  assert.equal(measurement.broadcastAuthorized, false);
  assert.equal(
    fixture.transactionSigningEvidence.liveExecutionAuthorized,
    false
  );
  assert.equal(
    fixture.transactionSigningEvidence.broadcastAuthorized,
    false
  );
});

test("rejects a provider on the wrong chain before receipt lookup", async () => {
  const fixture = await makeFixture();
  fixture.provider.getNetwork = async () => {
    fixture.calls.push("getNetwork");
    return { chainId: 1 };
  };

  await assert.rejects(observe(fixture), /Polygon|chain|137/i);
  assert.deepEqual(fixture.calls, ["getNetwork"]);
});

test("rejects receipt hash substitution", async () => {
  const fixture = await makeFixture();
  fixture.receipt.transactionHash = "0x" + "ff".repeat(32);

  await assert.rejects(observe(fixture), /hash mismatch/i);
  assert.equal(
    fixture.calls.filter(call =>
      Array.isArray(call) && call[0] === "getTransactionReceipt"
    ).length,
    1
  );
});

test("rejects failed receipt status", async () => {
  const fixture = await makeFixture();
  fixture.receipt.status = 0;

  await assert.rejects(observe(fixture), /successful receipt/i);
});

test("rejects insufficient confirmations", async () => {
  const fixture = await makeFixture();
  fixture.provider.getBlockNumber = async () => {
    fixture.calls.push("getBlockNumber");
    return 100;
  };

  await assert.rejects(
    observe(fixture),
    /insufficient confirmation/i
  );
});

test("rejects signed-hash substitution at measurement boundary", async () => {
  const fixture = await makeFixture();
  const observation = await observe(fixture);

  const substitutedSigning = {
    ...fixture.transactionSigningEvidence,
    signedTransactionHash: "0x" + "ff".repeat(32)
  };

  assert.throws(
    () => buildLiveReceiptGasMeasurementEvidence({
      transactionSigningEvidence: substitutedSigning,
      unsignedTransactionIntentEvidence:
        fixture.unsignedTransactionIntentEvidence,
      receiptObservationEvidence: observation
    }),
    /signed transaction hash mismatch/i
  );
});

test("rejects substituted unsigned-intent lineage", async () => {
  const fixture = await makeFixture();
  const observation = await observe(fixture);

  const substitutedUnsigned = {
    ...fixture.unsignedTransactionIntentEvidence
  };

  assert.throws(
    () => buildLiveReceiptGasMeasurementEvidence({
      transactionSigningEvidence:
        fixture.transactionSigningEvidence,
      unsignedTransactionIntentEvidence: substitutedUnsigned,
      receiptObservationEvidence: observation
    }),
    /lineage mismatch/i
  );
});
