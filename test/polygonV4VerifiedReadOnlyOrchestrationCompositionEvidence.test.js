"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { ethers } = require("ethers");

const {
  buildPolygonV4VerifiedReadOnlyOrchestrationCompositionEvidence
} = require(
  "../scripts/utils/polygonV4VerifiedReadOnlyOrchestrationCompositionEvidence"
);

const EXECUTOR = "0x1111111111111111111111111111111111111111";
const OWNER = "0x" + "22".repeat(20);
const POOL = "0x3333333333333333333333333333333333333333";
const TOKEN_A = "0x4444444444444444444444444444444444444444";
const TOKEN_B = "0x" + "55".repeat(20);
const TOKEN_C = "0x" + "66".repeat(20);
const CODE = "0x6001600055";
const CODE_HASH = ethers.utils.keccak256(CODE);
const TX_HASH = "0x" + "ab".repeat(32);
const DEPLOYMENT_HASH = "0x" + "cd".repeat(32);
const OBSERVATION_HASH = "0x" + "ef".repeat(32);

function makeLifecycle() {
  const amountIn = ethers.BigNumber.from("125000000000000000");
  const candidate = Object.freeze({
    blockTag: 94709817,
    amountIn
  });

  const executionLegs = Object.freeze([
    { tokenIn: TOKEN_A, tokenOut: TOKEN_B },
    { tokenIn: TOKEN_B, tokenOut: TOKEN_C },
    { tokenIn: TOKEN_C, tokenOut: TOKEN_A }
  ]);

  const executionPlan = "0x1234";
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
  const preflight = Object.freeze({ observationBlock: 94709817 });
  const qualificationResult = Object.freeze({
    qualified: true,
    stage: "QUALIFIED",
    preflight
  });
  const preparationExecutionContext = Object.freeze({
    candidate, executionLegs, executionPlan
  });
  const preparedExecutionContext = Object.freeze({
    candidate, executionLegs, executionPlan, deadline: 2000
  });
  const qualifiedContext = Object.freeze({
    candidate,
    executionLegs,
    executionPlan,
    deadline: 2000,
    gasEvidence,
    policySnapshot: qualificationPolicySnapshot,
    qualificationResult
  });
  const simulationResult = Object.freeze({
    qualifiedContext,
    simulationResult: Object.freeze({
      receipt: Object.freeze({
        status: 1,
        gasUsed: ethers.BigNumber.from(652106)
      })
    })
  });

  return Object.freeze({
    preparationExecutionContext,
    preparedExecutionContext,
    gasEvidence,
    qualificationPolicySnapshot,
    qualifiedContext,
    simulationResult
  });
}

function fixture({
  chainId = 137,
  caller = OWNER,
  callbackOwner = OWNER,
  code = CODE,
  receiptStatus = 1,
  pool = POOL,
  owner = OWNER,
  latestBlock = 1063,
  observationHash = OBSERVATION_HASH,
  changeObservationHashOnRecheck = false
} = {}) {
  const deploymentProvenance = Object.freeze({
    executorAddress: EXECUTOR,
    deploymentTransactionHash: TX_HASH,
    deploymentBlock: 1000,
    deploymentBlockHash: DEPLOYMENT_HASH,
    receiptStatus: 1
  });

  const ownerSelector = ethers.utils.id("owner()").slice(0, 10);
  const poolSelector = ethers.utils.id("AAVE_POOL()").slice(0, 10);

  let observationBlockReads = 0;

  const provider = {
    async getNetwork() {
      return { chainId };
    },
    async getBlockNumber() {
      return latestBlock;
    },
    async getBlock(number) {
      if (number === 1000) {
        return {
          number: 1000,
          hash: DEPLOYMENT_HASH,
          timestamp: 1800,
          transactions: [TX_HASH]
        };
      }
      if (number === latestBlock) {
        observationBlockReads += 1;

        const hash =
          changeObservationHashOnRecheck &&
          observationBlockReads > 1
            ? "0x" + "aa".repeat(32)
            : observationHash;

        return {
          number: latestBlock,
          hash,
          timestamp: 1900
        };
      }
      throw new Error("Unexpected block request");
    },
    async getTransaction(hash) {
      assert.equal(hash, TX_HASH);
      return {
        hash: TX_HASH,
        blockNumber: 1000,
        blockHash: DEPLOYMENT_HASH,
        transactionIndex: 0,
        to: null,
        creates: EXECUTOR
      };
    },
    async getTransactionReceipt(hash) {
      assert.equal(hash, TX_HASH);
      return {
        transactionHash: TX_HASH,
        blockNumber: 1000,
        blockHash: DEPLOYMENT_HASH,
        transactionIndex: 0,
        contractAddress: EXECUTOR,
        status: receiptStatus
      };
    },
    async getCode(address) {
      assert.equal(
        ethers.utils.getAddress(address),
        ethers.utils.getAddress(EXECUTOR)
      );
      return code;
    },
    async call(transaction) {
      assert.equal(
        ethers.utils.getAddress(transaction.to),
        ethers.utils.getAddress(EXECUTOR)
      );
      if (transaction.data === ownerSelector) {
        return ethers.utils.defaultAbiCoder.encode(["address"], [owner]);
      }
      if (transaction.data === poolSelector) {
        return ethers.utils.defaultAbiCoder.encode(["address"], [pool]);
      }
      throw new Error("Unexpected read-only contract call");
    }
  };

  return {
    lifecycleResult: makeLifecycle(),
    provider,
    deploymentProvenance,
    expectedRuntimeCodeHash: CODE_HASH,
    expectedOwnerAddress: OWNER,
    expectedAavePoolAddress: POOL,
    minimumConfirmations: 64,
    getCallerAddress: async () => caller,
    getExecutorOwner: async () => callbackOwner
  };
}

