"use strict";

const test =
  require("node:test");
const assert =
  require("node:assert/strict");

const {
  sleep,
  runProtectedPeakProviderTimedCadence
} = require(
  "../scripts/research/runPolygonV4ProtectedPeakProviderTimedCadence"
);

test(
  "exports a real wait function",
  () => {
    assert.equal(
      typeof sleep,
      "function"
    );
  }
);

test(
  "real sleep returns an awaitable that resolves",
  async () => {
    const pending =
      sleep(0);

    assert.equal(
      typeof pending.then,
      "function"
    );

    await pending;
  }
);

test(
  "delegates exact cadence policy and provider once",
  async () => {
    const provider = {};
    const amounts = [
      "100",
      "200"
    ];
    const waitFn =
      async () => {};
    const expected = {
      complete: true,
      marker: "exact-result"
    };

    const calls = [];

    const result =
      await runProtectedPeakProviderTimedCadence({
        provider,
        count: 3,
        minimumBlockGap: 2,
        maxAttempts: 7,
        maxCycles: 4,
        waitMs: 5000,
        amounts,
        waitFn,
        runCadenceFn:
          async args => {
            calls.push(args);
            return expected;
          }
      });

    assert.equal(
      calls.length,
      1
    );

    assert.deepEqual(
      calls[0],
      {
        provider,
        count: 3,
        minimumBlockGap: 2,
        maxAttempts: 7,
        maxCycles: 4,
        waitMs: 5000,
        amounts,
        waitFn
      }
    );

    assert.strictEqual(
      result,
      expected
    );
  }
);

test(
  "does not invent omitted amounts",
  async () => {
    const provider = {};
    const waitFn =
      async () => {};

    let received;

    await runProtectedPeakProviderTimedCadence({
      provider,
      count: 2,
      minimumBlockGap: 1,
      maxAttempts: 3,
      maxCycles: 2,
      waitMs: 1000,
      waitFn,
      runCadenceFn:
        async args => {
          received = args;
          return {
            complete: true
          };
        }
    });

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        received,
        "amounts"
      ),
      false
    );

    assert.strictEqual(
      received.provider,
      provider
    );

    assert.strictEqual(
      received.waitFn,
      waitFn
    );
  }
);

test(
  "rejects invalid dependencies before delegation",
  async () => {
    let calls = 0;

    await assert.rejects(
      runProtectedPeakProviderTimedCadence({
        provider: {},
        count: 1,
        minimumBlockGap: 1,
        maxAttempts: 1,
        maxCycles: 1,
        waitMs: 0,
        runCadenceFn: null,
        waitFn:
          async () => {}
      }),
      /runCadenceFn must be a function/
    );

    await assert.rejects(
      runProtectedPeakProviderTimedCadence({
        provider: {},
        count: 1,
        minimumBlockGap: 1,
        maxAttempts: 1,
        maxCycles: 1,
        waitMs: 0,
        runCadenceFn:
          async () => {
            calls += 1;
          },
        waitFn: null
      }),
      /waitFn must be a function/
    );

    assert.equal(
      calls,
      0
    );
  }
);

test(
  "propagates cadence failure unchanged",
  async () => {
    const failure =
      new Error(
        "cadence failed"
      );

    await assert.rejects(
      runProtectedPeakProviderTimedCadence({
        provider: {},
        count: 1,
        minimumBlockGap: 1,
        maxAttempts: 1,
        maxCycles: 1,
        waitMs: 0,
        waitFn:
          async () => {},
        runCadenceFn:
          async () => {
            throw failure;
          }
      }),
      error =>
        error === failure
    );
  }
);
