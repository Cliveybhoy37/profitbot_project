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

test("ACTIVE progress defaults empty", () => {
  const {
    getActiveProgress
  } = require("../scripts/research/runPolygonV4Research");

  const state =
    createResearchState(
      makeIdentity(94700000)
    );

  assert.deepEqual(
    getActiveProgress(state),
    {
      observations: []
    }
  );
});

test("ACTIVE checkpoints successful observations and completes", async () => {
  const {
    runActive
  } = require("../scripts/research/runPolygonV4Research");

  const dir =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "apollo-v4-active-"
      )
    );

  const file =
    path.join(dir, "state.json");

  const identity =
    makeIdentity(94700000);

  const poolA =
    `0x${"44".repeat(32)}`;

  const poolB =
    `0x${"55".repeat(32)}`;

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

    completeStage(
      state,
      "DISCOVERY",
      {
        pools: [
          { poolId: poolA },
          { poolId: poolB }
        ]
      }
    );

    const stateView = {
      async getLiquidity(poolId) {
        return poolId === poolA
          ? require("ethers").ethers.BigNumber.from(9)
          : require("ethers").ethers.constants.Zero;
      }
    };

    const result =
      await runActive({
        provider: {},
        file,
        state,
        stateView
      });

    assert.equal(
      result.totalPools,
      2
    );

    assert.equal(
      result.activePools,
      1
    );

    assert.equal(
      result.inactivePools,
      1
    );

    assert.equal(
      state.completedStages.includes(
        "ACTIVE"
      ),
      true
    );

    const reloaded =
      loadResearchState(
        file,
        identity
      );

    assert.equal(
      reloaded.stages.ACTIVE.observations.length,
      2
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

test("ACTIVE failure stays incomplete and successful pools resume from cache", async () => {
  const {
    runActive
  } = require("../scripts/research/runPolygonV4Research");

  const dir =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "apollo-v4-active-resume-"
      )
    );

  const file =
    path.join(dir, "state.json");

  const identity =
    makeIdentity(94700000);

  const poolA =
    `0x${"66".repeat(32)}`;

  const poolB =
    `0x${"77".repeat(32)}`;

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

    completeStage(
      state,
      "DISCOVERY",
      {
        pools: [
          { poolId: poolA },
          { poolId: poolB }
        ]
      }
    );

    let firstCalls = 0;

    const failingView = {
      async getLiquidity(poolId) {
        firstCalls += 1;

        if (poolId === poolB) {
          const error =
            new Error("temporary failure");

          error.code =
            "SERVER_ERROR";

          throw error;
        }

        return require("ethers").ethers.BigNumber.from(5);
      }
    };

    await assert.rejects(
      () =>
        runActive({
          provider: {},
          file,
          state,
          stateView:
            failingView
        }),
      /ACTIVE incomplete/
    );

    assert.equal(
      firstCalls,
      2
    );

    assert.equal(
      state.completedStages.includes(
        "ACTIVE"
      ),
      false
    );

    const saved =
      loadResearchState(
        file,
        identity
      );

    assert.equal(
      saved.stages.ACTIVE.observations.length,
      2
    );

    assert.equal(
      saved.stages.ACTIVE.observations.filter(
        item => item.ok
      ).length,
      1
    );

    assert.equal(
      saved.stages.ACTIVE.observations.filter(
        item => !item.ok
      ).length,
      1
    );

    let resumedCalls = 0;

    const recoveredView = {
      async getLiquidity(poolId) {
        resumedCalls += 1;

        assert.equal(
          poolId,
          poolB
        );

        return require("ethers").ethers.BigNumber.from(7);
      }
    };

    const result =
      await runActive({
        provider: {},
        file,
        state: saved,
        stateView:
          recoveredView
      });

    assert.equal(
      resumedCalls,
      1
    );

    assert.equal(
      result.activePools,
      2
    );

    assert.equal(
      saved.completedStages.includes(
        "ACTIVE"
      ),
      true
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

test("STRUCTURAL requires ACTIVE completion", async () => {
  const {
    runStructural
  } = require("../scripts/research/runPolygonV4Research");

  const state =
    createResearchState(
      makeIdentity(94700000)
    );

  await assert.rejects(
    () =>
      runStructural({
        provider: {},
        file: "/tmp/not-used.json",
        state
      }),
    /before ACTIVE/
  );
});

test("STRUCTURAL checkpoints exact three-leg endpoint evidence", async () => {
  const {
    runStructural,
    requiredOuterPairs
  } = require("../scripts/research/runPolygonV4Research");

  const dir =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "apollo-v4-structural-"
      )
    );

  const file =
    path.join(dir, "state.json");

  const identity =
    makeIdentity(94700000);

  const startCore = {
    symbol: "WPOL",
    address:
      "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    decimals: 18
  };

  const endpointCore = {
    symbol: "WETH",
    address:
      "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    decimals: 18
  };

  const exotic =
    "0x1111111111111111111111111111111111111111";

  const poolId =
    `0x${"88".repeat(32)}`;

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

    completeStage(
      state,
      "DISCOVERY",
      {
        pools: [
          {
            poolId,
            poolKey: {
              currency0:
                endpointCore.address,
              currency1:
                exotic,
              fee: 500,
              tickSpacing: 10,
              hooks:
                "0x0000000000000000000000000000000000000000"
            }
          }
        ]
      }
    );

    completeStage(
      state,
      "ACTIVE",
      {
        observations: [
          {
            poolId,
            blockTag:
              identity.pinnedBlock,
            ok: true,
            liquidity: "1",
            active: true
          }
        ]
      }
    );

    let metadataCalls = 0;
    const outerCalls = [];

    const result =
      await runStructural({
        provider: {},
        file,
        state,
        cores: [
          startCore,
          endpointCore
        ],
        venues: [
          "QUICKSWAP_V2"
        ],

        async observeTokenDecimalsFn(args) {
          metadataCalls += 1;

          assert.equal(
            args.blockTag,
            identity.pinnedBlock
          );

          assert.equal(
            args.tokenAddress,
            exotic
          );

          return {
            tokenAddress:
              exotic,
            blockTag:
              identity.pinnedBlock,
            status:
              "METADATA_OK",
            decimals: 6
          };
        },

        async observeTokenAgainstCoreFn(args) {
          assert.equal(
            args.blockTag,
            identity.pinnedBlock
          );

          outerCalls.push({
            core:
              args.coreToken.address
                .toLowerCase(),
            candidate:
              args.candidateAddress
                .toLowerCase(),
            decimals:
              args.candidateDecimals
          });

          const start =
            args.coreToken.address
              .toLowerCase();

          const candidate =
            args.candidateAddress
              .toLowerCase();

          const isExoticFromStart =
            start ===
              startCore.address.toLowerCase() &&
            candidate ===
              exotic.toLowerCase();

          const isCoreFromStart =
            start ===
              startCore.address.toLowerCase() &&
            candidate ===
              endpointCore.address.toLowerCase();

          return {
            core: {
              symbol:
                args.coreToken.symbol,
              address:
                start,
              decimals:
                args.coreToken.decimals
            },

            candidate: {
              address:
                candidate,
              decimals:
                args.candidateDecimals
            },

            blockTag:
              identity.pinnedBlock,

            entry: {
              summary: {
                status:
                  isExoticFromStart
                    ? "QUOTE_OK"
                    : "NO_ROUTE",
                connected:
                  isExoticFromStart,
                venues:
                  isExoticFromStart
                    ? ["QUICKSWAP_V2"]
                    : []
              }
            },

            exit: {
              summary: {
                status:
                  isCoreFromStart
                    ? "QUOTE_OK"
                    : "NO_ROUTE",
                connected:
                  isCoreFromStart,
                venues:
                  isCoreFromStart
                    ? ["QUICKSWAP_V2"]
                    : []
              }
            },

            hasEntry:
              isExoticFromStart,

            hasExit:
              isCoreFromStart,

            conclusive: true
          };
        }
      });

    assert.equal(
      metadataCalls,
      1
    );

    // With two possible start cores:
    //
    // WPOL -> WETH
    // WPOL -> exotic
    // WETH -> exotic
    //
    // WETH -> WETH is correctly excluded as identity.
    assert.equal(
      outerCalls.length,
      3
    );

    assert.deepEqual(
      outerCalls,
      [
        {
          core:
            startCore.address.toLowerCase(),
          candidate:
            endpointCore.address.toLowerCase(),
          decimals: 18
        },
        {
          core:
            startCore.address.toLowerCase(),
          candidate:
            exotic.toLowerCase(),
          decimals: 6
        },
        {
          core:
            endpointCore.address.toLowerCase(),
          candidate:
            exotic.toLowerCase(),
          decimals: 6
        }
      ]
    );

    assert.equal(
      result.unresolved.length,
      0
    );

    assert.equal(
      result.results.counts
        .withOrientation,
      1
    );

    const orientations =
      result.results.pools[0]
        .orientations;

    assert.deepEqual(
      orientations,
      [
        {
          direction:
            "ONE_FOR_ZERO",
          start: {
            symbol:
              startCore.symbol,
            address:
              startCore.address.toLowerCase(),
            decimals: 18
          }
        }
      ]
    );

    assert.equal(
      state.completedStages.includes(
        "STRUCTURAL"
      ),
      true
    );

    const pairs =
      requiredOuterPairs({
        classifications:
          result.classifications,
        cores: [
          startCore,
          endpointCore
        ],
        metadata:
          result.metadata
      });

    assert.equal(
      pairs.length,
      3
    );

    // CORE endpoint gets registry decimals without a
    // metadata observation.
    const corePair =
      pairs.find(
        pair =>
          pair.core.address
            .toLowerCase() ===
            startCore.address.toLowerCase() &&
          pair.candidateAddress ===
            endpointCore.address.toLowerCase()
      );

    assert.equal(
      corePair.candidateDecimals,
      18
    );

    const reloaded =
      loadResearchState(
        file,
        identity
      );

    assert.equal(
      reloaded.completedStages.includes(
        "STRUCTURAL"
      ),
      true
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

test("STRUCTURAL RPC failure retries only unresolved outer evidence", async () => {
  const {
    runStructural
  } = require("../scripts/research/runPolygonV4Research");

  const dir =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "apollo-v4-structural-resume-"
      )
    );

  const file =
    path.join(dir, "state.json");

  const identity =
    makeIdentity(94700000);

  const startCore = {
    symbol: "WPOL",
    address:
      "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    decimals: 18
  };

  const endpointCore = {
    symbol: "WETH",
    address:
      "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    decimals: 18
  };

  const exotic =
    "0x2222222222222222222222222222222222222222";

  const poolId =
    `0x${"99".repeat(32)}`;

  try {
    const state =
      createResearchState(identity);

    completeStage(
      state,
      "PINNED",
      {}
    );

    completeStage(
      state,
      "DISCOVERY",
      {
        pools: [
          {
            poolId,
            poolKey: {
              currency0:
                endpointCore.address,
              currency1:
                exotic,
              fee: 500,
              tickSpacing: 10,
              hooks:
                "0x0000000000000000000000000000000000000000"
            }
          }
        ]
      }
    );

    completeStage(
      state,
      "ACTIVE",
      {
        observations: [
          {
            poolId,
            blockTag:
              identity.pinnedBlock,
            ok: true,
            liquidity: "5",
            active: true
          }
        ]
      }
    );

    let metadataCalls = 0;
    const firstCalls = [];

    await assert.rejects(
      () =>
        runStructural({
          provider: {},
          file,
          state,
          cores: [
            startCore,
            endpointCore
          ],
          venues: [
            "UNISWAP_V3"
          ],

          async observeTokenDecimalsFn() {
            metadataCalls += 1;

            return {
              tokenAddress:
                exotic,
              blockTag:
                identity.pinnedBlock,
              status:
                "METADATA_OK",
              decimals: 6
            };
          },

          async observeTokenAgainstCoreFn(args) {
            const key =
              `${args.coreToken.address.toLowerCase()}:` +
              `${args.candidateAddress.toLowerCase()}`;

            firstCalls.push(key);

            const unresolved =
              args.coreToken.address
                .toLowerCase() ===
                startCore.address.toLowerCase() &&
              args.candidateAddress
                .toLowerCase() ===
                exotic.toLowerCase();

            return {
              core: {
                symbol:
                  args.coreToken.symbol,
                address:
                  args.coreToken.address.toLowerCase(),
                decimals:
                  args.coreToken.decimals
              },

              candidate: {
                address:
                  args.candidateAddress.toLowerCase(),
                decimals:
                  args.candidateDecimals
              },

              blockTag:
                identity.pinnedBlock,

              entry: {
                summary: {
                  status:
                    unresolved
                      ? "QUOTE_OK"
                      : "NO_ROUTE",
                  connected:
                    unresolved
                      ? true
                      : false,
                  venues:
                    unresolved
                      ? ["UNISWAP_V3"]
                      : []
                }
              },

              exit: {
                summary: {
                  status:
                    unresolved
                      ? "RPC_FAILURE"
                      : "NO_ROUTE",
                  connected:
                    unresolved
                      ? null
                      : false,
                  venues: []
                }
              },

              hasEntry:
                unresolved
                  ? true
                  : false,

              hasExit:
                unresolved
                  ? null
                  : false,

              conclusive:
                !unresolved
            };
          }
        }),
      /STRUCTURAL incomplete/
    );

    assert.equal(
      metadataCalls,
      1
    );

    assert.equal(
      firstCalls.length,
      3
    );

    assert.equal(
      state.completedStages.includes(
        "STRUCTURAL"
      ),
      false
    );

    const saved =
      loadResearchState(
        file,
        identity
      );

    let resumedMetadataCalls = 0;
    const resumedCalls = [];

    const result =
      await runStructural({
        provider: {},
        file,
        state: saved,
        cores: [
          startCore,
          endpointCore
        ],
        venues: [
          "UNISWAP_V3"
        ],

        async observeTokenDecimalsFn() {
          resumedMetadataCalls += 1;

          throw new Error(
            "resolved metadata must remain cached"
          );
        },

        async observeTokenAgainstCoreFn(args) {
          resumedCalls.push({
            core:
              args.coreToken.address
                .toLowerCase(),
            candidate:
              args.candidateAddress
                .toLowerCase()
          });

          return {
            core: {
              symbol:
                args.coreToken.symbol,
              address:
                args.coreToken.address.toLowerCase(),
              decimals:
                args.coreToken.decimals
            },

            candidate: {
              address:
                args.candidateAddress.toLowerCase(),
              decimals:
                args.candidateDecimals
            },

            blockTag:
              identity.pinnedBlock,

            entry: {
              summary: {
                status:
                  "QUOTE_OK",
                connected:
                  true,
                venues: [
                  "UNISWAP_V3"
                ]
              }
            },

            exit: {
              summary: {
                status:
                  "NO_ROUTE",
                connected:
                  false,
                venues: []
              }
            },

            hasEntry: true,
            hasExit: false,
            conclusive: true
          };
        }
      });

    assert.equal(
      resumedMetadataCalls,
      0
    );

    // Only the previously unresolved WPOL/exotic pair
    // should be retried. Both conclusive pairs stay cached.
    assert.deepEqual(
      resumedCalls,
      [
        {
          core:
            startCore.address.toLowerCase(),
          candidate:
            exotic.toLowerCase()
        }
      ]
    );

    assert.equal(
      result.unresolved.length,
      0
    );

    assert.equal(
      state.completedStages.includes(
        "STRUCTURAL"
      ),
      false
    );

    assert.equal(
      saved.completedStages.includes(
        "STRUCTURAL"
      ),
      true
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