test("composes independently verified deployment and unsigned intent", async () => {
  const result =
    await buildPolygonV4VerifiedReadOnlyOrchestrationCompositionEvidence(
      fixture()
    );

  assert.equal(result.verifiedReadOnlyOrchestrationReady, true);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(result.observationsAreAtomic, false);
  assert.equal(result.liveExecutionAuthorized, false);
  assert.equal(result.signerAuthorized, false);
  assert.equal(result.broadcastAuthorized, false);

  const verification = result.deploymentConfigurationVerificationEvidence;
  const orchestration = result.readOnlyOrchestrationEvidence;
  const unsigned = result.unsignedTransactionIntentEvidence;

  assert.equal(verification.deploymentConfigurationVerified, true);
  assert.equal(orchestration.readOnlyOrchestrationReady, true);
  assert.strictEqual(
    unsigned,
    orchestration.unsignedTransactionIntentEvidence
  );
  assert.equal(unsigned.transactionIntent.to, EXECUTOR);
  assert.equal(unsigned.transactionIntent.from, OWNER);
  assert.deepEqual(
    Object.keys(unsigned.transactionIntent).sort(),
    ["data", "from", "to", "value"]
  );
});

test("rejects a non-Polygon provider", async () => {
  await assert.rejects(
    buildPolygonV4VerifiedReadOnlyOrchestrationCompositionEvidence(
      fixture({ chainId: 1 })
    ),
    /Polygon|chain identity|chainId/i
  );
});

test("rejects a failed deployment receipt", async () => {
  await assert.rejects(
    buildPolygonV4VerifiedReadOnlyOrchestrationCompositionEvidence(
      fixture({ receiptStatus: 0 })
    ),
    /receipt|status/i
  );
});

test("rejects a changed executor runtime", async () => {
  await assert.rejects(
    buildPolygonV4VerifiedReadOnlyOrchestrationCompositionEvidence(
      fixture({ code: "0x6002600055" })
    ),
    /code hash|runtime code|runtime bytecode/i
  );
});

test("rejects the wrong verified executor owner", async () => {
  await assert.rejects(
    buildPolygonV4VerifiedReadOnlyOrchestrationCompositionEvidence(
      fixture({ owner: POOL })
    ),
    /executor owner mismatch/i
  );
});

test("rejects the wrong verified Aave pool", async () => {
  await assert.rejects(
    buildPolygonV4VerifiedReadOnlyOrchestrationCompositionEvidence(
      fixture({ pool: OWNER })
    ),
    /executor Aave pool mismatch/i
  );
});

test("rejects callback owner disagreement with verified owner", async () => {
  await assert.rejects(
    buildPolygonV4VerifiedReadOnlyOrchestrationCompositionEvidence(
      fixture({ callbackOwner: POOL, caller: POOL })
    ),
    /Account owner mismatch/i
  );
});

test("rejects caller disagreement with executor owner", async () => {
  await assert.rejects(
    buildPolygonV4VerifiedReadOnlyOrchestrationCompositionEvidence(
      fixture({ caller: POOL })
    ),
    /Caller identity does not match deployed ProfitBot owner/i
  );
});

test("rejects insufficient confirmations", async () => {
  await assert.rejects(
    buildPolygonV4VerifiedReadOnlyOrchestrationCompositionEvidence(
      fixture({ latestBlock: 1001 })
    ),
    /Insufficient deployment confirmations/i
  );
});

test("rejects an observation block hash that changes on recheck", async () => {
  await assert.rejects(
    buildPolygonV4VerifiedReadOnlyOrchestrationCompositionEvidence(
      fixture({ changeObservationHashOnRecheck: true })
    ),
    /observation block hash.*(changed|mismatch)|observation block.*(changed|mismatch)/i
  );
});

test("rejects missing trusted runtime code hash", async () => {
  const input = fixture();
  delete input.expectedRuntimeCodeHash;

  await assert.rejects(
    buildPolygonV4VerifiedReadOnlyOrchestrationCompositionEvidence(input),
    /hash/i
  );
});

test("rejects missing account callback before provider acquisition", async () => {
  const input = fixture();
  delete input.getExecutorOwner;

  await assert.rejects(
    buildPolygonV4VerifiedReadOnlyOrchestrationCompositionEvidence(input),
    /callback/i
  );
});

test("does not import execution, signing or broadcast modules", () => {
  const fs = require("node:fs");
  const path = require("node:path");

  const source = fs.readFileSync(
    path.join(
      __dirname,
      "../scripts/utils/polygonV4VerifiedReadOnlyOrchestrationCompositionEvidence.js"
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
