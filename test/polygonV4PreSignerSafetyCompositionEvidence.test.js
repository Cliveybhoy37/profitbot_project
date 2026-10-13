"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  buildPreSignerSafetyCompositionEvidence
} = require("../scripts/utils/polygonV4PreSignerSafetyCompositionEvidence");

const BN = (value) => ethers.BigNumber.from(value);
const ETH = (value) => ethers.utils.parseEther(value);

const WPOL = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
const DAI = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
const APEPE = "0xA3f751662e282E83EC3cBc387d225Ca56dD63D3A";
const SENDER = "0x1111111111111111111111111111111111111111";

function fixture({
  protectedOutput = ETH("0.140"),
  balanceWei = ETH("0.020"),
  chainId = 137,
  failBalance = false
} = {}) {
  const gasLimit = BN(700000);
  const maxFeePerGas = ethers.utils.parseUnits("20", "gwei");

  const candidate = { amountIn: ETH("0.1") };
  const executionLegs = [
    { tokenIn: WPOL, tokenOut: DAI },
    { tokenIn: DAI, tokenOut: APEPE },
    { tokenIn: APEPE, tokenOut: WPOL, minAmountOut: protectedOutput }
  ];
  const executionPlan = "0x1234";

  const preflight = {
    amountIn: candidate.amountIn,
    protectedFinalOutput: protectedOutput,
    expectedPremium: ETH("0.001"),
    safetyReserve: ETH("0.001"),
    minimumNetProfit: ETH("0.005")
  };

  const qualifiedContext = {
    candidate,
    executionLegs,
    executionPlan,
    qualificationResult: {
      qualified: true,
      stage: "QUALIFIED",
      premiumBps: 100,
      preflight
    },
    policySnapshot: { premiumBps: 100 },
    minimumNetProfitWei: preflight.minimumNetProfit
  };

  const currentStatePreflightEvidence = {
    candidate,
    executionLegs,
    executionPlan,
    qualifiedContext,
    currentStateEvidence: { preflightEvidence: preflight },
    currentStatePreflightReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  };

  const accountCallerIdentityEvidence = {
    candidate,
    executionLegs,
    executionPlan,
    currentStatePreflightEvidence,
    accountCallerIdentityReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  };

  const transactionIntent = {
    from: SENDER,
    to: "0x2222222222222222222222222222222222222222",
    data: "0x12345678",
    value: BN(0)
  };

  const unsignedTransactionIntentEvidence = {
    candidate,
    executionLegs,
    executionPlan,
    accountCallerIdentityEvidence,
    transactionIntent,
    unsignedTransactionIntentReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  };

  const currentTransactionParameterEvidence = {
    unsignedTransactionIntentEvidence,
    transactionIntent,
    chainId: 137,
    nonce: 7,
    maxFeePerGas,
    maxPriorityFeePerGas: ethers.utils.parseUnits("1", "gwei"),
    currentTransactionParametersReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  };

  const currentTransactionGasEstimationEvidence = {
    currentTransactionParameterEvidence,
    unsignedTransactionIntentEvidence,
    transactionIntent,
    estimatedGasUnits: gasLimit,
    currentTransactionGasEstimationReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  };

  const currentTransactionGasLimitSelectionEvidence = {
    currentTransactionGasEstimationEvidence,
    currentTransactionParameterEvidence,
    unsignedTransactionIntentEvidence,
    transactionIntent,
    selectedGasLimit: gasLimit,
    currentTransactionGasLimitSelectionReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  };

  const transactionEnvelope = {
    ...transactionIntent,
    chainId: 137,
    nonce: 7,
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas:
      currentTransactionParameterEvidence.maxPriorityFeePerGas
  };

  const currentTransactionEnvelopeEvidence = {
    currentTransactionGasLimitSelectionEvidence,
    currentTransactionGasEstimationEvidence,
    currentTransactionParameterEvidence,
    unsignedTransactionIntentEvidence,
    transactionIntent,
    transactionEnvelope,
    currentTransactionEnvelopeReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  };

  const simulation = {
    currentTransactionEnvelopeEvidence,
    transactionEnvelope,
    currentTransactionPreSendSimulationReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  };

  const composition = {
    currentTransactionPreSendSimulationEvidence: simulation,
    currentTransactionPreSendSimulationAcquisitionCompositionReady: true
  };

  const calls = [];

  const provider = {
    async getNetwork() {
      calls.push(["getNetwork"]);
      return { chainId };
    },
    async getBalance(address, blockTag) {
      calls.push(["getBalance", address, blockTag]);
      if (failBalance) {
        throw new Error("synthetic balance provider failure");
      }
      return balanceWei;
    }
  };

  return {
    candidate,
    preflight,
    simulation,
    composition,
    transactionEnvelope,
    provider,
    calls
  };
}

