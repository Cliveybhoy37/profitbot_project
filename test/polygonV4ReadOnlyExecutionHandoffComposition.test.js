"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { ethers } = require("ethers");

const {
  buildReadOnlyExecutionHandoffComposition
} = require("../scripts/utils/polygonV4ReadOnlyExecutionHandoffComposition");

const EXECUTOR = "0x1111111111111111111111111111111111111111";
const OWNER = "0x2222222222222222222222222222222222222222";
const OTHER = "0x3333333333333333333333333333333333333333";
const TOKEN_A = "0x4444444444444444444444444444444444444444";
const TOKEN_B = "0x5555555555555555555555555555555555555555";
const TOKEN_C = "0x6666666666666666666666666666666666666666";

const CODE_HASH =
  "0x347dca910e2d4b7dd6b4ba19151fc2cd28e33c268cbb38511169a0b4a753facc";

function makeFixture({
  callerAddress = OWNER,
  ownerAddress = OWNER,
  deploymentAddress = EXECUTOR,
  measuredExecutorAddress = EXECUTOR,
  deadline = 2000,
  currentTimestamp = 1900,
  readinessAuthorization = {},
  currentStateAuthorization = {}
} = {}) {
  const amountIn = ethers.BigNumber.from("125000000000000000");
  const executionPlan = "0x1234";

  const candidate = Object.freeze({
    blockTag: 94709817,
    amountIn
  });

  const executionLegs = Object.freeze([
    Object.freeze({ tokenIn: TOKEN_A, tokenOut: TOKEN_B }),
    Object.freeze({ tokenIn: TOKEN_B, tokenOut: TOKEN_C }),
    Object.freeze({ tokenIn: TOKEN_C, tokenOut: TOKEN_A })
  ]);

  const executorContext = Object.freeze({
    executorAddress: measuredExecutorAddress,
    executorCodeHash: CODE_HASH
  });

  const gasEvidence = Object.freeze({
    gasUnits: 652106,
    executorContext
  });

  const qualificationPolicySnapshot = Object.freeze({
    blockNumber: 1000,
    gasPriceWei: "30000000000"
  });

  const authoritativePreflight = Object.freeze({
    observationBlock: 94709817
  });

  const qualificationResult = Object.freeze({
    qualified: true,
    stage: "QUALIFIED",
    preflight: authoritativePreflight
  });

  const qualifiedContext = Object.freeze({
    qualificationResult,
    candidate,
    executionLegs,
    executionPlan,
    deadline,
    policySnapshot: qualificationPolicySnapshot,
    gasEvidence
  });

  const preparedExecutionContext = Object.freeze({
    candidate,
    executionLegs,
    executionPlan,
    deadline
  });

  const readinessEvidence = Object.freeze({
    candidate,
    executionLegs,
    executionPlan,
    gasEvidence,
    qualificationPolicySnapshot,
    qualifiedContext,
    preparedExecutionContext,
    executionEvidenceReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false,
    ...readinessAuthorization
  });

  const deploymentEvidence = Object.freeze({
    executorAddress: deploymentAddress,
    executorCodeHash: CODE_HASH
  });

  const currentStateEvidence = Object.freeze({
    chainEvidence: Object.freeze({ chainId: 137 }),
    deploymentEvidence,
    routeAmountEvidence: Object.freeze({
      candidate,
      executionLegs,
      executionPlan,
      amountIn
    }),
    economicsEvidence: Object.freeze({
      gasEvidence,
      qualificationPolicySnapshot
    }),
    freshnessEvidence: Object.freeze({
      deadline,
      currentTimestamp
    }),
    preflightEvidence: authoritativePreflight,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false,
    ...currentStateAuthorization
  });

  const currentStateEvidenceComposition = Object.freeze({
    currentStateEvidence,
    currentStateEvidenceCompositionReady: true
  });

  const callbackCalls = {
    caller: 0,
    owner: 0,
    ownerExecutor: null
  };

  const getCallerAddress = async () => {
    callbackCalls.caller += 1;
    return callerAddress;
  };

  const getExecutorOwner = async executorAddress => {
    callbackCalls.owner += 1;
    callbackCalls.ownerExecutor = executorAddress;
    return ownerAddress;
  };

  return {
    amountIn,
    candidate,
    executionLegs,
    executionPlan,
    gasEvidence,
    qualificationPolicySnapshot,
    qualifiedContext,
    readinessEvidence,
    currentStateEvidence,
    currentStateEvidenceComposition,
    callbackCalls,
    getCallerAddress,
    getExecutorOwner
  };
}

