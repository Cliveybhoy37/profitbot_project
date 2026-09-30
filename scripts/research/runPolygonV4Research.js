"use strict";

// Resumable, read-only Polygon Uniswap V4 research runner.
//
// Current implemented stages:
//   PINNED
//   DISCOVERY
//
// No signer, wallet, approvals, or transaction submission.

const fs = require("node:fs");
const path = require("node:path");
const { ethers } = require("ethers");

const {
  POOL_MANAGER,
  DEFAULT_CHUNK_SIZE,
  buildDiscoveryChunks,
  discoverInitializeChunk,
  dedupeDiscoveredPools
} = require("../utils/polygonV4Discovery");

const {
  makeStateView,
  readPoolLiquidity
} = require("../utils/polygonV4ActivePools");

const {
  completeStage,
  updateStageProgress,
  saveResearchState,
  loadResearchState,
  createResearchState
} = require("../utils/polygonV4ResearchState");

const CHAIN_ID = 137;
const DISCOVERY_DEPTH = 500_000;

const STATE_DIR =
  path.resolve(
    __dirname,
    "../../research/runtime/polygon-v4"
  );

function stateFileForBlock(blockNumber) {
  return path.join(
    STATE_DIR,
    `block-${blockNumber}.json`
  );
}

function listExistingRuns() {
  if (!fs.existsSync(STATE_DIR)) return [];

  return fs.readdirSync(STATE_DIR)
    .map(name => {
      const match =
        /^block-(\d+)\.json$/.exec(name);

      if (!match) return null;

      return {
        blockNumber: Number(match[1]),
        file: path.join(STATE_DIR, name)
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        b.blockNumber - a.blockNumber
    );
}

function parseArgs(argv) {
  const args = {
    resume: false,
    block: null
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--resume") {
      args.resume = true;
      continue;
    }

    if (arg === "--block") {
      const value = argv[i + 1];

      if (!value || !/^\d+$/.test(value)) {
        throw new Error(
          "--block requires a positive integer"
        );
      }

      args.block = Number(value);
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (args.resume && args.block !== null) {
    throw new Error(
      "Use either --resume or --block, not both"
    );
  }

  return args;
}

function makeIdentity(pinnedBlock) {
  return {
    chainId: CHAIN_ID,
    pinnedBlock,
    discoveryFromBlock:
      Math.max(
        0,
        pinnedBlock - DISCOVERY_DEPTH + 1
      ),
    poolManager: POOL_MANAGER
  };
}

function completedChunkKey(chunk) {
  return `${chunk.fromBlock}-${chunk.toBlock}`;
}

function getDiscoveryProgress(state) {
  const existing =
    state.stages.DISCOVERY;

  if (
    !existing ||
    typeof existing !== "object" ||
    !Array.isArray(existing.completedChunks) ||
    !Array.isArray(existing.pools)
  ) {
    return {
      completedChunks: [],
      pools: [],
      totalLogs: 0,
      verificationFailures: []
    };
  }

  return {
    completedChunks:
      existing.completedChunks,
    pools: existing.pools,
    totalLogs:
      Number(existing.totalLogs || 0),
    verificationFailures:
      Array.isArray(existing.verificationFailures)
        ? existing.verificationFailures
        : []
  };
}

function saveDiscoveryProgress({
  file,
  state,
  progress,
  totalChunks
}) {
  updateStageProgress(
    state,
    "DISCOVERY",
    {
      completedChunks:
        progress.completedChunks,
      totalChunks,
      totalLogs:
        progress.totalLogs,
      pools:
        dedupeDiscoveredPools(
          progress.pools
        ),
      verificationFailures:
        progress.verificationFailures
    }
  );

  saveResearchState(file, state);
}

async function resolveRun({
  provider,
  args
}) {
  if (args.resume) {
    const runs = listExistingRuns();

    if (runs.length === 0) {
      throw new Error(
        "No resumable Polygon V4 research state found"
      );
    }

    const selected = runs[0];
    const identity =
      makeIdentity(selected.blockNumber);

    return {
      file: selected.file,
      state:
        loadResearchState(
          selected.file,
          identity
        ),
      resumed: true
    };
  }

  if (args.block !== null) {
    const identity =
      makeIdentity(args.block);

    const file =
      stateFileForBlock(args.block);

    if (fs.existsSync(file)) {
      return {
        file,
        state:
          loadResearchState(
            file,
            identity
          ),
        resumed: true
      };
    }

    return {
      file,
      state:
        createResearchState(identity),
      resumed: false
    };
  }

  const pinnedBlock =
    await provider.getBlockNumber();

  const identity =
    makeIdentity(pinnedBlock);

  const file =
    stateFileForBlock(pinnedBlock);

  if (fs.existsSync(file)) {
    return {
      file,
      state:
        loadResearchState(
          file,
          identity
        ),
      resumed: true
    };
  }

  return {
    file,
    state:
      createResearchState(identity),
    resumed: false
  };
}

async function runDiscovery({
  provider,
  file,
  state
}) {
  if (
    !state.completedStages.includes("PINNED")
  ) {
    completeStage(
      state,
      "PINNED",
      {
        pinnedBlock:
          state.identity.pinnedBlock,
        discoveryFromBlock:
          state.identity.discoveryFromBlock,
        poolManager:
          state.identity.poolManager,
        chainId:
          state.identity.chainId
      }
    );

    saveResearchState(file, state);
  }

  if (
    state.completedStages.includes(
      "DISCOVERY"
    )
  ) {
    console.log(
      "DISCOVERY already complete."
    );

    return state.stages.DISCOVERY;
  }

  const chunks =
    buildDiscoveryChunks({
      fromBlock:
        state.identity.discoveryFromBlock,
      toBlock:
        state.identity.pinnedBlock,
      chunkSize:
        DEFAULT_CHUNK_SIZE
    });

  const progress =
    getDiscoveryProgress(state);

  const done =
    new Set(
      progress.completedChunks.map(
        completedChunkKey
      )
    );

  console.log(
    `Pinned block: ${state.identity.pinnedBlock}`
  );

  console.log(
    `Discovery range: ${state.identity.discoveryFromBlock} -> ${state.identity.pinnedBlock}`
  );

  console.log(
    `Chunks: ${done.size}/${chunks.length} complete`
  );

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const key =
      completedChunkKey(chunk);

    if (done.has(key)) {
      console.log(
        `[${i + 1}/${chunks.length}] ${key} cached`
      );
      continue;
    }

    console.log(
      `[${i + 1}/${chunks.length}] ${key} scanning`
    );

    const result =
      await discoverInitializeChunk({
        provider,
        fromBlock:
          chunk.fromBlock,
        toBlock:
          chunk.toBlock,
        poolManager:
          state.identity.poolManager
      });

    // A malformed/unverified Initialize log means
    // the chunk must NOT be marked complete.
    if (result.failures.length > 0) {
      throw new Error(
        `Verification failure in chunk ${key}: ` +
        `${result.failures.length} log(s)`
      );
    }

    progress.totalLogs +=
      result.logCount;

    progress.pools.push(
      ...result.pools
    );

    progress.completedChunks.push({
      fromBlock:
        chunk.fromBlock,
      toBlock:
        chunk.toBlock,
      logCount:
        result.logCount,
      verifiedPools:
        result.pools.length
    });

    done.add(key);

    saveDiscoveryProgress({
      file,
      state,
      progress,
      totalChunks:
        chunks.length
    });

    console.log(
      `  logs=${result.logCount} ` +
      `verified=${result.pools.length} ` +
      `totalPools=${
        dedupeDiscoveredPools(
          progress.pools
        ).length
      } checkpointed`
    );
  }

  const pools =
    dedupeDiscoveredPools(
      progress.pools
    );

  const finalPayload = {
    completedChunks:
      progress.completedChunks,
    totalChunks:
      chunks.length,
    totalLogs:
      progress.totalLogs,
    verifiedPools:
      pools.length,
    pools,
    verificationFailures: []
  };

  completeStage(
    state,
    "DISCOVERY",
    finalPayload
  );

  saveResearchState(
    file,
    state
  );

  console.log(
    `DISCOVERY complete: ${pools.length} verified pool(s)`
  );

  return finalPayload;
}

function getActiveProgress(state) {
  const existing =
    state.stages.ACTIVE;

  if (
    !existing ||
    typeof existing !== "object" ||
    !Array.isArray(existing.observations)
  ) {
    return {
      observations: []
    };
  }

  return {
    observations:
      existing.observations
  };
}

function saveActiveProgress({
  file,
  state,
  observations
}) {
  updateStageProgress(
    state,
    "ACTIVE",
    {
      observations
    }
  );

  saveResearchState(file, state);
}

async function runActive({
  provider,
  file,
  state,
  stateView = null
}) {
  if (
    !state.completedStages.includes(
      "DISCOVERY"
    )
  ) {
    throw new Error(
      "Cannot run ACTIVE before DISCOVERY"
    );
  }

  if (
    state.completedStages.includes(
      "ACTIVE"
    )
  ) {
    console.log(
      "ACTIVE already complete."
    );

    return state.stages.ACTIVE;
  }

  const discovery =
    state.stages.DISCOVERY;

  if (
    !discovery ||
    !Array.isArray(discovery.pools)
  ) {
    throw new Error(
      "DISCOVERY payload has no verified pools"
    );
  }

  const pools =
    discovery.pools;

  const progress =
    getActiveProgress(state);

  // Only successful observations count as completed.
  // Failed observations remain persisted as evidence,
  // but are retried on resume.
  const successful =
    new Map(
      progress.observations
        .filter(item => item.ok)
        .map(item => [
          item.poolId.toLowerCase(),
          item
        ])
    );

  const failures =
    new Map(
      progress.observations
        .filter(item => !item.ok)
        .map(item => [
          item.poolId.toLowerCase(),
          item
        ])
    );

  const view =
    stateView ||
    makeStateView(provider);

  console.log(
    `ACTIVE: ${successful.size}/${pools.length} successful observations cached`
  );

  for (
    let i = 0;
    i < pools.length;
    i += 1
  ) {
    const pool =
      pools[i];

    const poolId =
      pool.poolId.toLowerCase();

    if (successful.has(poolId)) {
      console.log(
        `[${i + 1}/${pools.length}] ${poolId} cached`
      );
      continue;
    }

    console.log(
      `[${i + 1}/${pools.length}] ${poolId} StateView`
    );

    const observation =
      await readPoolLiquidity({
        stateView: view,
        poolId,
        blockTag:
          state.identity.pinnedBlock
      });

    if (observation.ok) {
      successful.set(
        poolId,
        observation
      );

      failures.delete(poolId);
    } else {
      failures.set(
        poolId,
        observation
      );
    }

    const observations = [
      ...successful.values(),
      ...failures.values()
    ];

    saveActiveProgress({
      file,
      state,
      observations
    });

    if (observation.ok) {
      console.log(
        `  liquidity=${observation.liquidity} ` +
        `active=${observation.active} checkpointed`
      );
    } else {
      console.log(
        `  failed code=${observation.errorCode} checkpointed`
      );
    }
  }

  const observations = [
    ...successful.values(),
    ...failures.values()
  ];

  if (failures.size > 0) {
    saveActiveProgress({
      file,
      state,
      observations
    });

    throw new Error(
      `ACTIVE incomplete: ${failures.size} StateView observation(s) failed`
    );
  }

  const active =
    observations.filter(
      item =>
        item.ok &&
        item.active
    );

  const inactive =
    observations.filter(
      item =>
        item.ok &&
        !item.active
    );

  const finalPayload = {
    observations,
    totalPools:
      pools.length,
    successfulObservations:
      observations.length,
    activePools:
      active.length,
    inactivePools:
      inactive.length,
    failures: []
  };

  completeStage(
    state,
    "ACTIVE",
    finalPayload
  );

  saveResearchState(
    file,
    state
  );

  console.log(
    `ACTIVE complete: ${active.length} active, ` +
    `${inactive.length} inactive, 0 failures`
  );

  return finalPayload;
}

async function main() {
  const args =
    parseArgs(process.argv.slice(2));

  const rpc =
    process.env.INFURA_POLYGON;

  if (!rpc) {
    throw new Error(
      "INFURA_POLYGON is not set"
    );
  }

  const provider =
    new ethers.providers.JsonRpcProvider(
      rpc,
      CHAIN_ID
    );

  const network =
    await provider.getNetwork();

  if (network.chainId !== CHAIN_ID) {
    throw new Error(
      `Wrong network: expected ${CHAIN_ID}, got ${network.chainId}`
    );
  }

  const run =
    await resolveRun({
      provider,
      args
    });

  console.log(
    run.resumed
      ? `Resuming ${path.basename(run.file)}`
      : `Created ${path.basename(run.file)}`
  );

  await runDiscovery({
    provider,
    file: run.file,
    state: run.state
  });

  await runActive({
    provider,
    file: run.file,
    state: run.state
  });

  console.log(
    `State: ${run.file}`
  );
}

if (require.main === module) {
  main().catch(error => {
    const code =
      error?.code
        ? ` code=${error.code}`
        : "";

    console.error(
      `V4 research failed:${code} ${
        error instanceof Error
          ? error.message
          : String(error)
      }`
    );

    process.exitCode = 1;
  });
}

module.exports = {
  CHAIN_ID,
  DISCOVERY_DEPTH,
  STATE_DIR,
  stateFileForBlock,
  listExistingRuns,
  parseArgs,
  makeIdentity,
  completedChunkKey,
  getDiscoveryProgress,
  saveDiscoveryProgress,
  getActiveProgress,
  saveActiveProgress,
  resolveRun,
  runDiscovery,
  runActive
};
