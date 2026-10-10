"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { ethers } = require("ethers");
const {
  buildPolygonV4DeploymentConfigurationVerificationCompositionEvidence: verify
} = require("../scripts/utils/polygonV4DeploymentConfigurationVerificationCompositionEvidence");

const EXECUTOR = "0x1111111111111111111111111111111111111111";
const OWNER = "0x2222222222222222222222222222222222222222";
const POOL = "0x3333333333333333333333333333333333333333";
const TRANSACTION = "0x" + "44".repeat(32);
const DEPLOYMENT_HASH = "0x" + "55".repeat(32);
const OBSERVATION_HASH = "0x" + "66".repeat(32);
const CODE = "0x6001600055";
const CODE_HASH = ethers.utils.keccak256(CODE);
const ABI = new ethers.utils.Interface([
  "function owner() view returns (address)",
  "function AAVE_POOL() view returns (address)"
]);

function fixture() {
  const calls = [];
  const state = {
    chainId: 137,
    owner: OWNER,
    pool: POOL,
    code: CODE,
    transaction: true,
    receipt: true,
    transactionTo: null,
    transactionIndex: 0,
    receiptIndex: 0,
    deploymentHash: DEPLOYMENT_HASH,
    observationHash: OBSERVATION_HASH,
    observationBlock: 1063,
    blockNumber: 1063,
    confirmations: 64,
    receiptStatus: 1,
    badReturn: null,
    throwCall: false,
    finalReorg: false,
    finalBlockCalls: 0,
    blockTransactions: [TRANSACTION]
  };

  const provider = {
    async getNetwork() {
      calls.push(["getNetwork"]);
      return { chainId: state.chainId };
    },
    async getTransaction(hash) {
      calls.push(["getTransaction", hash]);
      return state.transaction ? {
        hash: TRANSACTION,
        to: state.transactionTo,
        from: OWNER,
        nonce: 1,
        blockNumber: 1000,
        blockHash: DEPLOYMENT_HASH,
        transactionIndex: state.transactionIndex,
        creates: EXECUTOR
      } : null;
    },
    async getTransactionReceipt(hash) {
      calls.push(["getTransactionReceipt", hash]);
      return state.receipt ? {
        transactionHash: TRANSACTION,
        contractAddress: EXECUTOR,
        blockNumber: 1000,
        blockHash: DEPLOYMENT_HASH,
        transactionIndex: state.receiptIndex,
        status: state.receiptStatus
      } : null;
    },
    async getBlockNumber() {
      calls.push(["getBlockNumber"]);
      return state.blockNumber;
    },
    async getBlock(number) {
      calls.push(["getBlock", number]);
      if (number === 1000) {
        return {
          number: 1000,
          hash: state.deploymentHash,
          transactions: state.blockTransactions
        };
      }
      if (number === state.observationBlock) {
        state.finalBlockCalls++;
        return {
          number,
          hash: state.finalReorg && state.finalBlockCalls >= 5
            ? "0x" + "77".repeat(32)
            : state.observationHash,
          transactions: []
        };
      }
      return null;
    },
    async getCode(address, blockTag) {
      calls.push(["getCode", address, blockTag]);
      return state.code;
    },
    async call(tx, blockTag) {
      calls.push(["call", tx.to, tx.data, blockTag]);
      if (state.throwCall) {
        throw new Error("Synthetic contract call failure");
      }
      const method = ABI.parseTransaction({ data: tx.data }).name;
      if (state.badReturn === method) {
        return "0x1234";
      }
      return ABI.encodeFunctionResult(
        method,
        [method === "owner" ? state.owner : state.pool]
      );
    }
  };

  const deploymentProvenance = {
    executorAddress: EXECUTOR,
    deploymentTransactionHash: TRANSACTION,
    deploymentBlock: 1000,
    deploymentBlockHash: DEPLOYMENT_HASH,
    receiptStatus: 1
  };

  const options = {
    provider,
    deploymentProvenance,
    expectedRuntimeCodeHash: CODE_HASH,
    expectedOwnerAddress: OWNER,
    expectedAavePoolAddress: POOL,
    minimumConfirmations: 64
  };

  return { calls, state, provider, deploymentProvenance, options };
}

async function rejects(change, pattern) {
  const f = fixture();
  change(f);
  await assert.rejects(verify(f.options), pattern);
}

