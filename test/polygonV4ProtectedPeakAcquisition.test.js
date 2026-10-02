"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const { ethers } =
  require("ethers");

const {
  validateSnapshotSequence,
  collectProtectedPeakSnapshots,
  runAcquiredProtectedPeakStability
} = require(
  "../scripts/research/runPolygonV4ProtectedPeakAcquisition"
);

function snapshot(
  blockTag,
  gasPriceWei = "200",
  premiumBps = 5
) {
  return {
    blockTag,
    gasPriceWei:
      ethers.BigNumber.from(
        gasPriceWei
      ),
    premiumBps,
    provenance: {
      quoteBlock: "PINNED",
      aavePremium:
        "BLOCK_PINNED",
      gasPrice:
        "OBSERVED_AT_ACQUISITION"
    }
  };
}

test(
  "accepts only a strictly increasing snapshot block sequence",
  () => {
    const snapshots = [
      snapshot(100),
      snapshot(101),
      snapshot(105)
    ];

    assert.equal(
      validateSnapshotSequence(
        snapshots
      ),
      snapshots
    );

    assert.throws(
      () =>
        validateSnapshotSequence([]),
      /non-empty array/
    );

    assert.throws(
      () =>
        validateSnapshotSequence([
          snapshot(100),
          snapshot(100)
        ]),
      /strictly increasing/
    );

    assert.throws(
      () =>
        validateSnapshotSequence([
          snapshot(101),
          snapshot(100)
        ]),
      /strictly increasing/
    );

    assert.throws(
      () =>
        validateSnapshotSequence([
          snapshot(100),
          {
            ...snapshot(101),
            blockTag: 0
          }
        ]),
      /positive safe integer/
    );
  }
);

test(
  "collects the requested number of independent provider-only snapshots",
  async () => {
    const provider = {};
    const blocks = [
      94834040,
      94834041,
      94834045
    ];

    const calls = [];

    const acquireSnapshotFn =
      async args => {
        calls.push(args);

        const blockTag =
          blocks[
            calls.length - 1
          ];

        return snapshot(
          blockTag,
          String(
            278281592114 +
              calls.length
          )
        );
      };

    const snapshots =
      await collectProtectedPeakSnapshots({
        provider,
        count: 3,
        acquireSnapshotFn
      });

    assert.equal(
      calls.length,
      3
    );

    for (const call of calls) {
      assert.deepEqual(
        call,
        { provider }
      );
    }

    assert.deepEqual(
      snapshots.map(
        row => row.blockTag
      ),
      blocks
    );

    assert.deepEqual(
      snapshots.map(
        row =>
          row.provenance
            .gasPrice
      ),
      [
        "OBSERVED_AT_ACQUISITION",
        "OBSERVED_AT_ACQUISITION",
        "OBSERVED_AT_ACQUISITION"
      ]
    );
  }
);

test(
  "fails closed instead of accepting duplicate or backward acquired blocks",
  async () => {
    const provider = {};

    for (
      const blocks of [
        [100, 100],
        [101, 100]
      ]
    ) {
      let index = 0;

      await assert.rejects(
        collectProtectedPeakSnapshots({
          provider,
          count: 2,
          acquireSnapshotFn:
            async () =>
              snapshot(
                blocks[index++]
              )
        }),
        /strictly increasing/
      );
    }
  }
);

test(
  "fails closed on invalid collection dependencies",
  async () => {
    await assert.rejects(
      collectProtectedPeakSnapshots({
        provider: null,
        count: 1
      }),
      /provider required/
    );

    await assert.rejects(
      collectProtectedPeakSnapshots({
        provider: {},
        count: 0
      }),
      /count/
    );

    await assert.rejects(
      collectProtectedPeakSnapshots({
        provider: {},
        count: 1.5
      }),
      /count/
    );

    await assert.rejects(
      collectProtectedPeakSnapshots({
        provider: {},
        count: 1,
        acquireSnapshotFn:
          null
      }),
      /acquireSnapshotFn/
    );

    await assert.rejects(
      collectProtectedPeakSnapshots({
        provider: {},
        count: 1,
        acquireSnapshotFn:
          async () => null
      }),
      /snapshot must be an object/
    );
  }
);

test(
  "feeds the completed acquired snapshot set into 1E unchanged",
  async () => {
    const provider = {};

    const acquired = [
      snapshot(
        200,
        "300",
        5
      ),
      snapshot(
        201,
        "400",
        6
      )
    ];

    let acquireIndex = 0;
    const stabilityCalls = [];

    const amounts = [
      {
        display: "0.105",
        amount: "105"
      }
    ];

    const runStabilityFn =
      async args => {
        stabilityCalls.push(args);

        return {
          snapshots: [],
          summary: {
            snapshotCount:
              args.snapshots.length
          }
        };
      };

    const result =
      await runAcquiredProtectedPeakStability({
        provider,
        count: 2,
        amounts,
        acquireSnapshotFn:
          async () =>
            acquired[
              acquireIndex++
            ],
        runStabilityFn
      });

    assert.equal(
      stabilityCalls.length,
      1
    );

    assert.equal(
      stabilityCalls[0]
        .provider,
      provider
    );

    assert.equal(
      stabilityCalls[0]
        .snapshots,
      result.acquiredSnapshots
    );

    assert.equal(
      stabilityCalls[0]
        .snapshots[0],
      acquired[0]
    );

    assert.equal(
      stabilityCalls[0]
        .snapshots[1],
      acquired[1]
    );

    assert.equal(
      stabilityCalls[0]
        .amounts,
      amounts
    );

    assert.equal(
      result.stability
        .summary
        .snapshotCount,
      2
    );
  }
);

test(
  "does not invent an amounts override when the caller omits it",
  async () => {
    const provider = {};
    let received;

    await runAcquiredProtectedPeakStability({
      provider,
      count: 1,
      acquireSnapshotFn:
        async () =>
          snapshot(300),
      runStabilityFn:
        async args => {
          received = args;

          return {
            snapshots: [],
            summary: {
              snapshotCount: 1
            }
          };
        }
    });

    assert.deepEqual(
      Object.keys(received)
        .sort(),
      [
        "provider",
        "snapshots"
      ]
    );
  }
);

test(
  "rejects an invalid stability dependency before acquisition",
  async () => {
    let acquired = false;

    await assert.rejects(
      runAcquiredProtectedPeakStability({
        provider: {},
        count: 1,
        acquireSnapshotFn:
          async () => {
            acquired = true;
            return snapshot(400);
          },
        runStabilityFn:
          null
      }),
      /runStabilityFn/
    );

    assert.equal(
      acquired,
      false
    );
  }
);
