"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const { ethers } =
  require("ethers");

const {
  selectProtectedPeakHandoff
} = require(
  "../scripts/utils/polygonV4ProtectedPeakHandoff"
);

const {
  buildObservedV4Candidate
} = require(
  "../scripts/utils/polygonV4ObservedCandidate"
);

const {
  buildV4ExecutionLegs
} = require(
  "../scripts/utils/polygonV4ExecutionRoute"
);

const {
  preflightObservedV4Candidate
} = require(
  "../scripts/utils/polygonV4CandidatePreflight"
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

const POOL_KEY = {
  currency0: DAI,
  currency1: APEPE,
  fee: 10000,
  tickSpacing: 100,
  hooks:
    ethers.constants.AddressZero
};

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
      amountOut: ENTRY_OUT
    },
    v4: {
      status: "QUOTE_OK",
      zeroForOne: true,
      poolKey: POOL_KEY,
      amountOut: V4_OUT
    },
    exit: {
      status: "QUOTE_OK",
      venue: "UNISWAP_V3",
      fee: 100,
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
    stabilityRow(94709814),
    stabilityRow(94709817)
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

test(
  "composes exact protected-peak evidence through candidate execution legs and preflight",
  () => {
    const input =
      operational();

    const expectedObservation =
      input.cycles[0]
        .result.stability
        .snapshots[1]
        .bestProtected;

    const handoff =
      selectProtectedPeakHandoff(
        input
      );

    assert.strictEqual(
      handoff.observation,
      expectedObservation,
      "handoff reconstructed observation evidence"
    );

    assert.equal(
      handoff.snapshot.blockTag,
      expectedObservation.blockTag,
      "handoff snapshot lost block provenance"
    );

    const candidate =
      buildObservedV4Candidate({
        observation:
          handoff.observation,
        startToken:
          WPOL,
        entryToken:
          DAI,
        exitToken:
          APEPE
      });

    assert.equal(
      candidate.blockTag,
      expectedObservation.blockTag
    );

    assert.equal(
      candidate.amountIn.toString(),
      START
    );

    assert.equal(
      candidate.legs[0].fee,
      expectedObservation
        .entry.fee
    );

    assert.equal(
      candidate.legs[1]
        .poolKey.fee,
      expectedObservation
        .v4.poolKey.fee
    );

    assert.equal(
      candidate.legs[2].fee,
      expectedObservation
        .exit.fee
    );

    const executionLegs =
      buildV4ExecutionLegs(
        candidate.legs,
        50
      );

    const preflight =
      preflightObservedV4Candidate({
        candidate,
        executionLegs,
        requestedAmount:
          ethers.BigNumber.from(
            START
          ),
        currentBlock:
          expectedObservation
            .blockTag,
        maxAgeBlocks: 3,
        slippageBps: 50,
        maxSlippageBps: 100,
        premiumBps:
          handoff.snapshot
            .premiumBps,
        estimatedGas:
          ethers.BigNumber.from(
            "650723"
          ),
        gasPriceWei:
          ethers.BigNumber.from(
            handoff.snapshot
              .gasPriceWei
          ),
        safetyReserveWei:
          ethers.utils.parseEther(
            "0.001"
          ),
        minimumNetProfitWei:
          ethers.utils.parseEther(
            "0.005"
          )
      });

    assert.equal(
      preflight.observationBlock,
      expectedObservation.blockTag
    );

    assert.equal(
      preflight.ageBlocks,
      0
    );

    assert.equal(
      preflight.expectedPremium
        .toString(),
      ethers.BigNumber.from(
        START
      )
        .mul(
          handoff.snapshot
            .premiumBps
        )
        .div(10000)
        .toString()
    );

    assert.equal(
      preflight.protectedFinalOutput
        .toString(),
      ethers.BigNumber.from(
        FINAL_OUT
      )
        .mul(9950)
        .div(10000)
        .toString()
    );

    assert(
      preflight.worstCaseNetProfit
        .gte(
          preflight
            .minimumNetProfit
        ),
      "protected handoff failed existing minimum-profit policy"
    );
  }
);

test(
  "latest degraded protected evidence cannot fall back to older executable evidence",
  () => {
    const input =
      operational();

    const olderObservation =
      input.cycles[0]
        .result.stability
        .snapshots[0]
        .bestProtected;

    input.cycles[0]
      .result.stability
      .snapshots[1]
      .bestProtected.status =
        "RPC_FAILURE";

    assert.equal(
      olderObservation.status,
      "QUOTE_OK"
    );

    assert.throws(
      () =>
        selectProtectedPeakHandoff(
          input
        ),
      /requires QUOTE_OK evidence/
    );
  }
);
