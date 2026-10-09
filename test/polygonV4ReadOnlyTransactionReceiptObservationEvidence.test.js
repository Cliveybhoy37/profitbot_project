"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  observeReadOnlyTransactionReceiptEvidence
} = require(
  "../scripts/utils/polygonV4ReadOnlyTransactionReceiptObservationEvidence"
);

const TX_HASH = "0x" + "ab".repeat(32);
const BLOCK_HASH = "0x" + "cd".repeat(32);
const OTHER_HASH = "0x" + "ef".repeat(32);

function makeFixture(overrides = {}) {
  const calls = [];

  const receipt = {
    transactionHash: TX_HASH,
    blockNumber: 100,
    blockHash: BLOCK_HASH,
    status: 1,
    gasUsed: ethers.BigNumber.from("423817"),
    ...overrides.receipt
  };

  const block = {
    number: 100,
    hash: BLOCK_HASH,
    ...overrides.block
  };

  const provider = {
    async getNetwork() {
      calls.push("getNetwork");
      return { chainId: overrides.chainId ?? 137 };
    },

    async getTransactionReceipt(hash) {
      calls.push(["getTransactionReceipt", hash]);
      return overrides.missingReceipt ? null : receipt;
    },

    async getBlock(number) {
      calls.push(["getBlock", number]);
      return overrides.missingBlock ? null : block;
    },

    async getBlockNumber() {
      calls.push("getBlockNumber");
      return overrides.head ?? 105;
    }
  };

  return { provider, receipt, block, calls };
}

async function observe(fixture, overrides = {}) {
  return observeReadOnlyTransactionReceiptEvidence({
    provider: fixture.provider,
    signedTransactionHash: TX_HASH,
    minimumConfirmations: 3,
    ...overrides
  });
}

test("observes an exact Polygon receipt once and preserves gasUsed", async () => {
  const fixture = makeFixture();

  const evidence = await observe(fixture);

  assert.equal(evidence.readOnlyTransactionReceiptObservationReady, true);
  assert.equal(evidence.receipt, fixture.receipt);
  assert.equal(evidence.gasUsed, fixture.receipt.gasUsed);
  assert.equal(evidence.signedTransactionHash, TX_HASH);
  assert.equal(evidence.confirmations, 6);
  assert.equal(Object.isFrozen(evidence), true);

  assert.deepEqual(fixture.calls, [
    "getNetwork",
    ["getTransactionReceipt", TX_HASH],
    ["getBlock", 100],
    "getBlockNumber"
  ]);
});

test("rejects the wrong chain before requesting a receipt", async () => {
  const fixture = makeFixture({ chainId: 1 });

  await assert.rejects(observe(fixture), /Polygon|chain|137/i);

  assert.deepEqual(fixture.calls, ["getNetwork"]);
});

test("rejects a missing receipt without retrying", async () => {
  const fixture = makeFixture({ missingReceipt: true });

  await assert.rejects(observe(fixture), /receipt/i);

  assert.equal(
    fixture.calls.filter(call =>
      Array.isArray(call) && call[0] === "getTransactionReceipt"
    ).length,
    1
  );
});

test("accepts equivalent transaction hash bytes with different casing", async () => {
  const fixture = makeFixture({
    receipt: {
      transactionHash: TX_HASH.toUpperCase().replace("0X", "0x")
    }
  });

  const evidence = await observe(fixture);

  assert.equal(evidence.signedTransactionHash, TX_HASH);
  assert.equal(evidence.receipt, fixture.receipt);
  assert.equal(evidence.gasUsed, fixture.receipt.gasUsed);
  assert.equal(evidence.confirmations, 6);
});

test("rejects a mismatched receipt transaction hash", async () => {
  const fixture = makeFixture({
    receipt: { transactionHash: OTHER_HASH }
  });

  await assert.rejects(observe(fixture), /hash|transaction/i);
});

test("rejects a reverted transaction", async () => {
  const fixture = makeFixture({ receipt: { status: 0 } });

  await assert.rejects(observe(fixture), /status|success|receipt/i);
});

test("rejects missing canonical block evidence", async () => {
  const fixture = makeFixture({ missingBlock: true });

  await assert.rejects(observe(fixture), /block/i);
});

test("rejects a receipt block hash that differs from the observed block", async () => {
  const fixture = makeFixture({ block: { hash: OTHER_HASH } });

  await assert.rejects(observe(fixture), /block|hash|canonical/i);
});

test("rejects insufficient confirmation depth", async () => {
  const fixture = makeFixture({ head: 101 });

  await assert.rejects(observe(fixture), /confirmation|depth/i);
});

test("rejects invalid gasUsed", async () => {
  for (const gasUsed of [
    ethers.BigNumber.from(0),
    "423817",
    423817
  ]) {
    const fixture = makeFixture({ receipt: { gasUsed } });

    await assert.rejects(observe(fixture), /gas/i);
  }
});

test("rejects an invalid explicit confirmation policy", async () => {
  for (const minimumConfirmations of [0, -1, 1.5, "3"]) {
    const fixture = makeFixture();

    await assert.rejects(
      observe(fixture, { minimumConfirmations }),
      /confirmation|integer|positive/i
    );

    assert.deepEqual(fixture.calls, []);
  }
});

test("rejects a provider missing a required read-only method", async () => {
  const fixture = makeFixture();

  delete fixture.provider.getTransactionReceipt;

  await assert.rejects(
    observe(fixture),
    /provider|method|getTransactionReceipt/i
  );

  assert.deepEqual(fixture.calls, []);
});

test("rejects invalid receipt block numbers", async () => {
  for (const blockNumber of [
    0,
    -1,
    1.5,
    "100",
    Number.MAX_SAFE_INTEGER + 1
  ]) {
    const fixture = makeFixture({
      receipt: { blockNumber }
    });

    await assert.rejects(
      observe(fixture),
      /block|integer|positive/i
    );
  }
});

test("rejects an observed block with a mismatched number", async () => {
  const fixture = makeFixture({
    block: { number: 101 }
  });

  await assert.rejects(
    observe(fixture),
    /block|number|mismatch/i
  );
});

test("rejects invalid observed chain heights", async () => {
  for (const head of [
    0,
    -1,
    1.5,
    "105",
    Number.MAX_SAFE_INTEGER + 1
  ]) {
    const fixture = makeFixture({ head });

    await assert.rejects(
      observe(fixture),
      /head|integer|positive/i
    );
  }
});

test("rejects an observed head below the receipt block", async () => {
  const fixture = makeFixture({ head: 99 });

  await assert.rejects(
    observe(fixture),
    /head|receipt|block/i
  );
});

test("accepts maximum safe confirmation arithmetic", async () => {
  const fixture = makeFixture({
    receipt: { blockNumber: 1 },
    block: { number: 1 },
    head: Number.MAX_SAFE_INTEGER
  });

  const evidence = await observe(fixture);

  assert.equal(evidence.confirmations, Number.MAX_SAFE_INTEGER);
  assert.equal(Number.isSafeInteger(evidence.confirmations), true);
});

test("rejects a chain head beyond safe integer range", async () => {
  const fixture = makeFixture({
    receipt: { blockNumber: 1 },
    block: { number: 1 },
    head: Number.MAX_SAFE_INTEGER + 1
  });

  await assert.rejects(
    observe(fixture),
    /head|safe|integer|positive/i
  );
});
