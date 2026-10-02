"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  classifyPeakPosition,
  summarizePeakStability,
  runProtectedPeakStability
} = require(
  "../scripts/research/runPolygonV4ProtectedPeakStability"
);

test(
  "classifies absent, boundary, and interior protected peaks",
  () => {
    const rows = [
      {
        startAmount: "105"
      },
      {
        startAmount: "106"
      },
      {
        startAmount: "107"
      }
    ];

    assert.equal(
      classifyPeakPosition(
        rows,
        null
      ),
      "NONE"
    );

    assert.equal(
      classifyPeakPosition(
        rows,
        rows[0]
      ),
      "LOWER_BOUNDARY"
    );

    assert.equal(
      classifyPeakPosition(
        rows,
        rows[1]
      ),
      "INTERIOR"
    );

    assert.equal(
      classifyPeakPosition(
        rows,
        rows[2]
      ),
      "UPPER_BOUNDARY"
    );

    assert.throws(
      () =>
        classifyPeakPosition(
          rows,
          {
            startAmount: "106"
          }
        ),
      /bestProtected must reference/
    );
  }
);

test(
  "summarizes peak movement without treating boundaries as optima",
  () => {
    const snapshots = [
      {
        peakPosition:
          "INTERIOR",
        bestProtected: {
          startAmount: "123"
        }
      },
      {
        peakPosition:
          "UPPER_BOUNDARY",
        bestProtected: {
          startAmount: "130"
        }
      },
      {
        peakPosition:
          "INTERIOR",
        bestProtected: {
          startAmount: "124"
        }
      },
      {
        peakPosition:
          "NONE",
        bestProtected:
          null
      }
    ];

    assert.deepEqual(
      summarizePeakStability(
        snapshots
      ),
      {
        snapshotCount: 4,
        snapshotsWithPeak: 3,
        distinctBestAmounts: [
          "123",
          "130",
          "124"
        ],
        interiorPeakCount: 2,
        lowerBoundaryPeakCount: 0,
        upperBoundaryPeakCount: 1
      }
    );
  }
);

test(
  "rejects malformed peak summaries",
  () => {
    assert.throws(
      () =>
        summarizePeakStability([
          {
            peakPosition:
              "UNKNOWN",
            bestProtected:
              null
          }
        ]),
      /invalid peakPosition/
    );

    assert.throws(
      () =>
        summarizePeakStability([
          {
            peakPosition:
              "INTERIOR",
            bestProtected:
              null
          }
        ]),
      /bestProtected startAmount required/
    );
  }
);

test(
  "rejects malformed delegated surface results",
  async () => {
    await assert.rejects(
      () =>
        runProtectedPeakStability({
          provider: {},
          snapshots: [
            {
              blockTag: 100,
              gasPriceWei: "200",
              premiumBps: 5
            }
          ],
          amounts: [
            {
              display: "0.105",
              amount: "105"
            }
          ],
          runSurfaceFn:
            async () => ({
              snapshot: {
                blockTag: 100
              }
            })
        }),
      /surface must include snapshot and rows/
    );
  }
);

