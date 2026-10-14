"use strict";

// Resumable, read-only Polygon Uniswap V4 research runner.
//
// Current implemented stages:
//   PINNED
//   DISCOVERY
//   ACTIVE
//   STRUCTURAL
//   ECONOMICS
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
  METADATA_OK,
  coreTokens,
  outerVenueNames,
  observeTokenDecimals,
  observeTokenAgainstCore
} = require("../utils/polygonV4StructuralObserver");

const {
  pairKey,
  getStructuralProgress,
  buildStructuralClassifications,
  collectUniqueExoticAddresses,
  metadataIsResolved,
  evidenceIsConclusive,
  buildStructuralResults
} = require("../utils/polygonV4StructuralStage");

const {
  completeStage,
  updateStageProgress,
  saveResearchState,
  loadResearchState,
  createResearchState
} = require("../utils/polygonV4ResearchState");

const {
  buildEconomicsJobs
} = require("../utils/polygonV4EconomicsStage");

const {
  QUOTE_OK,
  NO_ROUTE,
  RPC_FAILURE
} = require("../utils/polygonV4OuterQuoteObserver");

const {
  observeThreeLegEconomics
} = require("../utils/polygonV4EconomicsObserver");

const CHAIN_ID = 137;
const DISCOVERY_DEPTH = 500_000;

// Deterministic coarse research probes.
//
// These are research inputs only. They are not execution
// sizing recommendations and are deliberately independent
// from legacy flashloan/environment settings.
const ECONOMICS_COARSE_SIZES =
  Object.freeze({
    USDC_NATIVE: "10",
    USDC_E: "10",
    WPOL: "0.075",
    DAI: "10",
    WETH: "0.005",
    WBTC: "0.0002"
  });

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

function saveStructuralProgress({
  file,
  state,
  progress
}) {
  updateStageProgress(
    state,
    "STRUCTURAL",
    {
      classifications:
        progress.classifications,
      metadata:
        progress.metadata,
      outerEvidence:
        progress.outerEvidence,
      unresolved:
        progress.unresolved
    }
  );

  saveResearchState(
    file,
    state
  );
}

function requiredOuterPairs({
  classifications,
  cores,
  metadata
}) {
  if (
    !classifications ||
    !Array.isArray(
      classifications.pools
    )
  ) {
    throw new Error(
      "Structural classifications required"
    );
  }

  const coreByAddress =
    new Map(
      cores.map(core => [
        String(core.address)
          .toLowerCase(),
        core
      ])
    );

  const pairs =
    new Map();

  for (
    const pool of
    classifications.pools
  ) {
    if (pool.quarantined) {
      continue;
    }

    const endpoints = [
      pool.currency0,
      pool.currency1
    ];

    for (const startCore of cores) {
      const startAddress =
        String(startCore.address)
          .toLowerCase();

      for (const endpoint of endpoints) {
        const endpointAddress =
          String(endpoint.address)
            .toLowerCase();

        // Identity outer legs are invalid for the exact
        // three-real-swap topology and require no quote.
        if (
          endpointAddress ===
          startAddress
        ) {
          continue;
        }

        const key =
          pairKey(
            startAddress,
            endpointAddress
          );

        if (pairs.has(key)) {
          continue;
        }

        const endpointCore =
          coreByAddress.get(
            endpointAddress
          );

        let candidateDecimals = null;

        if (endpointCore) {
          candidateDecimals =
            endpointCore.decimals;
        } else {
          const metadataObservation =
            metadata[
              endpointAddress
            ];

          if (
            metadataIsResolved(
              metadataObservation
            )
          ) {
            candidateDecimals =
              metadataObservation.decimals;
          }
        }

        pairs.set(
          key,
          {
            key,
            core:
              startCore,
            candidateAddress:
              endpointAddress,
            candidateDecimals
          }
        );
      }
    }
  }

  return Array.from(
    pairs.values()
  );
}