function runHandoff(fixture, overrides = {}) {
  return buildReadOnlyExecutionHandoffComposition({
    readinessEvidence: fixture.readinessEvidence,
    currentStateEvidenceComposition:
      fixture.currentStateEvidenceComposition,
    getCallerAddress: fixture.getCallerAddress,
    getExecutorOwner: fixture.getExecutorOwner,
    ...overrides
  });
}

function assertNoAuthorization(evidence) {
  assert.equal(evidence.liveExecutionAuthorized, false);
  assert.equal(evidence.signerAuthorized, false);
  assert.equal(evidence.broadcastAuthorized, false);
}

test("rejects missing readiness evidence before account acquisition", async () => {
  const f = makeFixture();

  await assert.rejects(
    runHandoff(f, { readinessEvidence: undefined }),
    /Execution readiness evidence/
  );

  assert.equal(f.callbackCalls.caller, 0);
  assert.equal(f.callbackCalls.owner, 0);
});

test("rejects upstream execution authorization before account acquisition", async () => {
  const f = makeFixture({
    readinessAuthorization: {
      liveExecutionAuthorized: true
    }
  });

  await assert.rejects(
    runHandoff(f),
    /Execution readiness must remain unauthorized/
  );

  assert.equal(f.callbackCalls.caller, 0);
  assert.equal(f.callbackCalls.owner, 0);
});

test("rejects incomplete current-state composition before account acquisition", async () => {
  const f = makeFixture();

  await assert.rejects(
    runHandoff(f, {
      currentStateEvidenceComposition: {
        ...f.currentStateEvidenceComposition,
        currentStateEvidenceCompositionReady: false
      }
    }),
    /Current-state evidence composition is not ready/
  );

  assert.equal(f.callbackCalls.caller, 0);
  assert.equal(f.callbackCalls.owner, 0);
});

test("rejects current-state authorization before account acquisition", async () => {
  const f = makeFixture({
    currentStateAuthorization: {
      signerAuthorized: true
    }
  });

  await assert.rejects(
    runHandoff(f),
    /Current-state evidence must remain unauthorized/
  );

  assert.equal(f.callbackCalls.caller, 0);
  assert.equal(f.callbackCalls.owner, 0);
});

test("composes exact offline evidence into an unsigned flashloan intent", async () => {
  const f = makeFixture();
  const result = await runHandoff(f);

  assert.equal(result.readOnlyExecutionHandoffReady, true);
  assert.equal(Object.isFrozen(result), true);
  assertNoAuthorization(result);

  assert.strictEqual(result.readinessEvidence, f.readinessEvidence);
  assert.strictEqual(
    result.currentStateEvidenceComposition,
    f.currentStateEvidenceComposition
  );

  const preflightComposition =
    result.currentStatePreflightCompositionEvidence;

  assert.equal(preflightComposition.currentStatePreflightCompositionReady, true);
  assert.strictEqual(
    preflightComposition.currentStatePreflightEvidence.readinessEvidence,
    f.readinessEvidence
  );
  assert.strictEqual(
    preflightComposition.currentStatePreflightEvidence.currentStateEvidence,
    f.currentStateEvidence
  );

  const acquisition =
    result.deployedAccountIdentityAcquisitionCompositionEvidence;

  assert.equal(
    acquisition.deployedAccountIdentityAcquisitionCompositionReady,
    true
  );
  assert.strictEqual(
    acquisition.currentStatePreflightCompositionEvidence,
    preflightComposition
  );

  const account =
    result.accountCallerIdentityCompositionEvidence;

  assert.equal(account.accountCallerIdentityCompositionReady, true);
  assert.strictEqual(
    account.deployedAccountIdentityAcquisitionCompositionEvidence,
    acquisition
  );

  const unsignedComposition =
    result.unsignedExactTransactionIntentCompositionEvidence;

  assert.equal(unsignedComposition.unsignedExactTransactionIntentCompositionReady, true);
  assert.strictEqual(
    unsignedComposition.accountCallerIdentityCompositionEvidence,
    account
  );

  const unsigned = result.unsignedTransactionIntentEvidence;

  assert.strictEqual(
    unsigned,
    unsignedComposition.unsignedTransactionIntentEvidence
  );
  assert.equal(unsigned.unsignedTransactionIntentReady, true);
  assertNoAuthorization(unsigned);

  assert.strictEqual(unsigned.candidate, f.candidate);
  assert.strictEqual(unsigned.executionLegs, f.executionLegs);
  assert.strictEqual(unsigned.executionPlan, f.executionPlan);
  assert.strictEqual(
    unsigned.accountCallerIdentityEvidence,
    account.accountCallerIdentityEvidence
  );
  assert.strictEqual(
    account.accountCallerIdentityEvidence.currentStatePreflightEvidence,
    preflightComposition.currentStatePreflightEvidence
  );
  assert.strictEqual(
    account.accountCallerIdentityEvidence.gasEvidence,
    f.gasEvidence
  );
  assert.strictEqual(
    account.accountCallerIdentityEvidence.qualificationPolicySnapshot,
    f.qualificationPolicySnapshot
  );

  assert.equal(unsigned.flashloanToken, TOKEN_A);
  assert.strictEqual(unsigned.flashloanAmount, f.amountIn);

  assert.equal(unsigned.transactionIntent.from, OWNER);
  assert.equal(unsigned.transactionIntent.to, EXECUTOR);
  assert.ok(unsigned.transactionIntent.value.eq(0));

  const iface = new ethers.utils.Interface([
    "function initiateFlashloan(address token,uint256 amount,bytes params)"
  ]);

  assert.equal(
    unsigned.transactionIntent.data,
    iface.encodeFunctionData("initiateFlashloan", [
      TOKEN_A,
      f.amountIn,
      f.executionPlan
    ])
  );

  for (const forbidden of [
    "nonce",
    "gasPrice",
    "gasLimit",
    "maxFeePerGas",
    "maxPriorityFeePerGas",
    "signature",
    "rawTransaction"
  ]) {
    assert.equal(
      Object.hasOwn(unsigned.transactionIntent, forbidden),
      false,
      `Unexpected transaction field: ${forbidden}`
    );
  }

  assert.deepEqual(f.callbackCalls, {
    caller: 1,
    owner: 1,
    ownerExecutor: EXECUTOR
  });
});