test(
  "runs every snapshot through one fixed protected amount surface",
  async () => {
    const provider = {};
    const calls = [];

    const amounts = [
      {
        display: "0.105",
        amount: "105"
      },
      {
        display: "0.106",
        amount: "106"
      },
      {
        display: "0.107",
        amount: "107"
      }
    ];

    const snapshots = [
      {
        blockTag: 100,
        gasPriceWei: "200",
        premiumBps: 5
      },
      {
        blockTag: 101,
        gasPriceWei: "300",
        premiumBps: 6
      }
    ];

    const runSurfaceFn =
      async args => {
        calls.push(args);

        const rows =
          args.amounts.map(
            row => ({
              status:
                "QUOTE_OK",
              startAmount:
                row.amount
            })
          );

        const bestProtected =
          args.blockTag === 100
            ? rows[1]
            : rows[2];

        return {
          snapshot: {
            blockTag:
              args.blockTag,
            gasPriceWei:
              String(
                args.gasPriceWei
              ),
            premiumBps:
              args.premiumBps
          },
          rows,
          bestProtected
        };
      };

    const result =
      await runProtectedPeakStability({
        provider,
        snapshots,
        amounts,
        runSurfaceFn
      });

    assert.equal(
      calls.length,
      2
    );

    assert.deepEqual(
      calls[0],
      {
        provider,
        blockTag: 100,
        gasPriceWei: "200",
        premiumBps: 5,
        amounts
      }
    );

    assert.deepEqual(
      calls[1],
      {
        provider,
        blockTag: 101,
        gasPriceWei: "300",
        premiumBps: 6,
        amounts
      }
    );

    assert.equal(
      result.snapshots[0]
        .peakPosition,
      "INTERIOR"
    );

    assert.equal(
      result.snapshots[1]
        .peakPosition,
      "UPPER_BOUNDARY"
    );

    assert.deepEqual(
      result.summary
        .distinctBestAmounts,
      [
        "106",
        "107"
      ]
    );

    assert.equal(
      result.summary
        .snapshotCount,
      2
    );

    assert.equal(
      result.summary
        .snapshotsWithPeak,
      2
    );
  }
);

test(
  "records deterministic sequential surface durations",
  async () => {
    const provider = {};

    const snapshots = [
      {
        blockTag: 100,
        gasPriceWei: "200",
        premiumBps: 5
      },
      {
        blockTag: 101,
        gasPriceWei: "300",
        premiumBps: 5
      }
    ];

    const amounts = [
      {
        display: "0.105",
        amount: "105"
      }
    ];

    const times = [
      1000,
      1250,
      2000,
      2600
    ];

    let timeIndex = 0;

    const result =
      await runProtectedPeakStability({
        provider,
        snapshots,
        amounts,
        nowFn:
          () =>
            times[
              timeIndex++
            ],
        runSurfaceFn:
          async args => {
            const rows = [
              {
                status:
                  "QUOTE_OK",
                startAmount:
                  args.amounts[0]
                    .amount
              }
            ];

            return {
              snapshot: {
                blockTag:
                  args.blockTag
              },
              rows,
              bestProtected:
                rows[0]
            };
          }
      });

    assert.equal(
      timeIndex,
      4
    );

    assert.equal(
      result.snapshots[0]
        .durationMs,
      250
    );

    assert.equal(
      result.snapshots[1]
        .durationMs,
      600
    );

    assert.equal(
      result.summary
        .totalSurfaceDurationMs,
      850
    );
  }
);

test(
  "rejects invalid timing dependency before surface work",
  async () => {
    let calls = 0;

    await assert.rejects(
      runProtectedPeakStability({
        provider: {},
        snapshots: [
          {
            blockTag: 100,
            gasPriceWei: "200",
            premiumBps: 5
          }
        ],
        amounts: [
          {
            display: "0.105",
            amount: "105"
          }
        ],
        nowFn: null,
        runSurfaceFn:
          async () => {
            calls += 1;
            return {};
          }
      }),
      /nowFn must be a function/
    );

    assert.equal(
      calls,
      0
    );
  }
);

test(
  "rejects invalid measured surface duration",
  async () => {
    const times = [
      2000,
      1999
    ];

    let timeIndex = 0;

    await assert.rejects(
      runProtectedPeakStability({
        provider: {},
        snapshots: [
          {
            blockTag: 100,
            gasPriceWei: "200",
            premiumBps: 5
          }
        ],
        amounts: [
          {
            display: "0.105",
            amount: "105"
          }
        ],
        nowFn:
          () =>
            times[
              timeIndex++
            ],
        runSurfaceFn:
          async args => {
            const rows = [
              {
                status:
                  "QUOTE_OK",
                startAmount:
                  args.amounts[0]
                    .amount
              }
            ];

            return {
              snapshot: {
                blockTag:
                  args.blockTag
              },
              rows,
              bestProtected:
                rows[0]
            };
          }
      }),
      /surface duration must be a non-negative safe integer/
    );
  }
);
