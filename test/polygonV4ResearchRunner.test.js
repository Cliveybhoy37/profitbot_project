"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  parseArgs,
  makeIdentity,
  completedChunkKey,
  getDiscoveryProgress
} = require("../scripts/research/runPolygonV4Research");

const {
  createResearchState,
  completeStage,
  updateStageProgress,
  saveResearchState,
  loadResearchState
} = require("../scripts/utils/polygonV4ResearchState");

const {
  POOL_MANAGER
} = require("../scripts/utils/polygonV4Discovery");

test("parseArgs supports fresh, resume and explicit block modes", () => {
  assert.deepEqual(
    parseArgs([]),
    {
      resume: false,
      block: null
    }
  );

  assert.deepEqual(
    parseArgs(["--resume"]),
    {
      resume: true,
      block: null
    }
  );

  assert.deepEqual(
    parseArgs(["--block", "94700000"]),
    {
      resume: false,
      block: 94700000
    }
  );

  assert.throws(
    () =>
      parseArgs([
        "--resume",
        "--block",
        "94700000"
      ]),
    /either --resume or --block/
  );
});

test("makeIdentity pins exactly 500k blocks including endpoint", () => {
  const identity =
    makeIdentity(94700000);

  assert.deepEqual(
    identity,
    {
      chainId: 137,
      pinnedBlock: 94700000,
      discoveryFromBlock: 94200001,
      poolManager: POOL_MANAGER
    }
  );

  assert.equal(
    identity.pinnedBlock -
      identity.discoveryFromBlock +
      1,
    500000
  );
});

test("completedChunkKey is deterministic", () => {
  assert.equal(
    completedChunkKey({
      fromBlock: 100,
      toBlock: 999
    }),
    "100-999"
  );
});

test("discovery progress survives save and reload", () => {
  const dir =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "apollo-v4-runner-"
      )
    );

  const file =
    path.join(dir, "state.json");

  const identity =
    makeIdentity(94700000);

  try {
    const state =
      createResearchState(identity);

    completeStage(
      state,
      "PINNED",
      {
        pinnedBlock:
          identity.pinnedBlock
      }
    );

    updateStageProgress(
      state,
      "DISCOVERY",
      {
        completedChunks: [
          {
            fromBlock: 94200001,
            toBlock: 94210000,
            logCount: 2,
            verifiedPools: 2
          }
        ],
        totalChunks: 50,
        totalLogs: 2,
        pools: [
          {
            poolId:
              `0x${"11".repeat(32)}`
          }
        ],
        verificationFailures: []
      }
    );

    saveResearchState(file, state);

    const reloaded =
      loadResearchState(
        file,
        identity
      );

    const progress =
      getDiscoveryProgress(
        reloaded
      );

    assert.equal(
      progress.completedChunks.length,
      1
    );

    assert.equal(
      completedChunkKey(
        progress.completedChunks[0]
      ),
      "94200001-94210000"
    );

    assert.equal(
      progress.totalLogs,
      2
    );

    assert.equal(
      progress.pools.length,
      1
    );

    assert.equal(
      reloaded.completedStages.includes(
        "DISCOVERY"
      ),
      false
    );
  } finally {
    fs.rmSync(
      dir,
      {
        recursive: true,
        force: true
      }
    );
  }
});

test("saved progress identifies completed chunk but leaves next chunk retryable", () => {
  const identity =
    makeIdentity(94700000);

  const state =
    createResearchState(identity);

  completeStage(
    state,
    "PINNED",
    {
      pinnedBlock:
        identity.pinnedBlock
    }
  );

  updateStageProgress(
    state,
    "DISCOVERY",
    {
      completedChunks: [
        {
          fromBlock: 94200001,
          toBlock: 94210000,
          logCount: 3,
          verifiedPools: 3
        }
      ],
      totalChunks: 50,
      totalLogs: 3,
      pools: [],
      verificationFailures: []
    }
  );

  const progress =
    getDiscoveryProgress(state);

  const done =
    new Set(
      progress.completedChunks.map(
        completedChunkKey
      )
    );

  assert.equal(
    done.has("94200001-94210000"),
    true
  );

  assert.equal(
    done.has("94210001-94220000"),
    false
  );
});

test("empty discovery stage produces clean resumable progress", () => {
  const state =
    createResearchState(
      makeIdentity(94700000)
    );

  const progress =
    getDiscoveryProgress(state);

  assert.deepEqual(
    progress,
    {
      completedChunks: [],
      pools: [],
      totalLogs: 0,
      verificationFailures: []
    }
  );
});