test("rejects caller-owner mismatch at account identity validation", async () => {
  const f = makeFixture({ callerAddress: OTHER });

  await assert.rejects(
    runHandoff(f),
    /Caller identity does not match deployed ProfitBot owner/
  );

  assert.deepEqual(f.callbackCalls, {
    caller: 1,
    owner: 1,
    ownerExecutor: EXECUTOR
  });
});

test("rejects malformed acquired caller before owner acquisition", async () => {
  const f = makeFixture({ callerAddress: "not-an-address" });

  await assert.rejects(
    runHandoff(f),
    /caller|address/i
  );

  assert.equal(f.callbackCalls.caller, 1);
  assert.equal(f.callbackCalls.owner, 0);
});

test("rejects invalid acquired owner", async () => {
  const f = makeFixture({
    ownerAddress: ethers.constants.AddressZero
  });

  await assert.rejects(
    runHandoff(f),
    /owner|address/i
  );

  assert.equal(f.callbackCalls.caller, 1);
  assert.equal(f.callbackCalls.owner, 1);
});

test("rejects deployed executor mismatch before account acquisition", async () => {
  const f = makeFixture({
    deploymentAddress: OTHER
  });

  await assert.rejects(
    runHandoff(f),
    /Executor deployment address identity mismatch/
  );

  assert.equal(f.callbackCalls.caller, 0);
  assert.equal(f.callbackCalls.owner, 0);
});

test("rejects altered execution-plan identity before account acquisition", async () => {
  const f = makeFixture();

  const alteredReadiness = Object.freeze({
    ...f.readinessEvidence,
    executionPlan: "0xabcd"
  });

  await assert.rejects(
    runHandoff(f, { readinessEvidence: alteredReadiness }),
    /Execution plan identity mismatch/
  );

  assert.equal(f.callbackCalls.caller, 0);
  assert.equal(f.callbackCalls.owner, 0);
});

test("rejects expired deadline before account acquisition", async () => {
  const f = makeFixture({
    deadline: 2000,
    currentTimestamp: 2000
  });

  await assert.rejects(
    runHandoff(f),
    /deadline|expired/i
  );

  assert.equal(f.callbackCalls.caller, 0);
  assert.equal(f.callbackCalls.owner, 0);
});

test("rejects missing account callback after valid preflight", async () => {
  const f = makeFixture();

  await assert.rejects(
    runHandoff(f, { getCallerAddress: undefined }),
    /getCallerAddress|function/i
  );

  assert.equal(f.callbackCalls.caller, 0);
  assert.equal(f.callbackCalls.owner, 0);
});

test("rejects missing owner callback before invoking either callback", async () => {
  const f = makeFixture();

  await assert.rejects(
    runHandoff(f, { getExecutorOwner: undefined }),
    /getExecutorOwner|function/i
  );

  assert.equal(f.callbackCalls.caller, 0);
  assert.equal(f.callbackCalls.owner, 0);
});
