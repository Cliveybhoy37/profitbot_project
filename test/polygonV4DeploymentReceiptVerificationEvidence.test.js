"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { ethers } = require("ethers");

const {
  verifyPolygonV4DeploymentReceiptEvidence
} = require("../scripts/utils/polygonV4DeploymentReceiptVerificationEvidence");

const EXECUTOR = "0x1111111111111111111111111111111111111111";
const OTHER = "0x2222222222222222222222222222222222222222";
const TX_HASH = "0x" + "ab".repeat(32);
const BLOCK_HASH = "0x" + "cd".repeat(32);
const OBSERVATION_HASH = "0x" + "ef".repeat(32);
const CODE = "0x6001600055";
const CODE_HASH = ethers.utils.keccak256(CODE);

function fixture() {
  const transaction = {
    hash: TX_HASH,
    to: null,
    blockNumber: 1000,
    blockHash: BLOCK_HASH,
    transactionIndex: 0
  };
  const receipt = {
    transactionHash: TX_HASH,
    status: 1,
    blockNumber: 1000,
    blockHash: BLOCK_HASH,
    contractAddress: EXECUTOR,
    transactionIndex: 0
  };
  const blocks = {
    1000: {
      number: 1000,
      hash: BLOCK_HASH,
      transactions: [TX_HASH]
    },
    1063: { number: 1063, hash: OBSERVATION_HASH }
  };

  const calls = [];
  const provider = {
    async getNetwork() {
      calls.push("getNetwork");
      return { chainId: 137 };
    },
    async getTransaction(hash) {
      calls.push("getTransaction");
      assert.equal(hash, TX_HASH);
      return transaction;
    },
    async getTransactionReceipt(hash) {
      calls.push("getTransactionReceipt");
      assert.equal(hash, TX_HASH);
      return receipt;
    },
    async getBlockNumber() {
      calls.push("getBlockNumber");
      return 1063;
    },
    async getBlock(number) {
      calls.push(`getBlock:${number}`);
      return blocks[number];
    },
    async getCode(address, blockTag) {
      calls.push("getCode");
      assert.equal(address, EXECUTOR);
      assert.equal(blockTag, 1063);
      return CODE;
    }
  };

  const deploymentProvenance = {
    executorAddress: EXECUTOR,
    deploymentTransactionHash: TX_HASH,
    deploymentBlock: 1000,
    receiptStatus: 1
  };

  return {
    transaction,
    receipt,
    blocks,
    calls,
    provider,
    deploymentProvenance
  };
}

async function run(f, overrides = {}) {
  return verifyPolygonV4DeploymentReceiptEvidence({
    provider: f.provider,
    deploymentProvenance: f.deploymentProvenance,
    expectedRuntimeCodeHash: CODE_HASH,
    ...overrides
  });
}

test("verifies consistent deployment and keeps all authorization false", async () => {
  const f = fixture();
  const result = await run(f);
  assert.equal(result.deploymentReceiptVerified, true);
  assert.equal(result.chainId, 137);
  assert.equal(result.executorAddress, EXECUTOR);
  assert.equal(result.deploymentTransactionHash, TX_HASH);
  assert.equal(result.deploymentBlock, 1000);
  assert.equal(result.deploymentBlockHash, BLOCK_HASH);
  assert.equal(result.observationBlock, 1063);
  assert.equal(result.observationBlockHash, OBSERVATION_HASH);
  assert.equal(result.confirmations, 64);
  assert.equal(result.executorCodeHash, CODE_HASH);
  assert.equal(result.liveExecutionAuthorized, false);
  assert.equal(result.signerAuthorized, false);
  assert.equal(result.broadcastAuthorized, false);
  assert.equal(Object.isFrozen(result), true);
  assert.ok(f.calls.includes("getTransactionReceipt"));
  assert.ok(f.calls.includes("getCode"));
});

test("rejects wrong chain", async () => {
  const f = fixture();
  f.provider.getNetwork = async () => ({ chainId: 31337 });
  await assert.rejects(run(f), /chain ID 137/);
});

test("rejects missing transaction", async () => {
  const f = fixture();
  f.provider.getTransaction = async () => null;
  await assert.rejects(run(f), /transaction not found/);
});

test("rejects missing receipt", async () => {
  const f = fixture();
  f.provider.getTransactionReceipt = async () => null;
  await assert.rejects(run(f), /receipt not found/);
});

test("rejects failed receipt", async () => {
  const f = fixture();
  f.receipt.status = 0;
  await assert.rejects(run(f), /Successful deployment receipt required/);
});

test("rejects transaction hash mismatch", async () => {
  const f = fixture();
  f.transaction.hash = "0x" + "12".repeat(32);
  await assert.rejects(run(f), /transaction hash mismatch/);
});

