"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createProtectedPeakProviderObserver
} = require(
  "../scripts/research/runPolygonV4ProtectedPeakProviderObserver"
);

test(
  "creates a zero-argument observer without reading the provider",
  async () => {
    let calls = 0;

    const provider = {
      async getBlockNumber() {
        calls += 1;
        return 94834040;
      }
    };

    const observeBlockFn =
      createProtectedPeakProviderObserver({
        provider
      });

    assert.equal(
      typeof observeBlockFn,
      "function"
    );

    assert.equal(calls, 0);

    assert.equal(
      await observeBlockFn(),
      94834040
    );

    assert.equal(calls, 1);
  }
);

test(
  "delegates each invocation exactly once",
  async () => {
    let calls = 0;

    const provider = {
      async getBlockNumber() {
        calls += 1;
        return 94834040 + calls;
      }
    };

    const observeBlockFn =
      createProtectedPeakProviderObserver({
        provider
      });

    assert.equal(
      await observeBlockFn(),
      94834041
    );

    assert.equal(
      await observeBlockFn(),
      94834042
    );

    assert.equal(calls, 2);
  }
);

test(
  "forwards the exact provider to the provider-block dependency",
  async () => {
    const provider = {
      marker: "exact-provider"
    };

    let receivedArgs = null;

    const observeBlockFn =
      createProtectedPeakProviderObserver({
        provider,
        observeProviderBlockFn:
          async args => {
            receivedArgs = args;
            return 94834040;
          }
      });

    const blockTag =
      await observeBlockFn();

    assert.equal(
      blockTag,
      94834040
    );

    assert.deepEqual(
      receivedArgs,
      { provider }
    );
  }
);

test(
  "rejects an invalid provider-block dependency before observation",
  async () => {
    assert.throws(
      () =>
        createProtectedPeakProviderObserver({
          provider: {},
          observeProviderBlockFn: null
        }),
      /observeProviderBlockFn must be a function/
    );
  }
);

test(
  "preserves provider validation in the 1L dependency",
  async () => {
    const observeBlockFn =
      createProtectedPeakProviderObserver({
        provider: null
      });

    await assert.rejects(
      observeBlockFn(),
      /provider required/
    );
  }
);

test(
  "propagates provider-block failure unchanged",
  async () => {
    const failure =
      new Error("provider block failed");

    const observeBlockFn =
      createProtectedPeakProviderObserver({
        provider: {},
        observeProviderBlockFn:
          async () => {
            throw failure;
          }
      });

    await assert.rejects(
      observeBlockFn(),
      error => error === failure
    );
  }
);
