"use strict";

const test =
  require("node:test");
const assert =
  require("node:assert/strict");

const {
  CHAIN_ID,
  OPERATIONAL_COUNT,
  OPERATIONAL_MINIMUM_BLOCK_GAP,
  OPERATIONAL_MAX_ATTEMPTS,
  OPERATIONAL_MAX_CYCLES,
  OPERATIONAL_WAIT_MS,
  createPolygonProvider,
  runProtectedPeakProviderOperational
} = require(
  "../scripts/research/runPolygonV4ProtectedPeakProviderOperational"
);

test(
  "exports explicit bounded operational policy",
  () => {
    assert.equal(CHAIN_ID, 137);
    assert.equal(OPERATIONAL_COUNT, 2);
    assert.equal(
      OPERATIONAL_MINIMUM_BLOCK_GAP,
      1
    );
    assert.equal(
      OPERATIONAL_MAX_ATTEMPTS,
      3
    );
    assert.equal(
      OPERATIONAL_MAX_CYCLES,
      2
    );
    assert.equal(
      OPERATIONAL_WAIT_MS,
      5000
    );
  }
);

test(
  "rejects missing rpc before provider construction",
  () => {
    assert.throws(
      () =>
        createPolygonProvider(),
      /INFURA_POLYGON is not set/
    );
  }
);

test(
  "constructs Polygon provider without signer",
  () => {
    const provider =
      createPolygonProvider(
        "http://127.0.0.1:8545"
      );

    assert.equal(
      provider.network.chainId,
      CHAIN_ID
    );
  }
);

test(
  "constructs provider once and delegates exact policy once",
  async () => {
    const provider = {};
    const amounts = [
      "100",
      "200"
    ];
    const calls = [];
    let providerCalls = 0;

    const expected = {
      complete: true,
      marker: "operational-result"
    };

    const result =
      await runProtectedPeakProviderOperational({
        rpc: "mock-rpc",
        count: 3,
        minimumBlockGap: 2,
        maxAttempts: 7,
        maxCycles: 4,
        waitMs: 9000,
        amounts,
        createProviderFn:
          rpc => {
            providerCalls += 1;
            assert.equal(
              rpc,
              "mock-rpc"
            );
            return provider;
          },
        runTimedCadenceFn:
          async args => {
            calls.push(args);
            return expected;
          }
      });

    assert.equal(
      providerCalls,
      1
    );

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
        waitMs: 9000,
        amounts
      }
    );

    assert.strictEqual(
      result,
      expected
    );
  }
);

test(
  "does not invent omitted policy",
  async () => {
    const provider = {};
    let received;

    await runProtectedPeakProviderOperational({
      rpc: "mock-rpc",
      createProviderFn:
        () => provider,
      runTimedCadenceFn:
        async args => {
          received = args;
          return {
            complete: true
          };
        }
    });

    assert.deepEqual(
      received,
      {
        provider,
        count: undefined,
        minimumBlockGap: undefined,
        maxAttempts: undefined,
        maxCycles: undefined,
        waitMs: undefined
      }
    );
  }
);

test(
  "does not invent omitted amounts",
  async () => {
    let received;

    await runProtectedPeakProviderOperational({
      rpc: "mock-rpc",
      createProviderFn:
        () => ({}),
      runTimedCadenceFn:
        async args => {
          received = args;
          return {
            complete: true
          };
        }
    });

    assert.equal(
      Object.prototype
        .hasOwnProperty.call(
          received,
          "amounts"
        ),
      false
    );
  }
);

test(
  "rejects invalid dependencies before construction",
  async () => {
    let providerCalls = 0;

    await assert.rejects(
      runProtectedPeakProviderOperational({
        rpc: "mock-rpc",
        createProviderFn: null,
        runTimedCadenceFn:
          async () => ({})
      }),
      /createProviderFn must be a function/
    );

    await assert.rejects(
      runProtectedPeakProviderOperational({
        rpc: "mock-rpc",
        createProviderFn:
          () => {
            providerCalls += 1;
            return {};
          },
        runTimedCadenceFn: null
      }),
      /runTimedCadenceFn must be a function/
    );

    assert.equal(
      providerCalls,
      0
    );
  }
);

test(
  "propagates timed cadence failure unchanged",
  async () => {
    const failure =
      new Error(
        "timed cadence failed"
      );

    await assert.rejects(
      runProtectedPeakProviderOperational({
        rpc: "mock-rpc",
        createProviderFn:
          () => ({}),
        runTimedCadenceFn:
          async () => {
            throw failure;
          }
      }),
      error =>
        error === failure
    );
  }
);
