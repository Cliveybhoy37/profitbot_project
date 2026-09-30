"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const { ethers } =
  require("ethers");

const {
  preflightObservedV4Candidate
} = require(
  "../scripts/utils/polygonV4CandidatePreflight"
);

const START =
  ethers.BigNumber.from(
    "125000000000000000"
  );

const FINAL =
  ethers.BigNumber.from(
    "141808483715718886"
  );

function candidate() {
  return {
    blockTag: 94709817,
    amountIn: START,
    legs: [
      {
        amountOut:
          ethers.BigNumber.from(
            "14481764747850506"
          )
      },
      {
        amountOut:
          ethers.BigNumber.from(
            "12592522662788687883109"
          )
      },
      {
        amountOut: FINAL
      }
    ]
  };
}

function executionLegs(
  observedCandidate,
  slippageBps = 50
) {
  return observedCandidate.legs.map(
    (leg) => ({
      tokenIn: leg.tokenIn,
      tokenOut: leg.tokenOut,
      minAmountOut:
        leg.amountOut
          .mul(10000 - slippageBps)
          .div(10000)
    })
  );
}

function input(overrides = {}) {
  const observedCandidate =
    overrides.candidate ||
    candidate();

  const slippageBps =
    overrides.slippageBps === undefined
      ? 50
      : overrides.slippageBps;

  return {
    candidate:
      observedCandidate,
    executionLegs:
      executionLegs(
        observedCandidate,
        slippageBps
      ),
    requestedAmount:
      START,
    currentBlock:
      94709818,
    maxAgeBlocks:
      3,
    slippageBps:
      50,
    maxSlippageBps:
      100,
    premiumBps:
      5,
    estimatedGas:
      ethers.BigNumber.from(
        "650723"
      ),
    gasPriceWei:
      ethers.utils.parseUnits(
        "10",
        "gwei"
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
  "accepts fresh candidate with sufficient expected net profit",
  () => {
    const result =
      preflightObservedV4Candidate(
        input()
      );

    assert.equal(
      result.observationBlock,
      94709817
    );

    assert.equal(
      result.ageBlocks,
      1
    );

    assert.equal(
      result.expectedPremium
        .toString(),
      "62500000000000"
    );

    assert.equal(
      result.estimatedGasCost
        .toString(),
      "6507230000000000"
    );

    assert.equal(
      result.expectedNetProfit
        .toString(),
      "9238753715718886"
    );

    assert.equal(
      result.minimumNetProfit
        .toString(),
      ethers.utils.parseEther(
        "0.005"
      ).toString(),
      "minimum-profit policy was not preserved"
    );

    assert.equal(
      result.protectedFinalOutput
        .toString(),
      FINAL
        .mul(9950)
        .div(10000)
        .toString(),
      "protected final output mismatch"
    );

    assert.equal(
      result.worstCaseNetProfit
        .toString(),
      result.protectedFinalOutput
        .sub(START)
        .sub(result.expectedPremium)
        .sub(result.estimatedGasCost)
        .sub(result.safetyReserve)
        .toString(),
      "worst-case economics mismatch"
    );
  }
);

test(
  "rejects execution floor inconsistent with accepted slippage",
  () => {
    const observedCandidate =
      candidate();

    const legs =
      executionLegs(
        observedCandidate,
        50
      );

    legs[2].minAmountOut =
      legs[2].minAmountOut.add(1);

    assert.throws(
      () =>
        preflightObservedV4Candidate(
          input({
            candidate:
              observedCandidate,
            executionLegs:
              legs
          })
        ),
      /minAmountOut does not match accepted slippage policy/
    );
  }
);

test(
  "rejects candidate whose protected boundary falls below minimum",
  () => {
    assert.throws(
      () =>
        preflightObservedV4Candidate(
          input({
            minimumNetProfitWei:
              ethers.utils.parseEther(
                "0.009"
              )
          })
        ),
      /worst-case net profit below minimum/
    );
  }
);

test(
  "rejects flashloan amount different from observed amount",
  () => {
    assert.throws(
      () =>
        preflightObservedV4Candidate(
          input({
            requestedAmount:
              START.add(1)
          })
        ),
      /does not match requested flashloan/
    );
  }
);

test(
  "rejects stale and future candidates",
  () => {
    assert.throws(
      () =>
        preflightObservedV4Candidate(
          input({
            currentBlock:
              94709821,
            maxAgeBlocks:
              3
          })
        ),
      /observation is stale/
    );

    assert.throws(
      () =>
        preflightObservedV4Candidate(
          input({
            currentBlock:
              94709816
          })
        ),
      /block is in the future/
    );
  }
);

test(
  "rejects zero or excessive slippage policy",
  () => {
    assert.throws(
      () =>
        preflightObservedV4Candidate(
          input({
            slippageBps: 0
          })
        ),
      /slippageBps must be a positive/
    );

    assert.throws(
      () =>
        preflightObservedV4Candidate(
          input({
            slippageBps: 101,
            maxSlippageBps: 100
          })
        ),
      /slippage exceeds policy maximum/
    );
  }
);

test(
  "rejects malformed premium assumptions",
  () => {
    assert.throws(
      () =>
        preflightObservedV4Candidate(
          input({
            premiumBps: -1
          })
        ),
      /premiumBps must be a nonnegative/
    );

    assert.throws(
      () =>
        preflightObservedV4Candidate(
          input({
            premiumBps: 10000
          })
        ),
      /premiumBps must be below 10000/
    );
  }
);

test(
  "rejects negative economics after premium gas and reserve",
  () => {
    assert.throws(
      () =>
        preflightObservedV4Candidate(
          input({
            gasPriceWei:
              ethers.utils.parseUnits(
                "30",
                "gwei"
              )
          })
        ),
      /negative expected net profit/
    );
  }
);

test(
  "rejects expected profit below configured minimum",
  () => {
    assert.throws(
      () =>
        preflightObservedV4Candidate(
          input({
            minimumNetProfitWei:
              ethers.utils.parseEther(
                "0.010"
              )
          })
        ),
      /below minimum/
    );
  }
);

test(
  "rejects malformed candidate economics",
  () => {
    const broken =
      candidate();

    broken.legs =
      broken.legs.slice(0, 2);

    assert.throws(
      () =>
        preflightObservedV4Candidate(
          input({
            candidate: broken
          })
        ),
      /exactly three candidate legs/
    );

    const noOutput =
      candidate();

    noOutput.legs[2].amountOut =
      ethers.constants.Zero;

    assert.throws(
      () =>
        preflightObservedV4Candidate(
          input({
            candidate: noOutput
          })
        ),
      /Expected final output must be positive/
    );
  }
);