function structuralUnresolved({
  exoticAddresses,
  metadata,
  outerEvidence,
  requiredPairs
}) {
  const unresolved = [];

  for (
    const exoticAddress of
    exoticAddresses
  ) {
    if (
      !metadataIsResolved(
        metadata[exoticAddress]
      )
    ) {
      unresolved.push({
        type: "METADATA",
        token:
          exoticAddress
      });
    }
  }

  for (
    const pair of
    requiredPairs
  ) {
    // An EXOTIC endpoint whose metadata has not resolved
    // cannot safely be quoted yet. The METADATA item above
    // is sufficient until it becomes probeable.
    if (
      !Number.isInteger(
        pair.candidateDecimals
      )
    ) {
      continue;
    }

    if (
      !evidenceIsConclusive(
        outerEvidence[
          pair.key
        ]
      )
    ) {
      unresolved.push({
        type:
          "OUTER_EVIDENCE",
        key:
          pair.key,
        core:
          pair.core.address
            .toLowerCase(),
        candidate:
          pair.candidateAddress
      });
    }
  }

  return unresolved;
}

function economicsStartAmount(job) {
  const symbol =
    job?.start?.symbol;

  const decimals =
    job?.start?.decimals;

  const configured =
    ECONOMICS_COARSE_SIZES[
      symbol
    ];

  if (
    typeof configured !== "string"
  ) {
    throw new Error(
      `No ECONOMICS coarse size for ${String(symbol)}`
    );
  }

  if (
    !Number.isInteger(decimals) ||
    decimals < 0 ||
    decimals > 255
  ) {
    throw new Error(
      `Invalid ECONOMICS decimals for ${String(symbol)}`
    );
  }

  return ethers.utils.parseUnits(
    configured,
    decimals
  );
}

function economicsObservationKey(
  job,
  startAmount
) {
  if (
    !job ||
    typeof job.id !== "string" ||
    job.id.length === 0
  ) {
    throw new Error(
      "Invalid ECONOMICS job id"
    );
  }

  const amount =
    ethers.BigNumber.from(
      startAmount
    );

  if (amount.lte(0)) {
    throw new Error(
      "Invalid ECONOMICS start amount"
    );
  }

  return `${job.id}:amount=${amount.toString()}`;
}

function getEconomicsProgress(
  state
) {
  const existing =
    state.stages?.ECONOMICS;

  return {
    observations:
      existing?.observations &&
      typeof existing.observations ===
        "object" &&
      !Array.isArray(
        existing.observations
      )
        ? {
            ...existing.observations
          }
        : {},

    unresolved:
      Array.isArray(
        existing?.unresolved
      )
        ? [
            ...existing.unresolved
          ]
        : []
  };
}

function economicsObservationIsConclusive(
  observation
) {
  return (
    observation?.status ===
      QUOTE_OK ||
    observation?.status ===
      NO_ROUTE
  );
}

function economicsUnresolved({
  jobs,
  observations
}) {
  const unresolved = [];

  for (const job of jobs) {
    const startAmount =
      economicsStartAmount(
        job
      );

    const observationKey =
      economicsObservationKey(
        job,
        startAmount
      );

    const observation =
      observations[
        observationKey
      ];

    if (
      !economicsObservationIsConclusive(
        observation
      )
    ) {
      unresolved.push({
        jobId: job.id,
        observationKey,
        startAmount:
          startAmount.toString(),
        status:
          observation?.status ??
          "MISSING"
      });
    }
  }

  return unresolved;
}

function saveEconomicsProgress({
  file,
  state,
  progress
}) {
  updateStageProgress(
    state,
    "ECONOMICS",
    {
      observations:
        progress.observations,
      unresolved:
        progress.unresolved
    }
  );

  saveResearchState(
    file,
    state
  );
}

