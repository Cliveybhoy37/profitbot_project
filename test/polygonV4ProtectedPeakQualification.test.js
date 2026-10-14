"use strict";

const assert =
  require("node:assert/strict");

const test =
  require("node:test");

const { ethers } =
  require("ethers");

const {
  qualifyProtectedPeakHandoff
} = require(
  "../scripts/utils/polygonV4ProtectedPeakQualification"
);

const WPOL =
  "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";

const DAI =
  "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";

const APEPE =
  "0xA3f751662e282E83EC3cBc387d225Ca56dD63D3A";

const START =
  "125000000000000000";

const ENTRY_OUT =
  "14481764747850506";

const V4_OUT =
  "12592522662788687883109";

const FINAL_OUT =
  "141808483715718886";

const BLOCK_1 = 94709814;
const BLOCK_2 = 94709817;

function observation(blockTag) {
  return {
    status: "QUOTE_OK",
    blockTag,
    startAmount: START,
    amounts: {
      start: START
    },
    entry: {
      status: "QUOTE_OK",
      venue: "UNISWAP_V3",
      fee: 500,
      pool:
        "0x1111111111111111111111111111111111111111",
      amountOut: ENTRY_OUT
    },
    v4: {
      status: "QUOTE_OK",
      venue: "UNISWAP_V4",
      zeroForOne: true,
      poolKey: {
        currency0: DAI,
        currency1: APEPE,
        fee: 10000,
        tickSpacing: 100,
        hooks:
          ethers.constants.AddressZero
      },
      amountOut: V4_OUT
    },
    exit: {
      status: "QUOTE_OK",
      venue: "UNISWAP_V3",
      fee: 100,
      pool:
        "0x2222222222222222222222222222222222222222",
      amountOut: FINAL_OUT
    }
  };
}

function stabilityRow(
  blockTag
) {
  return {
    snapshot: {
      blockTag,
      gasPriceWei:
        ethers.utils
          .parseUnits(
            "10",
            "gwei"
          )
          .toString(),
      premiumBps: 5
    },
    quoteOkCount: 3,
    rowCount: 3,
    durationMs: 10,
    bestProtected:
      observation(blockTag),
    peakPosition:
      "INTERIOR"
  };
}

function operational() {
  const rows = [
    stabilityRow(BLOCK_1),
    stabilityRow(BLOCK_2)
  ];

  return {
    complete: true,
    maxCycles: 1,
    completedCycles: 1,
    waitMs: 0,
    cycles: [
      {
        cycle: 1,
        result: {
          acquisition: {
            complete: true,
            snapshots: [
              rows[0].snapshot,
              rows[1].snapshot
            ]
          },
          stability: {
            snapshots: rows,
            summary: {
              snapshotCount: 2,
              snapshotsWithPeak: 2,
              distinctBestAmounts: [
                START
              ],
              interiorPeakCount: 2,
              lowerBoundaryPeakCount: 0,
              upperBoundaryPeakCount: 0
            }
          }
        }
      }
    ]
  };
}

function args(overrides = {}) {
  return {
    operationalResult:
      operational(),
    policySnapshot: {
      currentBlock: BLOCK_2,
      gasPriceWei:
        ethers.BigNumber.from(
          "10000000000"
        ),
      premiumBps: 5
    },
    startToken: WPOL,
    entryToken: DAI,
    exitToken: APEPE,
    slippageBps: 50,
    maxSlippageBps: 100,
    maxAgeBlocks: 3,
    estimatedGas:
      ethers.BigNumber.from(
        "700000"
      ),
    safetyReserveWei:
      ethers.utils.parseEther(
        "0.001"
      ),
    minimumNetProfitWei:
      ethers.utils.parseEther(
        "0.005"
      ),
    ...overrides
  };
}

test(
  "qualifies exact preserved protected-peak evidence without reconstruction",
  () => {
    const input =
      args();

    const expected =
      input.operationalResult
        .cycles[0]
        .result.stability
        .snapshots[1]
        .bestProtected;

    const result =
      qualifyProtectedPeakHandoff(
        input
      );

    assert.equal(
      result.qualified,
      true
    );

    assert.equal(
      result.stage,
      "QUALIFIED"
    );

    assert.strictEqual(
      result.handoff.observation,
      expected
    );

    assert.strictEqual(
      result.observation,
      expected
    );

    assert.equal(
      result.candidate.blockTag,
      BLOCK_2
    );

    assert.equal(
      result.preflight.ageBlocks,
      0
    );

    assert.equal(
      result.preflight
        .worstCaseNetProfit
        .gte(
          result.preflight
            .minimumNetProfit
        ),
      true
    );
  }
);

test(
  "uses qualification-time currentBlock for freshness",
  () => {
    const result =
      qualifyProtectedPeakHandoff(
        args({
          policySnapshot: {
            currentBlock:
              BLOCK_2 + 4,
            gasPriceWei:
              ethers.BigNumber.from(
                "10000000000"
              ),
            premiumBps: 5
          }
        })
      );

    assert.equal(
      result.qualified,
      false
    );

    assert.equal(
      result.stage,
      "PREFLIGHT"
    );

    assert.match(
      result.reason,
      /stale/
    );

    assert.equal(
      result.currentBlock,
      BLOCK_2 + 4
    );
  }
);

test(
  "uses qualification-time gas price rather than snapshot gas price",
  () => {
    const result =
      qualifyProtectedPeakHandoff(
        args({
          policySnapshot: {
            currentBlock:
              BLOCK_2,
            gasPriceWei:
              ethers.utils.parseUnits(
                "1000",
                "gwei"
              ),
            premiumBps: 5
          }
        })
      );

    assert.equal(
      result.qualified,
      false
    );

    assert.equal(
      result.stage,
      "PREFLIGHT"
    );

    assert.match(
      result.reason,
      /profit|cost/i
    );
  }
);

test(
  "rejects invalid explicit policy snapshot before qualification",
  () => {
    assert.throws(
      () =>
        qualifyProtectedPeakHandoff(
          args({
            policySnapshot: {
              currentBlock:
                BLOCK_2,
              gasPriceWei:
                ethers.BigNumber.from(
                  0
                ),
              premiumBps: 5
            }
          })
        ),
      /positive gasPriceWei/
    );
  }
);

test(
  "does not fall back when latest protected evidence is degraded",
  () => {
    const input =
      args();

    input.operationalResult
      .cycles[0]
      .result.stability
      .snapshots[1]
      .bestProtected.status =
      "RPC_FAILURE";

    assert.throws(
      () =>
        qualifyProtectedPeakHandoff(
          input
        ),
      /requires QUOTE_OK evidence/
    );
  }
);
