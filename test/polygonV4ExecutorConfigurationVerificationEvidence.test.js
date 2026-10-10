"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { ethers } = require("ethers");

const {
  verifyPolygonV4ExecutorConfigurationEvidence: verify
} = require("../scripts/utils/polygonV4ExecutorConfigurationVerificationEvidence");

const EXECUTOR = "0x1111111111111111111111111111111111111111";
const OWNER = "0x2222222222222222222222222222222222222222";
const POOL = "0x3333333333333333333333333333333333333333";
const WRONG = "0x4444444444444444444444444444444444444444";
const BLOCK = 1000;
const BLOCK_HASH = "0x" + "ab".repeat(32);
const CODE = "0x6001600055";
const CODE_HASH = ethers.utils.keccak256(CODE);

const ABI = new ethers.utils.Interface([
  "function owner() view returns (address)",
  "function AAVE_POOL() view returns (address)"
]);

function fixture() {
  const calls = {
    blocks: [],
    codeBlocks: [],
    contractCalls: []
  };

  const state = {
    chainId: 137,
    blockHash: BLOCK_HASH,
    code: CODE,
    owner: OWNER,
    pool: POOL,
    rawOwner: null,
    rawPool: null,
    callError: null
  };

  const provider = {
    async getNetwork() {
      return { chainId: state.chainId };
    },

    async getBlock(number) {
      calls.blocks.push(number);
      return {
        number,
        hash: state.blockHash
      };
    },

    async getCode(target, blockTag) {
      calls.codeBlocks.push({ target, blockTag });
      return state.code;
    },

    async call(transaction, blockTag) {
      calls.contractCalls.push({ transaction, blockTag });

      if (state.callError) {
        throw state.callError;
      }

      const method = ABI.getFunction(
        transaction.data.slice(0, 10)
      ).name;

      if (method === "owner") {
        return state.rawOwner ??
          ABI.encodeFunctionResult("owner", [state.owner]);
      }

      if (method === "AAVE_POOL") {
        return state.rawPool ??
          ABI.encodeFunctionResult("AAVE_POOL", [state.pool]);
      }

      throw new Error("Unexpected contract call");
    }
  };

  const evidence = {
    deploymentReceiptVerified: true,
    chainId: 137,
    executorAddress: EXECUTOR,
    observationBlock: BLOCK,
    observationBlockHash: BLOCK_HASH,
    executorCodeHash: CODE_HASH,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  };

  const options = {
    provider,
    verifiedDeploymentEvidence: evidence,
    expectedOwnerAddress: OWNER,
    expectedAavePoolAddress: POOL,
    expectedRuntimeCodeHash: CODE_HASH
  };

  return { calls, state, provider, evidence, options };
}

async function reject(change, pattern) {
  const f = fixture();
  change(f);
  await assert.rejects(verify(f.options), pattern);
}

test("verifies pinned configuration and preserves false authorizations", async () => {
  const f = fixture();
  const result = await verify(f.options);

  assert.equal(result.executorConfigurationVerified, true);
  assert.equal(result.executorOwnerAddress, OWNER);
  assert.equal(result.aavePoolAddress, POOL);
  assert.equal(result.executorCodeHash, CODE_HASH);
  assert.equal(result.observationBlock, BLOCK);
  assert.equal(result.liveExecutionAuthorized, false);
  assert.equal(result.signerAuthorized, false);
  assert.equal(result.broadcastAuthorized, false);
  assert.equal(Object.isFrozen(result), true);

  assert.deepEqual(f.calls.blocks, [BLOCK, BLOCK]);
  assert.deepEqual(f.calls.codeBlocks, [
    { target: EXECUTOR, blockTag: BLOCK }
  ]);
  assert.equal(f.calls.contractCalls.length, 2);

  for (const entry of f.calls.contractCalls) {
    assert.equal(entry.transaction.to, EXECUTOR);
    assert.equal(entry.blockTag, BLOCK);
    assert.equal(entry.transaction.value, undefined);
  }
});

test("rejects wrong chain", async () => {
  await reject(f => { f.state.chainId = 1; }, /chain ID mismatch/);
});

test("rejects missing provider method", async () => {
  await reject(f => {
    delete f.provider.call;
  }, /Provider call required/);
});

test("rejects malformed deployment evidence", async () => {
  await reject(f => {
    f.evidence.deploymentReceiptVerified = false;
  }, /Verified deployment evidence required/);
});

test("rejects invalid expected owner", async () => {
  await reject(f => {
    f.options.expectedOwnerAddress = ethers.constants.AddressZero;
  }, /Expected owner must be nonzero/);
});

test("rejects invalid expected Aave pool", async () => {
  await reject(f => {
    f.options.expectedAavePoolAddress = "invalid";
  }, /Expected Aave pool must be a valid address/);
});

test("rejects missing trusted code hash", async () => {
  await reject(f => {
    delete f.options.expectedRuntimeCodeHash;
  }, /Independently trusted runtime code hash/);
});

test("rejects wrong executor owner", async () => {
  await reject(f => {
    f.state.owner = WRONG;
  }, /Executor owner mismatch/);
});

test("rejects wrong Aave pool", async () => {
  await reject(f => {
    f.state.pool = WRONG;
  }, /Executor Aave pool mismatch/);
});

test("rejects zero owner", async () => {
  await reject(f => {
    f.state.owner = ethers.constants.AddressZero;
  }, /owner result must be nonzero/);
});

test("rejects zero Aave pool", async () => {
  await reject(f => {
    f.state.pool = ethers.constants.AddressZero;
  }, /AAVE_POOL result must be nonzero/);
});

test("rejects malformed owner return data", async () => {
  await reject(f => {
    f.state.rawOwner = "0x1234";
  }, /owner returned malformed ABI data/);
});

test("rejects malformed Aave pool return data", async () => {
  await reject(f => {
    f.state.rawPool = "0x1234";
  }, /AAVE_POOL returned malformed ABI data/);
});

test("rejects read-only contract call failure", async () => {
  await reject(f => {
    f.state.callError = new Error("RPC call failed");
  }, /RPC call failed/);
});

test("rejects missing executor bytecode", async () => {
  await reject(f => {
    f.state.code = "0x";
  }, /runtime code missing or malformed/);
});

test("rejects wrong executor runtime code", async () => {
  await reject(f => {
    f.state.code = "0x6000";
  }, /runtime code hash mismatch/);
});

test("rejects initial observation block hash mismatch", async () => {
  await reject(f => {
    f.state.blockHash = "0x" + "cd".repeat(32);
  }, /Observation block identity mismatch/);
});

test("rejects changing observation block during verification", async () => {
  const f = fixture();
  let reads = 0;

  f.provider.getBlock = async number => {
    f.calls.blocks.push(number);
    reads += 1;
    return {
      number,
      hash: reads === 1
        ? BLOCK_HASH
        : "0x" + "cd".repeat(32)
    };
  };

  await assert.rejects(
    verify(f.options),
    /Observation block identity mismatch/
  );
});
