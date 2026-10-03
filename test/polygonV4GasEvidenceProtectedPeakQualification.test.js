"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  WPOL,
  DAI,
  APEPE
} = require(
  "../scripts/research/runPolygonV4LiveQualification"
);

const MODULE =
  "../scripts/utils/polygonV4GasEvidenceProtectedPeakQualification";

function address(byte) {
  return ethers.utils.getAddress(
    "0x" + byte.repeat(40)
  );
}

function leg({
  venue,
  tokenIn,
  tokenOut,
  minAmountOut,
  venueData = "0x"
}) {
  return {
    venue,
    tokenIn,
    tokenOut,
    minAmountOut:
      ethers.BigNumber.from(minAmountOut),
    venueData
  };
}

function harness() {
  const startToken = address("1");
  const entryToken = address("2");
  const exitToken = address("3");

  const candidate = {
    blockTag: 94709817,
    amountIn:
      ethers.BigNumber.from(
        "125000000000000000"
      )
  };

  const executionLegs = [
    leg({
      venue: 2,
      tokenIn: startToken,
      tokenOut: entryToken,
      minAmountOut: "100"
    }),
    leg({
      venue: 4,
      tokenIn: entryToken,
      tokenOut: exitToken,
      minAmountOut: "200",
      venueData:
        ethers.utils.defaultAbiCoder.encode(
          ["uint24"],
          [10000]
        )
    }),
    leg({
      venue: 2,
      tokenIn: exitToken,
      tokenOut: startToken,
      minAmountOut: "300"
    })
  ];

  const executionPlan =
    ethers.utils.defaultAbiCoder.encode(
      ["uint256"],
      [123456]
    );

  const gasEvidence = {
    observationBlock:
      candidate.blockTag,
    loanToken:
      startToken,
    loanAmount:
      candidate.amountIn,
    executionLegs,
    gasUnits:
      ethers.BigNumber.from("652106"),
    executionPlanHash:
      ethers.utils.keccak256(
        executionPlan
      ),
    executorContext: {
      executorCodeHash:
        ethers.utils.keccak256(
          "0x60006000"
        ),
      v3Router: address("4"),
      v4Router: address("5"),
      permit2: address("6"),
      aaveProvider: address("7"),
      aavePool: address("8")
    },
    provenance: {
      method: "FORK_RECEIPT",
      measurementBlock:
        candidate.blockTag,
      source:
        "controlled historical Polygon fork receipt"
    }
  };

  const policySnapshot = {
    currentBlock:
      candidate.blockTag,
    gasPriceWei:
      ethers.BigNumber.from(
        "278281592114"
      ),
    premiumBps: 5
  };

  const calls = {
    select: 0,
    candidate: 0,
    legs: 0,
    validate: 0,
    acquire: 0,
    qualify: 0
  };

  const handoff = {
    observation: {
      blockTag:
        candidate.blockTag
    }
  };

  return {
    startToken,
    entryToken,
    exitToken,
    candidate,
    executionLegs,
    executionPlan,
    gasEvidence,
    policySnapshot,
    handoff,
    calls,

    selectProtectedPeakHandoffFn:
      () => {
        calls.select += 1;
        return handoff;
      },

    buildObservedCandidateFn:
      () => {
        calls.candidate += 1;
        return candidate;
      },

    buildV4ExecutionLegsFn:
      () => {
        calls.legs += 1;
        return executionLegs;
      },

    validateForkReceiptGasEvidenceFn:
      args => {
        calls.validate += 1;

        assert.strictEqual(
          args.candidate,
          candidate
        );

        assert.strictEqual(
          args.executionLegs,
          executionLegs
        );

        assert.strictEqual(
          args.executionPlan,
          executionPlan
        );

        assert.strictEqual(
          args.evidence,
          gasEvidence
        );

        return {
          ...gasEvidence,
          gasUnits:
            gasEvidence.gasUnits
        };
      },

    acquirePolicySnapshotFn:
      async () => {
        calls.acquire += 1;
        return policySnapshot;
      },

    qualifyProtectedPeakHandoffFn:
      args => {
        calls.qualify += 1;

        return {
          qualified: true,
          stage: "QUALIFIED",
          received: args
        };
      }
  };
}

function loadSubject() {
  return require(MODULE)
    .qualifyGasEvidenceProtectedPeakHandoff;
}


