"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  runProviderGatedProtectedPeakStability
} = require(
  "../scripts/research/runPolygonV4ProtectedPeakProviderGatedStability"
);

test(
  "binds provider-backed snapshot and observer dependencies into gated stability",
  async () => {
    const provider = {};
    const calls = [];
    const observer =
      async () => 94834041;

    const result =
      await runProviderGatedProtectedPeakStability({
        provider,
        count: 3,
        minimumBlockGap: 2,
        maxAttempts: 4,
        amounts: ["amount"],
        acquireProviderSnapshotFn:
          async args => {
            calls.push([
              "acquire",
              args
            ]);

            return {
              blockTag: 94834040
            };
          },
        createProviderObserverFn:
          args => {
            calls.push([
              "createObserver",
              args
            ]);

            return observer;
          },
        runGatedStabilityFn:
          async args => {
            calls.push([
              "run",
              args
            ]);

            return {
              ok: true
            };
          }
      });

    assert.deepEqual(
      result,
      { ok: true }
    );

    assert.equal(
      calls.length,
      2
    );

    assert.equal(
      calls[0][0],
      "createObserver"
    );

    assert.deepEqual(
      calls[0][1],
      { provider }
    );

    const runArgs =
      calls[1][1];

    assert.equal(
      runArgs.provider,
      provider
    );
    assert.equal(
      runArgs.count,
      3
    );
    assert.equal(
      runArgs.minimumBlockGap,
      2
    );
    assert.equal(
      runArgs.maxAttempts,
      4
    );
    assert.deepEqual(
      runArgs.amounts,
      ["amount"]
    );
    assert.equal(
      runArgs.observeBlockFn,
      observer
    );

    assert.equal(
      typeof runArgs.acquireSnapshotFn,
      "function"
    );

    assert.equal(
      calls.length,
      2
    );

    await runArgs.acquireSnapshotFn();

    assert.equal(
      calls.length,
      3
    );
    assert.equal(
      calls[2][0],
      "acquire"
    );
    assert.deepEqual(
      calls[2][1],
      { provider }
    );
  }
);

test(
  "does not invent an amounts override when omitted",
  async () => {
    const provider = {};
    let received;

    await runProviderGatedProtectedPeakStability({
      provider,
      count: 1,
      minimumBlockGap: 1,
      maxAttempts: 1,
      acquireProviderSnapshotFn:
        async () => ({
          blockTag: 1
        }),
      createProviderObserverFn:
        () => async () => 2,
      runGatedStabilityFn:
        async args => {
          received = args;
          return {};
        }
    });

    assert.deepEqual(
      Object.keys(received).sort(),
      [
        "acquireSnapshotFn",
        "count",
        "maxAttempts",
        "minimumBlockGap",
        "observeBlockFn",
        "provider"
      ]
    );
  }
);

test(
  "rejects invalid composition dependencies before observer creation",
  async () => {
    for (
      const override of [
        {
          acquireProviderSnapshotFn:
            null
        },
        {
          createProviderObserverFn:
            null
        },
        {
          runGatedStabilityFn:
            null
        }
      ]
    ) {
      let created = false;

      await assert.rejects(
        runProviderGatedProtectedPeakStability({
          provider: {},
          count: 1,
          minimumBlockGap: 1,
          maxAttempts: 1,
          acquireProviderSnapshotFn:
            async () => ({}),
          createProviderObserverFn:
            () => {
              created = true;
              return async () => 1;
            },
          runGatedStabilityFn:
            async () => ({}),
          ...override
        }),
        /must be a function/
      );

      assert.equal(
        created,
        false
      );
    }
  }
);

test(
  "rejects a malformed observer factory result before gated execution",
  async () => {
    let ran = false;

    await assert.rejects(
      runProviderGatedProtectedPeakStability({
        provider: {},
        count: 1,
        minimumBlockGap: 1,
        maxAttempts: 1,
        acquireProviderSnapshotFn:
          async () => ({}),
        createProviderObserverFn:
          () => null,
        runGatedStabilityFn:
          async () => {
            ran = true;
            return {};
          }
      }),
      /must return a function/
    );

    assert.equal(
      ran,
      false
    );
  }
);

test(
  "propagates observer factory failure unchanged",
  async () => {
    const failure =
      new Error("observer failure");

    await assert.rejects(
      runProviderGatedProtectedPeakStability({
        provider: {},
        count: 1,
        minimumBlockGap: 1,
        maxAttempts: 1,
        acquireProviderSnapshotFn:
          async () => ({}),
        createProviderObserverFn:
          () => {
            throw failure;
          },
        runGatedStabilityFn:
          async () => ({})
      }),
      error => error === failure
    );
  }
);

test(
  "propagates gated stability failure unchanged",
  async () => {
    const failure =
      new Error("gated failure");

    await assert.rejects(
      runProviderGatedProtectedPeakStability({
        provider: {},
        count: 1,
        minimumBlockGap: 1,
        maxAttempts: 1,
        acquireProviderSnapshotFn:
          async () => ({}),
        createProviderObserverFn:
          () => async () => 1,
        runGatedStabilityFn:
          async () => {
            throw failure;
          }
      }),
      error => error === failure
    );
  }
);
