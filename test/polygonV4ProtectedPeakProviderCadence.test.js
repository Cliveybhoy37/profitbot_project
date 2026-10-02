"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  validateMaxCycles,
  validateWaitMs,
  runProtectedPeakProviderCadence
} = require(
  "../scripts/research/runPolygonV4ProtectedPeakProviderCadence"
);

test(
  "validates bounded cadence policy",
  () => {
    assert.equal(
      validateMaxCycles(3),
      3
    );

    assert.equal(
      validateWaitMs(0),
      0
    );

    assert.equal(
      validateWaitMs(5000),
      5000
    );

    for (
      const value of [
        0,
        -1,
        1.5,
        Number.MAX_SAFE_INTEGER + 1,
        Infinity
      ]
    ) {
      assert.throws(
        () =>
          validateMaxCycles(
            value
          ),
        /positive safe integer/
      );
    }

    for (
      const value of [
        -1,
        1.5,
        Number.MAX_SAFE_INTEGER + 1,
        Infinity
      ]
    ) {
      assert.throws(
        () =>
          validateWaitMs(
            value
          ),
        /non-negative safe integer/
      );
    }
  }
);

test(
  "runs exact bounded cycles and waits only between cycles",
  async () => {
    const provider = {};
    const calls = [];

    const results = [
      {
        acquisition: {
          complete: false
        },
        stability: null
      },
      {
        acquisition: {
          complete: true
        },
        stability: {
          stable: true
        }
      },
      {
        acquisition: {
          complete: true
        },
        stability: {
          stable: false
        }
      }
    ];

    const output =
      await runProtectedPeakProviderCadence({
        provider,
        count: 3,
        minimumBlockGap: 2,
        maxAttempts: 4,
        maxCycles: 3,
        waitMs: 5000,
        amounts: [1n, 2n],
        runProviderGatedStabilityFn:
          async args => {
            const index =
              calls.filter(
                call =>
                  call[0] ===
                    "run"
              ).length;

            calls.push([
              "run",
              args
            ]);

            return results[
              index
            ];
          },
        waitFn:
          async ms => {
            calls.push([
              "wait",
              ms
            ]);
          }
      });

    assert.deepEqual(
      calls.map(
        call => call[0]
      ),
      [
        "run",
        "wait",
        "run",
        "wait",
        "run"
      ]
    );

    assert.equal(
      calls[1][1],
      5000
    );

    assert.equal(
      calls[3][1],
      5000
    );

    const runCalls =
      calls.filter(
        call =>
          call[0] === "run"
      );

    for (
      const call of runCalls
    ) {
      assert.deepEqual(
        call[1],
        {
          provider,
          count: 3,
          minimumBlockGap: 2,
          maxAttempts: 4,
          amounts: [1n, 2n]
        }
      );
    }

    assert.equal(
      output.complete,
      true
    );

    assert.equal(
      output.maxCycles,
      3
    );

    assert.equal(
      output.completedCycles,
      3
    );

    assert.equal(
      output.waitMs,
      5000
    );

    assert.equal(
      output.cycles.length,
      3
    );

    for (
      let index = 0;
      index < results.length;
      index += 1
    ) {
      assert.equal(
        output.cycles[index]
          .cycle,
        index + 1
      );

      assert.equal(
        output.cycles[index]
          .result,
        results[index]
      );
    }
  }
);

test(
  "single cycle performs no wait",
  async () => {
    let waits = 0;
    const result = {
      acquisition: {
        complete: false
      },
      stability: null
    };

    const output =
      await runProtectedPeakProviderCadence({
        provider: {},
        count: 1,
        minimumBlockGap: 1,
        maxAttempts: 1,
        maxCycles: 1,
        waitMs: 0,
        runProviderGatedStabilityFn:
          async () => result,
        waitFn:
          async () => {
            waits += 1;
          }
      });

    assert.equal(
      waits,
      0
    );

    assert.equal(
      output.completedCycles,
      1
    );

    assert.equal(
      output.cycles[0].result,
      result
    );
  }
);

test(
  "does not invent an amounts override when omitted",
  async () => {
    let received;

    await runProtectedPeakProviderCadence({
      provider: {},
      count: 2,
      minimumBlockGap: 3,
      maxAttempts: 4,
      maxCycles: 1,
      waitMs: 0,
      runProviderGatedStabilityFn:
        async args => {
          received = args;

          return {
            acquisition: {
              complete: false
            },
            stability: null
          };
        },
      waitFn:
        async () => {}
    });

    assert.deepEqual(
      Object.keys(received).sort(),
      [
        "count",
        "maxAttempts",
        "minimumBlockGap",
        "provider"
      ]
    );
  }
);

test(
  "rejects invalid dependencies before running a cycle",
  async () => {
    let ran = false;

    await assert.rejects(
      runProtectedPeakProviderCadence({
        provider: {},
        count: 1,
        minimumBlockGap: 1,
        maxAttempts: 1,
        maxCycles: 1,
        waitMs: 0,
        runProviderGatedStabilityFn:
          null,
        waitFn:
          async () => {
            ran = true;
          }
      }),
      /runProviderGatedStabilityFn must be a function/
    );

    assert.equal(
      ran,
      false
    );

    await assert.rejects(
      runProtectedPeakProviderCadence({
        provider: {},
        count: 1,
        minimumBlockGap: 1,
        maxAttempts: 1,
        maxCycles: 1,
        waitMs: 0,
        runProviderGatedStabilityFn:
          async () => {
            ran = true;
            return {};
          },
        waitFn: null
      }),
      /waitFn must be a function/
    );

    assert.equal(
      ran,
      false
    );
  }
);

test(
  "propagates cycle failure unchanged and performs no later wait",
  async () => {
    const failure =
      new Error("cycle failure");

    let runs = 0;
    let waits = 0;

    await assert.rejects(
      runProtectedPeakProviderCadence({
        provider: {},
        count: 1,
        minimumBlockGap: 1,
        maxAttempts: 1,
        maxCycles: 3,
        waitMs: 1000,
        runProviderGatedStabilityFn:
          async () => {
            runs += 1;
            throw failure;
          },
        waitFn:
          async () => {
            waits += 1;
          }
      }),
      error =>
        error === failure
    );

    assert.equal(
      runs,
      1
    );

    assert.equal(
      waits,
      0
    );
  }
);

test(
  "propagates wait failure unchanged and does not start the next cycle",
  async () => {
    const failure =
      new Error("wait failure");

    let runs = 0;

    await assert.rejects(
      runProtectedPeakProviderCadence({
        provider: {},
        count: 1,
        minimumBlockGap: 1,
        maxAttempts: 1,
        maxCycles: 2,
        waitMs: 1000,
        runProviderGatedStabilityFn:
          async () => {
            runs += 1;

            return {
              acquisition: {
                complete: false
              },
              stability: null
            };
          },
        waitFn:
          async () => {
            throw failure;
          }
      }),
      error =>
        error === failure
    );

    assert.equal(
      runs,
      1
    );
  }
);