test(
  "composes real preserved handoff candidate legs and fork-receipt evidence",
  async () => {
    const {
      qualifyGasEvidenceProtectedPeakHandoff
    } = require(MODULE);

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

    const BLOCK = 94709817;

    const START =
      "125000000000000000";

    const observation = {
      status: "QUOTE_OK",
      blockTag: BLOCK,
      startAmount: START,

      amounts: {
        start: START
      },

      entry: {
        venue: "UNISWAP_V3",
        status: "QUOTE_OK",
        fee: 100,
        amountOut:
          "14481764747850506"
      },

      v4: {
        status: "QUOTE_OK",
        amountOut:
          "12592522662788687883109",
        gasEstimate: "1",
        poolKey: {
          currency0: DAI,
          currency1: APEPE,
          fee: 10000,
          tickSpacing: 100,
          hooks:
            ethers.constants.AddressZero
        },
        zeroForOne: true
      },

      exit: {
        venue: "UNISWAP_V3",
        status: "QUOTE_OK",
        fee: 100,
        amountOut:
          "141808483715718886"
      }
    };

    const row = {
      snapshot: {
        blockTag: BLOCK,
        gasPriceWei:
          "10000000000",
        premiumBps: 5
      },
      quoteOkCount: 3,
      rowCount: 3,
      durationMs: 10,
      bestProtected:
        observation,
      peakPosition:
        "INTERIOR"
    };

    const operationalResult = {
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
                row.snapshot
              ]
            },
            stability: {
              snapshots: [
                row
              ],
              summary: {
                snapshotCount: 1,
                snapshotsWithPeak: 1,
                distinctBestAmounts: [
                  START
                ],
                interiorPeakCount: 1,
                lowerBoundaryPeakCount: 0,
                upperBoundaryPeakCount: 0
              }
            }
          }
        }
      ]
    };

    const handoff =
      selectProtectedPeakHandoff(
        operationalResult
      );

    const candidate =
      buildObservedV4Candidate({
        observation:
          handoff.observation,
        startToken: WPOL,
        entryToken: DAI,
        exitToken: APEPE
      });

    const executionLegs =
      buildV4ExecutionLegs(
        candidate.legs,
        50
      );

    const executionPlan =
      ethers.utils.defaultAbiCoder.encode(
        ["uint256"],
        [123456]
      );

    const gasEvidence = {
      observationBlock:
        BLOCK,
      loanToken:
        WPOL,
      loanAmount:
        candidate.amountIn,
      executionLegs,
      gasUnits:
        ethers.BigNumber.from(
          "652106"
        ),
      executionPlanHash:
        ethers.utils.keccak256(
          executionPlan
        ),
      executorContext: {
        executorCodeHash:
          ethers.utils.keccak256(
            "0x60006000"
          ),
        v3Router:
          address("1"),
        v4Router:
          address("2"),
        permit2:
          address("3"),
        aaveProvider:
          address("4"),
        aavePool:
          address("5")
      },
      provenance: {
        method:
          "FORK_RECEIPT",
        measurementBlock:
          BLOCK,
        source:
          "controlled historical Polygon fork receipt"
      }
    };

    const result =
      await qualifyGasEvidenceProtectedPeakHandoff({
        provider: {},
        operationalResult,
        startToken: WPOL,
        entryToken: DAI,
        exitToken: APEPE,
        slippageBps: 50,
        maxSlippageBps: 100,
        maxAgeBlocks: 3,
        executionPlan,
        gasEvidence,
        safetyReserveWei:
          ethers.utils.parseEther(
            "0.001"
          ),
        minimumNetProfitWei:
          ethers.utils.parseEther(
            "0.005"
          ),
        acquirePolicySnapshotFn:
          async () => ({
            currentBlock: BLOCK,
            gasPriceWei:
              ethers.BigNumber.from(
                "10000000000"
              ),
            premiumBps: 5
          })
      });

    assert.equal(
      result.qualified,
      true
    );

    assert.equal(
      result.stage,
      "QUALIFIED"
    );

    assert.equal(
      result.candidate.blockTag,
      BLOCK
    );

    assert.equal(
      result.candidate.amountIn
        .toString(),
      START
    );

    assert.equal(
      result.executionLegs.length,
      3
    );

    const expectedGasCost =
      gasEvidence.gasUnits.mul(
        ethers.BigNumber.from(
          "10000000000"
        )
      );

    assert.equal(
      result.preflight
        .estimatedGasCost
        .toString(),
      expectedGasCost.toString()
    );

    assert.equal(
      result.preflight
        .estimatedGasCost
        .toString(),
      "6521060000000000"
    );
  }
);


