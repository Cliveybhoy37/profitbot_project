"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { ethers } = require("ethers");

const {
  buildPolygonV4ReadOnlyOrchestration
} = require("../scripts/utils/polygonV4ReadOnlyOrchestration");

const EXECUTOR = "0x1111111111111111111111111111111111111111";
const OWNER = "0x2222222222222222222222222222222222222222";
const OTHER = "0x3333333333333333333333333333333333333333";
const TOKEN_A = "0x4444444444444444444444444444444444444444";
const TOKEN_B = "0x5555555555555555555555555555555555555555";
const TOKEN_C = "0x6666666666666666666666666666666666666666";
const BYTECODE = "0x6001600055";
const CODE_HASH = ethers.utils.keccak256(BYTECODE);

function makeFixture({
  chainId = 137,
  currentTimestamp = 1900,
  deadline = 2000,
  runtimeBytecode = BYTECODE,
  callerAddress = OWNER,
  ownerAddress = OWNER,
  readinessAuthorization = {},
  receiptStatus = 1,
  deploymentReceiptStatus = 1
} = {}) {
  const amountIn = ethers.BigNumber.from("125000000000000000");
  const executionPlan = "0x1234";

  const candidate = Object.freeze({
    blockTag: 94709817,
    amountIn
  });

  const executionLegs = Object.freeze([
    { tokenIn: TOKEN_A, tokenOut: TOKEN_B },
    { tokenIn: TOKEN_B, tokenOut: TOKEN_C },
    { tokenIn: TOKEN_C, tokenOut: TOKEN_A }
  ]);

  const executorContext = Object.freeze({
    executorAddress: EXECUTOR,
    executorCodeHash: CODE_HASH
  });

  const gasEvidence = Object.freeze({
    gasUnits: 652106,
    executorContext
  });

  const qualificationPolicySnapshot = Object.freeze({
    gasPriceWei: "30000000000"
  });

  const preflight = Object.freeze({
    observationBlock: 94709817
  });

  const qualificationResult = Object.freeze({
    qualified: true,
    stage: "QUALIFIED",
    preflight
  });

  const preparationExecutionContext = Object.freeze({
    candidate,
    executionLegs,
    executionPlan
  });

  const preparedExecutionContext = Object.freeze({
    candidate,
    executionLegs,
    executionPlan,
    deadline
  });

  const qualifiedContext = Object.freeze({
    candidate,
    executionLegs,
    executionPlan,
    deadline,
    gasEvidence,
    policySnapshot: qualificationPolicySnapshot,
    qualificationResult
  });

  const simulationResult = Object.freeze({
    qualifiedContext,
    simulationResult: Object.freeze({
      receipt: Object.freeze({
        status: receiptStatus,
        gasUsed: ethers.BigNumber.from(652106)
      })
    })
  });

  const lifecycleResult = Object.freeze({
    preparationExecutionContext,
    preparedExecutionContext,
    gasEvidence,
    qualificationPolicySnapshot,
    qualifiedContext,
    simulationResult
  });

  const deploymentProvenance = Object.freeze({
    executorAddress: EXECUTOR,
    deploymentTransactionHash: "0x" + "ab".repeat(32),
    deploymentBlock: 1000,
    receiptStatus: deploymentReceiptStatus
  });

  const calls = {
    network: 0,
    blockNumber: 0,
    block: 0,
    code: 0,
    caller: 0,
    owner: 0
  };

  const provider = {
    async getNetwork() {
      calls.network += 1;
      return { chainId };
    },
    async getBlockNumber() {
      calls.blockNumber += 1;
      return 1000;
    },
    async getBlock(blockNumber) {
      calls.block += 1;
      assert.equal(blockNumber, 1000);
      return { number: 1000, timestamp: currentTimestamp };
    },
    async getCode(address) {
      calls.code += 1;
      assert.equal(address, EXECUTOR);
      return runtimeBytecode;
    }
  };

  const getCallerAddress = async () => {
    calls.caller += 1;
    return callerAddress;
  };

  const getExecutorOwner = async address => {
    calls.owner += 1;
    assert.equal(address, EXECUTOR);
    return ownerAddress;
  };

  return {
    lifecycleResult,
    deploymentProvenance,
    provider,
    calls,
    getCallerAddress,
    getExecutorOwner,
    candidate,
    executionLegs,
    executionPlan,
    gasEvidence,
    qualificationPolicySnapshot
  };
}

function run(f, overrides = {}) {
  return buildPolygonV4ReadOnlyOrchestration({
    lifecycleResult: f.lifecycleResult,
    provider: f.provider,
    deploymentProvenance: f.deploymentProvenance,
    getCallerAddress: f.getCallerAddress,
    getExecutorOwner: f.getExecutorOwner,
    ...overrides
  });
}