test("composes both verifiers with frozen false-authorization evidence", async () => {
  const f = fixture();
  const result = await verify(f.options);
  assert.equal(result.deploymentConfigurationVerified, true);
  assert.equal(result.deploymentReceiptVerified, true);
  assert.equal(result.executorConfigurationVerified, true);
  assert.equal(result.chainId, 137);
  assert.equal(result.executorAddress, EXECUTOR);
  assert.equal(result.executorOwnerAddress, OWNER);
  assert.equal(result.aavePoolAddress, POOL);
  assert.equal(result.executorCodeHash, CODE_HASH);
  assert.equal(result.observationBlock, 1063);
  assert.equal(result.observationBlockHash, OBSERVATION_HASH);
  assert.equal(result.confirmations, 64);
  assert.equal(result.liveExecutionAuthorized, false);
  assert.equal(result.signerAuthorized, false);
  assert.equal(result.broadcastAuthorized, false);
  assert.equal(Object.isFrozen(result), true);
  assert.ok(f.calls.some(c => c[0] === "getTransaction"));
  assert.ok(f.calls.some(c => c[0] === "getTransactionReceipt"));
  assert.ok(f.calls.some(c => c[0] === "getCode" && c[2] === 1063));
  assert.equal(f.calls.filter(c => c[0] === "call").length, 2);
  assert.ok(f.calls.filter(c => c[0] === "call").every(c => c[3] === 1063));
});

test("uses independently trusted owner and pool values", async () => {
  const f = fixture();
  const result = await verify(f.options);
  assert.equal(result.executorOwnerAddress, f.options.expectedOwnerAddress);
  assert.equal(result.aavePoolAddress, f.options.expectedAavePoolAddress);
});

test("does not accept injected verifiedDeploymentEvidence as an input", async () => {
  const f = fixture();
  f.options.verifiedDeploymentEvidence = {
    deploymentReceiptVerified: true,
    chainId: 137
  };
  f.state.transaction = false;
  await assert.rejects(verify(f.options), /transaction/i);
});

test("rejects provider missing required method", async () => {
  await rejects(f => { delete f.provider.call; }, /provider/i);
});

test("rejects missing deployment provenance", async () => {
  await rejects(f => { delete f.options.deploymentProvenance; }, /provenance/i);
});

test("rejects missing trusted runtime code hash", async () => {
  await rejects(f => { delete f.options.expectedRuntimeCodeHash; }, /hash/i);
});

test("rejects zero trusted owner", async () => {
  await rejects(f => {
    f.options.expectedOwnerAddress = ethers.constants.AddressZero;
  }, /owner/i);
});

test("rejects invalid trusted Aave pool", async () => {
  await rejects(f => {
    f.options.expectedAavePoolAddress = "invalid";
  }, /pool/i);
});

test("rejects invalid minimum confirmations", async () => {
  await rejects(f => {
    f.options.minimumConfirmations = 0;
  }, /confirmations/i);
});

test("rejects wrong Polygon chain", async () => {
  await rejects(f => { f.state.chainId = 31337; }, /chain/i);
});

test("rejects missing deployment transaction", async () => {
  await rejects(f => { f.state.transaction = false; }, /transaction/i);
});

test("rejects missing deployment receipt", async () => {
  await rejects(f => { f.state.receipt = false; }, /receipt/i);
});

test("rejects noncanonical deployment transaction inclusion", async () => {
  await rejects(f => {
    f.state.blockTransactions = ["0x" + "88".repeat(32)];
  }, /transaction|canonical|inclusion|index/i);
});

test("rejects incorrect executor owner", async () => {
  await rejects(f => {
    f.state.owner = "0x9999999999999999999999999999999999999999";
  }, /owner/i);
});

test("rejects incorrect Aave pool", async () => {
  await rejects(f => {
    f.state.pool = "0x9999999999999999999999999999999999999999";
  }, /pool/i);
});

test("rejects incorrect executor runtime bytecode", async () => {
  await rejects(f => { f.state.code = "0x6002"; }, /code|hash/i);
});

test("rejects insufficient deployment confirmations", async () => {
  await rejects(f => { f.state.blockNumber = 1062; }, /confirmations/i);
});

test("rejects deployment observation block hash mismatch", async () => {
  await rejects(f => {
    f.state.observationHash = "0x" + "99".repeat(32);
    f.state.finalReorg = true;
    f.state.finalBlockCalls = 2;
  }, /block|identity|hash/i);
});

test("rejects final observation-block reorganization", async () => {
  await rejects(f => {
    f.state.finalReorg = true;
  }, /block|identity|hash/i);
});

test("rejects malformed owner ABI response", async () => {
  await rejects(f => { f.state.badReturn = "owner"; }, /owner|return|ABI/i);
});

test("rejects provider contract-call failure", async () => {
  await rejects(f => { f.state.throwCall = true; }, /call|failure/i);
});