async function runEconomics({
  provider,
  file,
  state,
  observeThreeLegEconomicsFn =
    observeThreeLegEconomics,
  buildEconomicsJobsFn =
    buildEconomicsJobs
}) {
  if (
    !state.completedStages.includes(
      "STRUCTURAL"
    )
  ) {
    throw new Error(
      "Cannot run ECONOMICS before STRUCTURAL"
    );
  }

  if (
    state.completedStages.includes(
      "ECONOMICS"
    )
  ) {
    console.log(
      "ECONOMICS already complete."
    );

    return state.stages.ECONOMICS;
  }

  const structural =
    state.stages.STRUCTURAL;

  const jobs =
    buildEconomicsJobsFn({
      structural
    });

  const progress =
    getEconomicsProgress(
      state
    );

  console.log(
    `ECONOMICS: ${jobs.length} deterministic job(s)`
  );

  for (
    let i = 0;
    i < jobs.length;
    i += 1
  ) {
    const job =
      jobs[i];

    const startAmount =
      economicsStartAmount(
        job
      );

    const observationKey =
      economicsObservationKey(
        job,
        startAmount
      );

    const cached =
      progress.observations[
        observationKey
      ];

    if (
      economicsObservationIsConclusive(
        cached
      )
    ) {
      console.log(
        `[economics ${i + 1}/${jobs.length}] ${job.id} cached`
      );

      continue;
    }

    console.log(
      `[economics ${i + 1}/${jobs.length}] ${job.id}`
    );

    const result =
      await observeThreeLegEconomicsFn({
        provider,
        blockTag:
          state.identity.pinnedBlock,
        poolKey:
          job.poolKey,
        zeroForOne:
          job.zeroForOne,
        startToken:
          job.start.address,
        entryToken:
          job.entryToken,
        exitToken:
          job.exitToken,
        startAmount,
        entryVenue:
          job.entryVenue,
        exitVenue:
          job.exitVenue
      });

    const observation = {
      observationKey,
      jobId:
        job.id,
      poolId:
        job.poolId,
      direction:
        job.direction,
      zeroForOne:
        job.zeroForOne,
      start:
        job.start,
      startAmount:
        startAmount.toString(),
      entryToken:
        job.entryToken,
      exitToken:
        job.exitToken,
      entryVenue:
        job.entryVenue,
      exitVenue:
        job.exitVenue,
      poolKey:
        job.poolKey,
      blockTag:
        state.identity.pinnedBlock,
      ...result
    };

    progress.observations[
      observationKey
    ] = observation;

    progress.unresolved =
      economicsUnresolved({
        jobs,
        observations:
          progress.observations
      });

    saveEconomicsProgress({
      file,
      state,
      progress
    });

    if (
      result.status ===
        QUOTE_OK
    ) {
      console.log(
        `  QUOTE_OK grossDelta=${result.grossDelta} grossBpsScaled=${result.grossBpsScaled}`
      );
    } else if (
      result.status ===
        NO_ROUTE
    ) {
      console.log(
        `  NO_ROUTE failedLeg=${result.failedLeg ?? "UNKNOWN"}`
      );
    } else {
      console.log(
        `  unresolved status=${result.status ?? RPC_FAILURE} failedLeg=${result.failedLeg ?? "UNKNOWN"} checkpointed`
      );
    }
  }

  progress.unresolved =
    economicsUnresolved({
      jobs,
      observations:
        progress.observations
    });

  if (
    progress.unresolved.length > 0
  ) {
    saveEconomicsProgress({
      file,
      state,
      progress
    });

    throw new Error(
      `ECONOMICS incomplete: ${progress.unresolved.length} observation(s) unresolved`
    );
  }

  const observations =
    Object.values(
      progress.observations
    );

  const quoteOk =
    observations.filter(
      item =>
        item.status ===
        QUOTE_OK
    ).length;

  const noRoute =
    observations.filter(
      item =>
        item.status ===
        NO_ROUTE
    ).length;

  const grossPositive =
    observations.filter(
      item =>
        item.status ===
          QUOTE_OK &&
        ethers.BigNumber.from(
          item.grossDelta
        ).gt(0)
    ).length;

  const finalPayload = {
    coarseSizes: {
      ...ECONOMICS_COARSE_SIZES
    },
    totalJobs:
      jobs.length,
    quoteOk,
    noRoute,
    grossPositive,
    unresolved: [],
    observations:
      progress.observations
  };

  completeStage(
    state,
    "ECONOMICS",
    finalPayload
  );

  saveResearchState(
    file,
    state
  );

  console.log(
    `ECONOMICS complete: ${quoteOk} quoted, ` +
    `${noRoute} no-route, ` +
    `${grossPositive} gross-positive`
  );

  return finalPayload;
}