test("composes actual evidence builders into an unsigned flashloan intent", async () => {
  const f = makeFixture();
  const result = await run(f);

  assert.equal(result.readOnlyOrchestrationReady, true);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(result.liveExecutionAuthorized, false);
  assert.equal(result.signerAuthorized, false);
  assert.equal(result.broadcastAuthorized, false);

  assert.strictEqual(result.lifecycleResult, f.lifecycleResult);
  assert.strictEqual(
    result.readOnlyExecutionHandoffComposition.readinessEvidence,
    result.readinessEvidence
  );
  assert.strictEqual(
    result.readOnlyExecutionHandoffComposition.currentStateEvidenceComposition,
    result.currentStateEvidenceComposition
  );

  const unsigned = result.unsignedTransactionIntentEvidence;
  assert.equal(unsigned.unsignedTransactionIntentReady, true);
  assert.strictEqual(unsigned.candidate, f.candidate);
  assert.strictEqual(unsigned.executionLegs, f.executionLegs);
  assert.strictEqual(unsigned.executionPlan, f.executionPlan);

  assert.strictEqual(
    result.currentStateEvidenceComposition.currentStateEvidence
      .economicsEvidence.gasEvidence,
    f.gasEvidence
  );

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
      f.candidate.amountIn,
      f.executionPlan
    ])
  );

  for (const forbidden of [
    "nonce", "gasLimit", "gasPrice", "maxFeePerGas",
    "maxPriorityFeePerGas", "signature", "rawTransaction"
  ]) {
    assert.equal(
      Object.hasOwn(unsigned.transactionIntent, forbidden),
      false
    );
  }

  assert.deepEqual(f.calls, {
    network: 1,
    blockNumber: 1,
    block: 1,
    code: 1,
    caller: 1,
    owner: 1
  });
});

test("rejects non-Polygon provider before other acquisitions", async () => {
  const f = makeFixture({ chainId: 1 });
  await assert.rejects(run(f), /Polygon chain ID 137 required/);
  assert.deepEqual(f.calls, {
    network: 1,
    blockNumber: 0,
    block: 0,
    code: 0,
    caller: 0,
    owner: 0
  });
});

test("rejects expired deadline before account callbacks", async () => {
  const f = makeFixture({ currentTimestamp: 2000 });
  await assert.rejects(run(f), /deadline|expired/i);
  assert.equal(f.calls.caller, 0);
  assert.equal(f.calls.owner, 0);
});

test("rejects changed executor runtime bytecode", async () => {
  const f = makeFixture({ runtimeBytecode: "0x6002600055" });
  await assert.rejects(
    run(f),
    /Executor deployment code hash identity mismatch/
  );
  assert.equal(f.calls.caller, 0);
  assert.equal(f.calls.owner, 0);
});

test("rejects failed deployment provenance", async () => {
  const f = makeFixture({ deploymentReceiptStatus: 0 });
  await assert.rejects(
    run(f),
    /Successful deployment receipt status required/
  );
  assert.equal(f.calls.code, 0);
  assert.equal(f.calls.caller, 0);
});

test("rejects caller-owner mismatch", async () => {
  const f = makeFixture({ callerAddress: OTHER });
  await assert.rejects(
    run(f),
    /Caller identity does not match deployed ProfitBot owner/
  );
  assert.equal(f.calls.caller, 1);
  assert.equal(f.calls.owner, 1);
});

test("rejects unqualified simulation receipt", async () => {
  const f = makeFixture({ receiptStatus: 0 });
  await assert.rejects(
    run(f),
    /receipt|status|simulation/i
  );
  assert.equal(f.calls.network, 0);
  assert.equal(f.calls.code, 0);
});

test("rejects missing account callback before provider acquisition", async () => {
  const f = makeFixture();
  await assert.rejects(
    run(f, { getExecutorOwner: undefined }),
    /getExecutorOwner callback required/
  );
  assert.equal(f.calls.network, 0);
  assert.equal(f.calls.code, 0);
});

test("rejects malformed deployment provenance before code acquisition", async () => {
  const f = makeFixture();
  await assert.rejects(
    run(f, {
      deploymentProvenance: {
        ...f.deploymentProvenance,
        deploymentTransactionHash: "0x1234"
      }
    }),
    /Deployment transaction hash must be a bytes32 hash/
  );
  assert.equal(f.calls.code, 0);
});

test("does not import lifecycle execution, signing or broadcasting modules", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "../scripts/utils/polygonV4ReadOnlyOrchestration.js"
    ),
    "utf8"
  );

  for (const forbidden of [
    "runPreparedExecutionLifecycleComposition",
    "executeExactPlanFn",
    "executeExactQualifiedPlanFn",
    "signTransaction",
    "sendTransaction",
    "broadcastTransaction"
  ]) {
    assert.equal(source.includes(forbidden), false);
  }
});