async function run(f) {
  return buildPreSignerSafetyCompositionEvidence({
    currentTransactionPreSendSimulationAcquisitionCompositionEvidence:
      f.composition,
    provider: f.provider
  });
}

test("accepts profitable economics and sufficient pending POL", async () => {
  const f = fixture();
  const result = await run(f);

  assert.equal(result.preSignerSafetyCompositionReady, true);
  assert.strictEqual(
    result.currentTransactionPreSendSimulationEvidence,
    f.simulation
  );
  assert.strictEqual(result.transactionEnvelope, f.transactionEnvelope);
  assert.strictEqual(
    result.finalTransactionEconomicsEvidence.preSendSimulationEvidence,
    f.simulation
  );
  assert.strictEqual(
    result.nativeGasAffordabilityEvidence.finalTransactionEconomicsEvidence,
    result.finalTransactionEconomicsEvidence
  );
  assert.equal(
    result.finalTransactionEconomicsEvidence.maximumGasExposure.toString(),
    ETH("0.014").toString()
  );
  assert.equal(
    result.finalTransactionEconomicsEvidence.finalProtectedNetProfit.toString(),
    ETH("0.024").toString()
  );
  assert.deepEqual(f.calls, [
    ["getNetwork"],
    ["getBalance", SENDER, "pending"]
  ]);
  assert.equal(result.liveExecutionAuthorized, false);
  assert.equal(result.signerAuthorized, false);
  assert.equal(result.broadcastAuthorized, false);
  assert.equal(Object.isFrozen(result), true);
});

test("rejects unprofitable final gas before balance RPC", async () => {
  const f = fixture({ protectedOutput: ETH("0.110") });
  await assert.rejects(run(f), /maximum gas exposure violates protected minimum profit/);
  assert.deepEqual(f.calls, []);
});

test("rejects insufficient native POL", async () => {
  const f = fixture({ balanceWei: ETH("0.013") });
  await assert.rejects(run(f), /Insufficient native POL/);
  assert.deepEqual(f.calls, [
    ["getNetwork"],
    ["getBalance", SENDER, "pending"]
  ]);
});

test("rejects wrong provider chain before balance acquisition", async () => {
  const f = fixture({ chainId: 1 });
  await assert.rejects(run(f), /must be Polygon chain 137/);
  assert.deepEqual(f.calls, [["getNetwork"]]);
});

test("propagates pending balance RPC failure", async () => {
  const f = fixture({ failBalance: true });
  await assert.rejects(run(f), /synthetic balance provider failure/);
});

test("rejects missing simulation composition before RPC", async () => {
  const f = fixture();
  f.composition = null;
  await assert.rejects(run(f), /Pre-send simulation composition must be an object/);
  assert.deepEqual(f.calls, []);
});

test("rejects simulation composition not ready before RPC", async () => {
  const f = fixture();
  f.composition.currentTransactionPreSendSimulationAcquisitionCompositionReady = false;
  await assert.rejects(run(f), /Pre-send simulation composition must be ready/);
  assert.deepEqual(f.calls, []);
});

test("rejects simulation authorization contamination before RPC", async () => {
  const f = fixture();
  f.simulation.signerAuthorized = true;
  await assert.rejects(run(f), /must remain unauthorized/);
  assert.deepEqual(f.calls, []);
});

test("rejects altered final envelope gas limit before RPC", async () => {
  const f = fixture();
  f.transactionEnvelope.gasLimit = BN(700001);
  await assert.rejects(run(f), /gas limit|gas estimation|selection|mismatch/i);
  assert.deepEqual(f.calls, []);
});

test("rejects reserve below mandatory protected policy before RPC", async () => {
  const f = fixture();
  f.preflight.safetyReserve = ETH("0.0009");
  await assert.rejects(run(f), /Safety reserve below protected runtime policy/);
  assert.deepEqual(f.calls, []);
});
