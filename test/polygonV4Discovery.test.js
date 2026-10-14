"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  POOL_MANAGER,
  INITIALIZE_EVENT,
  INITIALIZE_TOPIC,
  buildDiscoveryChunks,
  computePoolId,
  decodeInitializeLog,
  dedupeDiscoveredPools,
  discoverInitializeChunk
} = require("../scripts/utils/polygonV4Discovery");

const IFACE =
  new ethers.utils.Interface([INITIALIZE_EVENT]);

const POOL_KEY = Object.freeze({
  currency0:
    "0x0000000000000000000000000000000000000001",
  currency1:
    "0x0000000000000000000000000000000000000002",
  fee: 75,
  tickSpacing: 1,
  hooks:
    "0x0000000000000000000000000000000000000000"
});

function makeInitializeLog({
  poolKey = POOL_KEY,
  blockNumber = 123,
  transactionHash =
    `0x${"11".repeat(32)}`,
  logIndex = 0
} = {}) {
  const poolId = computePoolId(poolKey);

  const event =
    IFACE.getEvent("Initialize");

  const encoded =
    IFACE.encodeEventLog(
      event,
      [
        poolId,
        poolKey.currency0,
        poolKey.currency1,
        poolKey.fee,
        poolKey.tickSpacing,
        poolKey.hooks,
        ethers.BigNumber.from("123456789"),
        -42
      ]
    );

  return {
    address: POOL_MANAGER,
    topics: encoded.topics,
    data: encoded.data,
    blockNumber,
    transactionHash,
    logIndex
  };
}

test("buildDiscoveryChunks creates inclusive 10k ranges", () => {
  assert.deepEqual(
    buildDiscoveryChunks({
      fromBlock: 100,
      toBlock: 20149,
      chunkSize: 10000
    }),
    [
      { fromBlock: 100, toBlock: 10099 },
      { fromBlock: 10100, toBlock: 20099 },
      { fromBlock: 20100, toBlock: 20149 }
    ]
  );
});

test("buildDiscoveryChunks rejects invalid ranges", () => {
  assert.throws(
    () =>
      buildDiscoveryChunks({
        fromBlock: 20,
        toBlock: 19
      }),
    /toBlock/
  );

  assert.throws(
    () =>
      buildDiscoveryChunks({
        fromBlock: 0,
        toBlock: 1,
        chunkSize: 0
      }),
    /chunkSize/
  );
});

test("computePoolId matches abi.encode PoolKey hashing", () => {
  const expected =
    ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        [
          "address",
          "address",
          "uint24",
          "int24",
          "address"
        ],
        [
          POOL_KEY.currency0,
          POOL_KEY.currency1,
          POOL_KEY.fee,
          POOL_KEY.tickSpacing,
          POOL_KEY.hooks
        ]
      )
    );

  assert.equal(
    computePoolId(POOL_KEY),
    expected
  );
});

test("decodeInitializeLog reconstructs verified PoolKey", () => {
  const log = makeInitializeLog();
  const decoded = decodeInitializeLog(log);

  assert.equal(
    decoded.poolId,
    computePoolId(POOL_KEY).toLowerCase()
  );

  assert.deepEqual(
    decoded.poolKey,
    {
      currency0:
        ethers.utils.getAddress(POOL_KEY.currency0),
      currency1:
        ethers.utils.getAddress(POOL_KEY.currency1),
      fee: 75,
      tickSpacing: 1,
      hooks:
        ethers.constants.AddressZero
    }
  );

  assert.equal(decoded.sqrtPriceX96, "123456789");
  assert.equal(decoded.tick, -42);
  assert.equal(decoded.blockNumber, 123);
  assert.equal(decoded.logIndex, 0);
});

test("decodeInitializeLog rejects PoolId mismatch", () => {
  const log = makeInitializeLog();

  log.topics[1] =
    `0x${"ff".repeat(32)}`;

  assert.throws(
    () => decodeInitializeLog(log),
    /PoolId mismatch/
  );
});

test("dedupeDiscoveredPools keeps first occurrence", () => {
  const first = {
    poolId: computePoolId(POOL_KEY),
    marker: "first"
  };

  const second = {
    poolId: first.poolId.toUpperCase(),
    marker: "second"
  };

  assert.deepEqual(
    dedupeDiscoveredPools([first, second]),
    [first]
  );
});

test("discoverInitializeChunk uses exact requested block range", async () => {
  const calls = [];
  const log = makeInitializeLog();

  const provider = {
    async getLogs(filter) {
      calls.push(filter);
      return [log];
    }
  };

  const result =
    await discoverInitializeChunk({
      provider,
      fromBlock: 100,
      toBlock: 999
    });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].address, POOL_MANAGER);
  assert.deepEqual(
    calls[0].topics,
    [INITIALIZE_TOPIC]
  );
  assert.equal(calls[0].fromBlock, 100);
  assert.equal(calls[0].toBlock, 999);

  assert.equal(result.logCount, 1);
  assert.equal(result.pools.length, 1);
  assert.equal(result.failures.length, 0);
});

test("discoverInitializeChunk isolates malformed logs", async () => {
  const good = makeInitializeLog();

  const bad = {
    ...makeInitializeLog({
      blockNumber: 124,
      logIndex: 1
    }),
    topics: [...good.topics]
  };

  bad.topics[1] =
    `0x${"aa".repeat(32)}`;

  const provider = {
    async getLogs() {
      return [good, bad];
    }
  };

  const result =
    await discoverInitializeChunk({
      provider,
      fromBlock: 100,
      toBlock: 200
    });

  assert.equal(result.logCount, 2);
  assert.equal(result.pools.length, 1);
  assert.equal(result.failures.length, 1);
  assert.match(
    result.failures[0].error,
    /PoolId mismatch/
  );
});
