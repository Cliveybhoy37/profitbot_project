"use strict";

// Read-only Polygon Uniswap V4 pool discovery primitives.
// No signer, wallet, approvals, or transaction submission.

const { ethers } = require("ethers");

const POOL_MANAGER =
  "0x67366782805870060151383f4bbff9dab53e5cd6";

const INITIALIZE_EVENT =
  "event Initialize(bytes32 indexed id,address indexed currency0,address indexed currency1,uint24 fee,int24 tickSpacing,address hooks,uint160 sqrtPriceX96,int24 tick)";

const INTERFACE = new ethers.utils.Interface([
  INITIALIZE_EVENT
]);

const INITIALIZE_TOPIC =
  INTERFACE.getEventTopic("Initialize");

const DEFAULT_CHUNK_SIZE = 10_000;

function normalizeAddress(address) {
  return ethers.utils.getAddress(address);
}

function buildDiscoveryChunks({
  fromBlock,
  toBlock,
  chunkSize = DEFAULT_CHUNK_SIZE
}) {
  if (!Number.isInteger(fromBlock) || fromBlock < 0) {
    throw new Error("fromBlock must be a non-negative integer");
  }

  if (!Number.isInteger(toBlock) || toBlock < fromBlock) {
    throw new Error("toBlock must be >= fromBlock");
  }

  if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
    throw new Error("chunkSize must be a positive integer");
  }

  const chunks = [];

  for (
    let start = fromBlock;
    start <= toBlock;
    start += chunkSize
  ) {
    chunks.push({
      fromBlock: start,
      toBlock: Math.min(
        start + chunkSize - 1,
        toBlock
      )
    });
  }

  return chunks;
}

function computePoolId(poolKey) {
  if (!poolKey) {
    throw new Error("PoolKey is required");
  }

  const encoded =
    ethers.utils.defaultAbiCoder.encode(
      [
        "address",
        "address",
        "uint24",
        "int24",
        "address"
      ],
      [
        poolKey.currency0,
        poolKey.currency1,
        poolKey.fee,
        poolKey.tickSpacing,
        poolKey.hooks
      ]
    );

  return ethers.utils.keccak256(encoded);
}

function decodeInitializeLog(log) {
  if (!log || typeof log !== "object") {
    throw new Error("Initialize log is required");
  }

  const parsed = INTERFACE.parseLog(log);

  if (!parsed || parsed.name !== "Initialize") {
    throw new Error("Log is not an Initialize event");
  }

  const poolKey = {
    currency0: normalizeAddress(parsed.args.currency0),
    currency1: normalizeAddress(parsed.args.currency1),
    fee: Number(parsed.args.fee),
    tickSpacing: Number(parsed.args.tickSpacing),
    hooks: normalizeAddress(parsed.args.hooks)
  };

  const emittedPoolId =
    parsed.args.id.toLowerCase();

  const computedPoolId =
    computePoolId(poolKey).toLowerCase();

  if (emittedPoolId !== computedPoolId) {
    throw new Error(
      `PoolId mismatch: emitted=${emittedPoolId} computed=${computedPoolId}`
    );
  }

  return {
    poolId: emittedPoolId,
    poolKey,
    sqrtPriceX96:
      parsed.args.sqrtPriceX96.toString(),
    tick: Number(parsed.args.tick),
    blockNumber: log.blockNumber ?? null,
    transactionHash: log.transactionHash ?? null,
    logIndex: log.logIndex ?? null
  };
}

function dedupeDiscoveredPools(pools) {
  if (!Array.isArray(pools)) {
    throw new Error("pools must be an array");
  }

  const byPoolId = new Map();

  for (const pool of pools) {
    if (!pool?.poolId) {
      throw new Error("Discovered pool requires poolId");
    }

    const key = pool.poolId.toLowerCase();

    if (!byPoolId.has(key)) {
      byPoolId.set(key, pool);
    }
  }

  return [...byPoolId.values()];
}

async function fetchInitializeLogs({
  provider,
  fromBlock,
  toBlock,
  poolManager = POOL_MANAGER
}) {
  if (!provider || typeof provider.getLogs !== "function") {
    throw new Error("V4 discovery requires provider");
  }

  return provider.getLogs({
    address: poolManager,
    topics: [INITIALIZE_TOPIC],
    fromBlock,
    toBlock
  });
}

async function discoverInitializeChunk({
  provider,
  fromBlock,
  toBlock,
  poolManager = POOL_MANAGER
}) {
  const logs = await fetchInitializeLogs({
    provider,
    fromBlock,
    toBlock,
    poolManager
  });

  const pools = [];
  const failures = [];

  for (const log of logs) {
    try {
      pools.push(decodeInitializeLog(log));
    } catch (error) {
      failures.push({
        blockNumber: log?.blockNumber ?? null,
        transactionHash:
          log?.transactionHash ?? null,
        logIndex: log?.logIndex ?? null,
        error:
          error instanceof Error
            ? error.message
            : String(error)
      });
    }
  }

  return {
    fromBlock,
    toBlock,
    logCount: logs.length,
    pools: dedupeDiscoveredPools(pools),
    failures
  };
}

module.exports = {
  POOL_MANAGER,
  INITIALIZE_EVENT,
  INITIALIZE_TOPIC,
  DEFAULT_CHUNK_SIZE,
  buildDiscoveryChunks,
  computePoolId,
  decodeInitializeLog,
  dedupeDiscoveredPools,
  fetchInitializeLogs,
  discoverInitializeChunk
};