test(
  "real validator rejects mismatched execution plan before policy acquisition",
  async () => {
    const h = harness();
    const subject = loadSubject();

    let acquireCalls = 0;
    let qualifyCalls = 0;

    const differentPlan =
      ethers.utils.defaultAbiCoder.encode(
        ["uint256"],
        [654321]
      );

    await assert.rejects(
      subject({
        provider: {},
        operationalResult: {},
        startToken: h.startToken,
        entryToken: h.entryToken,
        exitToken: h.exitToken,
        slippageBps: 50,
        maxSlippageBps: 50,
        maxAgeBlocks: 2,
        executionPlan:
          differentPlan,
        gasEvidence:
          h.gasEvidence,
        safetyReserveWei:
          ethers.utils.parseEther(
            "0.001"
          ),
        minimumNetProfitWei:
          ethers.utils.parseEther(
            "0.005"
          ),
        selectProtectedPeakHandoffFn:
          h.selectProtectedPeakHandoffFn,
        buildObservedCandidateFn:
          h.buildObservedCandidateFn,
        buildV4ExecutionLegsFn:
          h.buildV4ExecutionLegsFn,
        acquirePolicySnapshotFn:
          async () => {
            acquireCalls += 1;
            return h.policySnapshot;
          },
        qualifyProtectedPeakHandoffFn:
          args => {
            qualifyCalls += 1;
            return args;
          }
      }),
      /execution plan mismatch/i
    );

    assert.equal(
      acquireCalls,
      0
    );

    assert.equal(
      qualifyCalls,
      0
    );
  }
);

test(
  "real validator rejects mismatched observation block before policy acquisition",
  async () => {
    const h = harness();
    const subject = loadSubject();

    let acquireCalls = 0;
    let qualifyCalls = 0;

    const mismatchedEvidence = {
      ...h.gasEvidence,
      observationBlock:
        h.candidate.blockTag - 1
    };

    await assert.rejects(
      subject({
        provider: {},
        operationalResult: {},
        startToken: h.startToken,
        entryToken: h.entryToken,
        exitToken: h.exitToken,
        slippageBps: 50,
        maxSlippageBps: 50,
        maxAgeBlocks: 2,
        executionPlan:
          h.executionPlan,
        gasEvidence:
          mismatchedEvidence,
        safetyReserveWei:
          ethers.utils.parseEther(
            "0.001"
          ),
        minimumNetProfitWei:
          ethers.utils.parseEther(
            "0.005"
          ),
        selectProtectedPeakHandoffFn:
          h.selectProtectedPeakHandoffFn,
        buildObservedCandidateFn:
          h.buildObservedCandidateFn,
        buildV4ExecutionLegsFn:
          h.buildV4ExecutionLegsFn,
        acquirePolicySnapshotFn:
          async () => {
            acquireCalls += 1;
            return h.policySnapshot;
          },
        qualifyProtectedPeakHandoffFn:
          args => {
            qualifyCalls += 1;
            return args;
          }
      }),
      /observation block/i
    );

    assert.equal(
      acquireCalls,
      0
    );

    assert.equal(
      qualifyCalls,
      0
    );
  }
);

test(
  "binds validated exact fork-receipt gas units into existing qualification",
  async () => {
    const h = harness();
    const subject = loadSubject();

    const operationalResult = {
      marker: "protected-operational-result"
    };

    const provider = {
      marker: "provider"
    };

    const result =
      await subject({
        provider,
        operationalResult,
        startToken: h.startToken,
        entryToken: h.entryToken,
        exitToken: h.exitToken,
        slippageBps: 50,
        maxSlippageBps: 50,
        maxAgeBlocks: 2,
        executionPlan:
          h.executionPlan,
        gasEvidence:
          h.gasEvidence,
        safetyReserveWei:
          ethers.utils.parseEther(
            "0.001"
          ),
        minimumNetProfitWei:
          ethers.utils.parseEther(
            "0.005"
          ),
        selectProtectedPeakHandoffFn:
          h.selectProtectedPeakHandoffFn,
        buildObservedCandidateFn:
          h.buildObservedCandidateFn,
        buildV4ExecutionLegsFn:
          h.buildV4ExecutionLegsFn,
        validateForkReceiptGasEvidenceFn:
          h.validateForkReceiptGasEvidenceFn,
        acquirePolicySnapshotFn:
          h.acquirePolicySnapshotFn,
        qualifyProtectedPeakHandoffFn:
          h.qualifyProtectedPeakHandoffFn
      });

    assert.equal(
      result.qualified,
      true
    );

    assert.equal(
      result.stage,
      "QUALIFIED"
    );

    assert(
      result.received.estimatedGas.eq(
        h.gasEvidence.gasUnits
      )
    );

    assert.strictEqual(
      result.received.operationalResult,
      operationalResult
    );

    assert.strictEqual(
      result.received.policySnapshot,
      h.policySnapshot
    );

    assert.equal(h.calls.select, 1);
    assert.equal(h.calls.candidate, 1);
    assert.equal(h.calls.legs, 1);
    assert.equal(h.calls.validate, 1);
    assert.equal(h.calls.acquire, 1);
    assert.equal(h.calls.qualify, 1);
  }
);