test("rejects receipt transaction hash mismatch", async () => {
  const f = fixture();
  f.receipt.transactionHash = "0x" + "12".repeat(32);
  await assert.rejects(run(f), /receipt transaction hash mismatch/);
});

test("rejects claimed deployment block mismatch", async () => {
  const f = fixture();
  f.deploymentProvenance.deploymentBlock = 999;
  await assert.rejects(run(f), /transaction block mismatch/);
});

test("rejects receipt block mismatch", async () => {
  const f = fixture();
  f.receipt.blockNumber = 999;
  await assert.rejects(run(f), /receipt block mismatch/);
});

test("rejects receipt contract address mismatch", async () => {
  const f = fixture();
  f.receipt.contractAddress = OTHER;
  await assert.rejects(run(f), /contract address mismatch/);
});

test("rejects ordinary transaction instead of contract creation", async () => {
  const f = fixture();
  f.transaction.to = OTHER;
  await assert.rejects(run(f), /Direct contract-creation/);
});

test("rejects transaction and receipt block hash mismatch", async () => {
  const f = fixture();
  f.transaction.blockHash = "0x" + "12".repeat(32);
  await assert.rejects(run(f), /block hashes mismatch/);
});

test("rejects canonical deployment block mismatch", async () => {
  const f = fixture();
  f.blocks[1000] = {
    number: 1000,
    hash: "0x" + "12".repeat(32)
  };
  await assert.rejects(run(f), /Canonical deployment block mismatch/);
});

test("rejects insufficient confirmations", async () => {
  const f = fixture();
  await assert.rejects(
    run(f, { minimumConfirmations: 65 }),
    /Insufficient deployment confirmations/
  );
});

test("rejects empty executor bytecode", async () => {
  const f = fixture();
  f.provider.getCode = async () => "0x";
  await assert.rejects(run(f), /Nonempty deployed executor bytecode/);
});

test("rejects unexpected executor bytecode", async () => {
  const f = fixture();
  await assert.rejects(
    run(f, {
      expectedRuntimeCodeHash: "0x" + "12".repeat(32)
    }),
    /runtime code hash mismatch/
  );
});

test("rejects changing deployment block during verification", async () => {
  const f = fixture();
  const original = f.provider.getBlock;
  let reads = 0;
  f.provider.getBlock = async number => {
    if (number === 1000 && ++reads === 2) {
      return { number: 1000, hash: "0x" + "12".repeat(32) };
    }
    return original(number);
  };
  await assert.rejects(run(f), /Deployment block changed/);
});

test("rejects changing observation block during verification", async () => {
  const f = fixture();
  const original = f.provider.getBlock;
  let reads = 0;
  f.provider.getBlock = async number => {
    if (number === 1063 && ++reads === 2) {
      return { number: 1063, hash: "0x" + "12".repeat(32) };
    }
    return original(number);
  };
  await assert.rejects(run(f), /Observation block changed/);
});

test("rejects malformed deployment provenance", async () => {
  const f = fixture();
  f.deploymentProvenance.deploymentTransactionHash = "not-a-hash";
  await assert.rejects(run(f), /bytes32 hash required/);
});

test("rejects missing provider methods", async () => {
  const f = fixture();
  delete f.provider.getTransactionReceipt;
  await assert.rejects(run(f), /getTransactionReceipt function required/);
});

test("rejects missing independently trusted code hash", async () => {
  const f = fixture();
  await assert.rejects(
    run(f, { expectedRuntimeCodeHash: undefined }),
    /expected runtime code.*hash required/
  );
});

test("rejects transaction and receipt index mismatch", async () => {
  const f = fixture();
  f.receipt.transactionIndex = 1;
  await assert.rejects(run(f), /transaction index mismatch/);
});

test("rejects missing canonical transaction list", async () => {
  const f = fixture();
  delete f.blocks[1000].transactions;
  await assert.rejects(run(f), /transaction list required/);
});

test("rejects out-of-range canonical transaction index", async () => {
  const f = fixture();
  f.transaction.transactionIndex = 1;
  f.receipt.transactionIndex = 1;
  await assert.rejects(run(f), /transaction list required/);
});

test("rejects wrong transaction at canonical block index", async () => {
  const f = fixture();
  f.blocks[1000].transactions[0] = "0x" + "12".repeat(32);
  await assert.rejects(run(f), /not at canonical block index/);
});

test("rejects malformed transaction index", async () => {
  const f = fixture();
  f.transaction.transactionIndex = -1;
  await assert.rejects(run(f), /Transaction index safe integer/);
});

test("rejects malformed canonical included transaction hash", async () => {
  const f = fixture();
  f.blocks[1000].transactions[0] = "not-a-hash";
  await assert.rejects(run(f), /Canonical included transaction bytes32/);
});
