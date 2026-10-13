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

const WPOL =
  "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";

const DAI =
  "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";

const APEPE =
  "0xA3f751662e282E83EC3cBc387d225Ca56dD63D3A";

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
        tokenIn: WPOL,
        tokenOut: DAI,
        amountOut:
          ethers.BigNumber.from(
            "14481764747850506"
          )
      },
      {
        tokenIn: DAI,
        tokenOut: APEPE,
        amountOut:
          ethers.BigNumber.from(
            "12592522662788687883109"
          )
      },
      {
        tokenIn: APEPE,
        tokenOut: WPOL,
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

test("rejects non-WPOL-denominated flashloan route", () => {
  const observed = candidate();
  observed.legs[0].tokenIn = DAI;
  observed.legs[2].tokenOut = DAI;

  assert.throws(
    () => preflightObservedV4Candidate(
      input({ candidate: observed })
    ),
    /WPOL-denominated closed route/
  );
});

test("rejects missing candidate token address", () => {
  const observed = candidate();
  delete observed.legs[0].tokenIn;

  assert.throws(
    () => preflightObservedV4Candidate(
      input({ candidate: observed })
    ),
    /Candidate leg 0 tokenIn must be a valid token address/
  );
});

test("rejects broken candidate token continuity", () => {
  const observed = candidate();
  observed.legs[1].tokenIn = WPOL;

  assert.throws(
    () => preflightObservedV4Candidate(
      input({ candidate: observed })
    ),
    /Candidate route token continuity mismatch/
  );
});

test("rejects missing execution token address", () => {
  const params = input();
  delete params.executionLegs[0].tokenIn;

  assert.throws(
    () => preflightObservedV4Candidate(params),
    /Execution leg 0 tokenIn must be a valid token address/
  );
});

test("rejects execution token mismatch", () => {
  const params = input();
  params.executionLegs[1].tokenOut = WPOL;

  assert.throws(
    () => preflightObservedV4Candidate(params),
    /Execution leg 1 token mismatch with candidate/
  );
});

test(
  "rounds non-divisible flashloan premiums upward",
  () => {
    const adjustedCandidate = candidate();
    adjustedCandidate.amountIn = START.add(1);

    const result = preflightObservedV4Candidate(
      input({
        candidate: adjustedCandidate,
        requestedAmount: START.add(1),
        premiumBps: 7
      })
    );

    const numerator = START.add(1).mul(7);
    const expected = numerator
      .add(9999)
      .div(10000);

    assert.equal(
      result.expectedPremium.toString(),
      expected.toString()
    );
  }
);