test(
  "fails closed before policy acquisition and qualification when gas evidence validation rejects",
  async () => {
    const h = harness();
    const subject = loadSubject();

    h.validateForkReceiptGasEvidenceFn =
      () => {
        h.calls.validate += 1;
        throw new Error(
          "Gas evidence execution plan mismatch"
        );
      };

    await assert.rejects(
      subject({
        provider: {},
        operationalResult: {},
        startToken: h.startToken,
        entryToken: h.entryToken,
        exitToken: h.exitToken,
        slippageBps: 50,
        maxSlippageBps: 50,
        maxAgeBlocks: 2,
        executionPlan:
          h.executionPlan,
        gasEvidence:
          h.gasEvidence,
        safetyReserveWei:
          ethers.utils.parseEther(
            "0.001"
          ),
        minimumNetProfitWei:
          ethers.utils.parseEther(
            "0.005"
          ),
        selectProtectedPeakHandoffFn:
          h.selectProtectedPeakHandoffFn,
        buildObservedCandidateFn:
          h.buildObservedCandidateFn,
        buildV4ExecutionLegsFn:
          h.buildV4ExecutionLegsFn,
        validateForkReceiptGasEvidenceFn:
          h.validateForkReceiptGasEvidenceFn,
        acquirePolicySnapshotFn:
          h.acquirePolicySnapshotFn,
        qualifyProtectedPeakHandoffFn:
          h.qualifyProtectedPeakHandoffFn
      }),
      /Gas evidence execution plan mismatch/
    );

    assert.equal(
      h.calls.acquire,
      0
    );

    assert.equal(
      h.calls.qualify,
      0
    );
  }
);

test(
  "does not accept caller-supplied estimatedGas",
  async () => {
    const h = harness();
    const subject = loadSubject();

    let received;

    h.qualifyProtectedPeakHandoffFn =
      args => {
        received = args;
        return {
          qualified: true,
          stage: "QUALIFIED"
        };
      };

    await subject({
      provider: {},
      operationalResult: {},
      startToken: h.startToken,
      entryToken: h.entryToken,
      exitToken: h.exitToken,
      slippageBps: 50,
      maxSlippageBps: 50,
      maxAgeBlocks: 2,
      executionPlan:
        h.executionPlan,
      gasEvidence:
        h.gasEvidence,
      estimatedGas:
        ethers.BigNumber.from(
          "999999"
        ),
      safetyReserveWei:
        ethers.utils.parseEther(
          "0.001"
        ),
      minimumNetProfitWei:
        ethers.utils.parseEther(
          "0.005"
        ),
      selectProtectedPeakHandoffFn:
        h.selectProtectedPeakHandoffFn,
      buildObservedCandidateFn:
        h.buildObservedCandidateFn,
      buildV4ExecutionLegsFn:
        h.buildV4ExecutionLegsFn,
      validateForkReceiptGasEvidenceFn:
        h.validateForkReceiptGasEvidenceFn,
      acquirePolicySnapshotFn:
        h.acquirePolicySnapshotFn,
      qualifyProtectedPeakHandoffFn:
        h.qualifyProtectedPeakHandoffFn
    });

    assert(
      received.estimatedGas.eq(
        h.gasEvidence.gasUnits
      )
    );

    assert.equal(
      received.estimatedGas.eq(
        "999999"
      ),
      false
    );
  }
);