async function runStructural({
  provider,
  file,
  state,
  observeTokenDecimalsFn =
    observeTokenDecimals,
  observeTokenAgainstCoreFn =
    observeTokenAgainstCore,
  cores =
    coreTokens(),
  venues =
    outerVenueNames()
}) {
  if (
    !state.completedStages.includes(
      "ACTIVE"
    )
  ) {
    throw new Error(
      "Cannot run STRUCTURAL before ACTIVE"
    );
  }

  if (
    state.completedStages.includes(
      "STRUCTURAL"
    )
  ) {
    console.log(
      "STRUCTURAL already complete."
    );

    return state.stages.STRUCTURAL;
  }

  const discovery =
    state.stages.DISCOVERY;

  const active =
    state.stages.ACTIVE;

  if (
    !discovery ||
    !Array.isArray(
      discovery.pools
    )
  ) {
    throw new Error(
      "DISCOVERY payload has no verified pools"
    );
  }

  if (
    !active ||
    !Array.isArray(
      active.observations
    )
  ) {
    throw new Error(
      "ACTIVE payload has no observations"
    );
  }

  const progress =
    getStructuralProgress(
      state
    );

  if (!progress.classifications) {
    progress.classifications =
      buildStructuralClassifications({
        discoveredPools:
          discovery.pools,
        activeObservations:
          active.observations
      });

    progress.unresolved = [];

    saveStructuralProgress({
      file,
      state,
      progress
    });

    console.log(
      `STRUCTURAL classified ` +
      `${progress.classifications.counts.totalActive} active pool(s)`
    );
  }

  const exoticAddresses =
    collectUniqueExoticAddresses(
      progress.classifications
    );

  console.log(
    `STRUCTURAL: ${exoticAddresses.length} unique non-native exotic token(s)`
  );

  // Metadata is successful only when METADATA_OK.
  // Failed/ambiguous observations remain checkpointed,
  // but are deliberately retried on resume.
  for (
    let i = 0;
    i < exoticAddresses.length;
    i += 1
  ) {
    const exoticAddress =
      exoticAddresses[i];

    if (
      metadataIsResolved(
        progress.metadata[
          exoticAddress
        ]
      )
    ) {
      console.log(
        `[metadata ${i + 1}/${exoticAddresses.length}] ` +
        `${exoticAddress} cached`
      );

      continue;
    }

    console.log(
      `[metadata ${i + 1}/${exoticAddresses.length}] ` +
      `${exoticAddress} decimals`
    );

    const observation =
      await observeTokenDecimalsFn({
        provider,
        tokenAddress:
          exoticAddress,
        blockTag:
          state.identity.pinnedBlock
      });

    progress.metadata[
      exoticAddress
    ] = observation;

    progress.unresolved =
      structuralUnresolved({
        exoticAddresses,
        metadata:
          progress.metadata,
        outerEvidence:
          progress.outerEvidence,
        requiredPairs:
          requiredOuterPairs({
            classifications:
              progress.classifications,
            cores,
            metadata:
              progress.metadata
          })
      });

    saveStructuralProgress({
      file,
      state,
      progress
    });

    if (
      observation.status ===
      METADATA_OK
    ) {
      console.log(
        `  decimals=${observation.decimals} checkpointed`
      );
    } else {
      console.log(
        `  metadata unresolved code=${
          observation.errorCode ||
          "UNKNOWN"
        } checkpointed`
      );
    }
  }

  // Probe every distinct non-identity V4 endpoint
  // against every possible start core.
  //
  // CORE endpoint decimals come from the registry.
  // EXOTIC endpoint decimals come from pinned metadata.
  //
  // Conclusive evidence is cached for this pinned run.
  // RPC/ambiguous evidence remains retryable.
  const requiredPairs =
    requiredOuterPairs({
      classifications:
        progress.classifications,
      cores,
      metadata:
        progress.metadata
    });

  console.log(
    `STRUCTURAL: ${requiredPairs.length} required outer pair(s)`
  );

  for (
    let i = 0;
    i < requiredPairs.length;
    i += 1
  ) {
    const pair =
      requiredPairs[i];

    if (
      !Number.isInteger(
        pair.candidateDecimals
      )
    ) {
      console.log(
        `[outer ${i + 1}/${requiredPairs.length}] ` +
        `${pair.key} waiting for metadata`
      );

      continue;
    }

    if (
      evidenceIsConclusive(
        progress.outerEvidence[
          pair.key
        ]
      )
    ) {
      console.log(
        `[outer ${i + 1}/${requiredPairs.length}] ` +
        `${pair.key} cached`
      );

      continue;
    }

    console.log(
      `[outer ${i + 1}/${requiredPairs.length}] ` +
      `${pair.key}`
    );

    const observation =
      await observeTokenAgainstCoreFn({
        provider,
        blockTag:
          state.identity.pinnedBlock,
        coreToken:
          pair.core,
        candidateAddress:
          pair.candidateAddress,
        candidateDecimals:
          pair.candidateDecimals,
        venueNames:
          venues
      });

    progress.outerEvidence[
      pair.key
    ] = observation;

    progress.unresolved =
      structuralUnresolved({
        exoticAddresses,
        metadata:
          progress.metadata,
        outerEvidence:
          progress.outerEvidence,
        requiredPairs:
          requiredOuterPairs({
            classifications:
              progress.classifications,
            cores,
            metadata:
              progress.metadata
          })
      });

    saveStructuralProgress({
      file,
      state,
      progress
    });

    console.log(
      observation.conclusive
        ? `  entry=${observation.hasEntry} ` +
          `exit=${observation.hasExit} checkpointed`
        : "  unresolved RPC evidence checkpointed"
    );
  }

  progress.unresolved =
    structuralUnresolved({
      exoticAddresses,
      metadata:
        progress.metadata,
      outerEvidence:
        progress.outerEvidence,
      requiredPairs:
        requiredOuterPairs({
          classifications:
            progress.classifications,
          cores,
          metadata:
            progress.metadata
        })
    });

  saveStructuralProgress({
    file,
    state,
    progress
  });

  if (
    progress.unresolved.length > 0
  ) {
    throw new Error(
      `STRUCTURAL incomplete: ` +
      `${progress.unresolved.length} observation(s) unresolved`
    );
  }

  const results =
    buildStructuralResults({
      classifications:
        progress.classifications,
      outerEvidence:
        progress.outerEvidence,
      coreTokens:
        cores
    });

  const finalPayload = {
    classifications:
      progress.classifications,
    metadata:
      progress.metadata,
    outerEvidence:
      progress.outerEvidence,
    unresolved: [],
    results
  };

  completeStage(
    state,
    "STRUCTURAL",
    finalPayload
  );

  saveResearchState(
    file,
    state
  );

  console.log(
    `STRUCTURAL complete: ` +
    `${results.counts.withOrientation} supported, ` +
    `${results.counts.withoutOrientation} unsupported, ` +
    `${results.counts.quarantined} native POL quarantined`
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

  await runStructural({
    provider,
    file: run.file,
    state: run.state
  });

  await runEconomics({
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
  runActive,
  saveStructuralProgress,
  requiredOuterPairs,
  structuralUnresolved,
  runStructural,
  ECONOMICS_COARSE_SIZES,
  economicsStartAmount,
  economicsObservationKey,
  getEconomicsProgress,
  economicsObservationIsConclusive,
  economicsUnresolved,
  saveEconomicsProgress,
  runEconomics
};
