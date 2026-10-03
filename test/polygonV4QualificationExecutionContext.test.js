"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const { ethers } =
  require("ethers");

const {
  acquireQualificationExecutionContext
} = require(
  "../scripts/utils/polygonV4QualificationExecutionContext"
);

function policySnapshot() {
  return {
    currentBlock: 12345678,
    gasPriceWei:
      ethers.BigNumber.from(
        "30000000000"
      ),
    premiumBps: 9,
    provenance: {
      currentBlock:
        "PROVIDER_OBSERVED",
      gasPrice:
        "OBSERVED_AT_QUALIFICATION",
      aavePremium:
        "QUALIFICATION_BLOCK_PINNED"
    }
  };
}

test(
  "binds execution deadline to the exact qualification policy block",
  async () => {
    const snapshot =
      policySnapshot();

    const calls = [];

    const provider = {
      async getBlock(blockNumber) {
        calls.push(blockNumber);

        assert.equal(
          blockNumber,
          snapshot.currentBlock
        );

        return {
          number:
            snapshot.currentBlock,
          timestamp:
            2000000000
        };
      }
    };

    let policyCalls = 0;

    const result =
      await acquireQualificationExecutionContext({
        provider,
        deadlineSeconds: 300,
        acquirePolicySnapshotFn:
          async ({ provider: suppliedProvider }) => {
            policyCalls += 1;

            assert.equal(
              suppliedProvider,
              provider
            );

            return snapshot;
          }
      });

    assert.equal(
      policyCalls,
      1
    );

    assert.deepEqual(
      calls,
      [
        snapshot.currentBlock
      ]
    );

    assert.equal(
      result.policySnapshot,
      snapshot
    );

    assert.equal(
      result.policyBlockTimestamp,
      2000000000
    );

    assert.equal(
      result.deadline,
      2000000300
    );
  }
);

test(
  "fails closed when the exact policy block is unavailable",
  async () => {
    const snapshot =
      policySnapshot();

    const provider = {
      async getBlock(blockNumber) {
        assert.equal(
          blockNumber,
          snapshot.currentBlock
        );

        return null;
      }
    };

    await assert.rejects(
      acquireQualificationExecutionContext({
        provider,
        deadlineSeconds: 300,
        acquirePolicySnapshotFn:
          async () => snapshot
      }),
      /policy block/i
    );
  }
);

test(
  "rejects invalid deadline duration before policy acquisition",
  async () => {
    let policyCalls = 0;

    await assert.rejects(
      acquireQualificationExecutionContext({
        provider: {},
        deadlineSeconds: 0,
        acquirePolicySnapshotFn:
          async () => {
            policyCalls += 1;
            return policySnapshot();
          }
      }),
      /deadline/i
    );

    assert.equal(
      policyCalls,
      0
    );
  }
);

test(
  "rejects a returned block that does not match the policy block",
  async () => {
    const snapshot =
      policySnapshot();

    const provider = {
      async getBlock() {
        return {
          number:
            snapshot.currentBlock + 1,
          timestamp:
            2000000000
        };
      }
    };

    await assert.rejects(
      acquireQualificationExecutionContext({
        provider,
        deadlineSeconds: 300,
        acquirePolicySnapshotFn:
          async () => snapshot
      }),
      /block number mismatch/i
    );
  }
);

test(
  "rejects invalid policy block timestamp",
  async () => {
    const snapshot =
      policySnapshot();

    const provider = {
      async getBlock() {
        return {
          number:
            snapshot.currentBlock,
          timestamp: 0
        };
      }
    };

    await assert.rejects(
      acquireQualificationExecutionContext({
        provider,
        deadlineSeconds: 300,
        acquirePolicySnapshotFn:
          async () => snapshot
      }),
      /timestamp/i
    );
  }
);

test(
  "rejects deadline overflow",
  async () => {
    const snapshot =
      policySnapshot();

    const provider = {
      async getBlock() {
        return {
          number:
            snapshot.currentBlock,
          timestamp:
            Number.MAX_SAFE_INTEGER - 10
        };
      }
    };

    await assert.rejects(
      acquireQualificationExecutionContext({
        provider,
        deadlineSeconds: 300,
        acquirePolicySnapshotFn:
          async () => snapshot
      }),
      /deadline/i
    );
  }
);

test(
  "rejects invalid policy snapshot before block acquisition",
  async () => {
    let blockCalls = 0;

    const provider = {
      async getBlock() {
        blockCalls += 1;

        return {
          number: 1,
          timestamp:
            2000000000
        };
      }
    };

    await assert.rejects(
      acquireQualificationExecutionContext({
        provider,
        deadlineSeconds: 300,
        acquirePolicySnapshotFn:
          async () => ({
            currentBlock: 0
          })
      }),
      /currentBlock/i
    );

    assert.equal(
      blockCalls,
      0
    );
  }
);

test(
  "rejects invalid policy acquisition function before acquisition",
  async () => {
    await assert.rejects(
      acquireQualificationExecutionContext({
        provider: {},
        deadlineSeconds: 300,
        acquirePolicySnapshotFn:
          null
      }),
      /acquirePolicySnapshotFn/i
    );
  }
);
