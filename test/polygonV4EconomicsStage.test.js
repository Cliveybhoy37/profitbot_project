"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  QUOTE_OK,
  NO_ROUTE,
  RPC_FAILURE
} = require(
  "../scripts/utils/polygonV4OuterQuoteObserver"
);

const {
  ZERO_FOR_ONE,
  ONE_FOR_ZERO,
  orientationTokens,
  buildEconomicsJobs
} = require(
  "../scripts/utils/polygonV4EconomicsStage"
);

const POOL_ID =
  "0x429e60d564e16b246d82f5cc44e7db043f870b3d6407f7362c509f1bd1a8f3e0";

const WPOL =
  "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270";

const WETH =
  "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619";

const USDT0 =
  "0xc2132d05d31c914a87c6611c10748aeb04b58e8f";

const ZERO =
  "0x0000000000000000000000000000000000000000";

const POOL_KEY = {
  currency0: WETH,
  currency1: USDT0,
  fee: 75,
  tickSpacing: 1,
  hooks: ZERO
};

function positiveDirection(
  venues
) {
  return {
    observations:
      venues.map(
        venue => ({
          venue,
          status:
            QUOTE_OK,
          amountOut: "1",
          fee: null,
          pool: null
        })
      ),
    summary: {
      status:
        QUOTE_OK,
      connected: true,
      venues: [...venues]
    }
  };
}

function evidence({
  candidate,
  entryVenues,
  exitVenues,
  conclusive = true
}) {
  return {
    core: {
      symbol: "WPOL",
      address: WPOL,
      decimals: 18
    },
    candidate: {
      address: candidate,
      decimals: 18
    },
    blockTag: 94709817,
    entry:
      positiveDirection(
        entryVenues
      ),
    exit:
      positiveDirection(
        exitVenues
      ),
    hasEntry:
      entryVenues.length > 0,
    hasExit:
      exitVenues.length > 0,
    conclusive
  };
}

function structuralFixture({
  direction =
    ONE_FOR_ZERO,
  start = WPOL,
  wethEvidence = null,
  usdtEvidence = null
} = {}) {
  const outerEvidence = {};

  if (wethEvidence) {
    outerEvidence[
      `${WPOL}:${WETH}`
    ] = wethEvidence;
  }

  if (usdtEvidence) {
    outerEvidence[
      `${WPOL}:${USDT0}`
    ] = usdtEvidence;
  }

  return {
    classifications: {
      pools: [
        {
          poolId: POOL_ID,
          category:
            "CORE_EXOTIC",
          quarantined: false,
          poolKey:
            POOL_KEY
        }
      ]
    },

    outerEvidence,

    results: {
      pools: [
        {
          poolId: POOL_ID,
          category:
            "CORE_EXOTIC",
          quarantined: false,
          orientations: [
            {
              direction,
              start: {
                symbol:
                  start === WPOL
                    ? "WPOL"
                    : "WETH",
                address: start,
                decimals: 18
              }
            }
          ]
        }
      ]
    }
  };
}

test(
  "direction maps exactly to V4 input and output currencies",
  () => {
    assert.deepEqual(
      orientationTokens({
        poolKey:
          POOL_KEY,
        direction:
          ZERO_FOR_ONE
      }),
      {
        zeroForOne: true,
        entryToken: WETH,
        exitToken: USDT0
      }
    );

    assert.deepEqual(
      orientationTokens({
        poolKey:
          POOL_KEY,
        direction:
          ONE_FOR_ZERO
      }),
      {
        zeroForOne: false,
        entryToken: USDT0,
        exitToken: WETH
      }
    );
  }
);

test(
  "control ONE_FOR_ZERO orientation builds all 3x3 venue jobs",
  () => {
    const venues = [
      "QUICKSWAP_V2",
      "SUSHISWAP_V2",
      "UNISWAP_V3"
    ];

    const jobs =
      buildEconomicsJobs({
        structural:
          structuralFixture({
            direction:
              ONE_FOR_ZERO,

            wethEvidence:
              evidence({
                candidate: WETH,
                entryVenues:
                  venues,
                exitVenues:
                  venues
              }),

            usdtEvidence:
              evidence({
                candidate: USDT0,
                entryVenues:
                  venues,
                exitVenues:
                  venues
              })
          })
      });

    assert.equal(
      jobs.length,
      9
    );

    for (const job of jobs) {
      assert.equal(
        job.poolId,
        POOL_ID
      );

      assert.equal(
        job.direction,
        ONE_FOR_ZERO
      );

      assert.equal(
        job.zeroForOne,
        false
      );

      assert.equal(
        job.start.address,
        WPOL
      );

      assert.equal(
        job.entryToken,
        USDT0
      );

      assert.equal(
        job.exitToken,
        WETH
      );

      assert.deepEqual(
        job.poolKey,
        POOL_KEY
      );
    }

    assert.deepEqual(
      jobs.map(
        job => [
          job.entryVenue,
          job.exitVenue
        ]
      ),
      [
        [
          "QUICKSWAP_V2",
          "QUICKSWAP_V2"
        ],
        [
          "QUICKSWAP_V2",
          "SUSHISWAP_V2"
        ],
        [
          "QUICKSWAP_V2",
          "UNISWAP_V3"
        ],
        [
          "SUSHISWAP_V2",
          "QUICKSWAP_V2"
        ],
        [
          "SUSHISWAP_V2",
          "SUSHISWAP_V2"
        ],
        [
          "SUSHISWAP_V2",
          "UNISWAP_V3"
        ],
        [
          "UNISWAP_V3",
          "QUICKSWAP_V2"
        ],
        [
          "UNISWAP_V3",
          "SUSHISWAP_V2"
        ],
        [
          "UNISWAP_V3",
          "UNISWAP_V3"
        ]
      ]
    );
  }
);

test(
  "ZERO_FOR_ONE uses WETH entry and USDT0 exit evidence",
  () => {
    const jobs =
      buildEconomicsJobs({
        structural:
          structuralFixture({
            direction:
              ZERO_FOR_ONE,

            wethEvidence:
              evidence({
                candidate: WETH,
                entryVenues: [
                  "UNISWAP_V3"
                ],
                exitVenues: []
              }),

            usdtEvidence:
              evidence({
                candidate: USDT0,
                entryVenues: [],
                exitVenues: [
                  "QUICKSWAP_V2"
                ]
              })
          })
      });

    assert.equal(
      jobs.length,
      1
    );

    assert.equal(
      jobs[0].entryToken,
      WETH
    );

    assert.equal(
      jobs[0].exitToken,
      USDT0
    );

    assert.equal(
      jobs[0].entryVenue,
      "UNISWAP_V3"
    );

    assert.equal(
      jobs[0].exitVenue,
      "QUICKSWAP_V2"
    );

    assert.equal(
      jobs[0].zeroForOne,
      true
    );
  }
);

test(
  "ONE_FOR_ZERO uses USDT0 entry and WETH exit evidence",
  () => {
    const jobs =
      buildEconomicsJobs({
        structural:
          structuralFixture({
            direction:
              ONE_FOR_ZERO,

            wethEvidence:
              evidence({
                candidate: WETH,
                entryVenues: [],
                exitVenues: [
                  "SUSHISWAP_V2"
                ]
              }),

            usdtEvidence:
              evidence({
                candidate: USDT0,
                entryVenues: [
                  "QUICKSWAP_V2"
                ],
                exitVenues: []
              })
          })
      });

    assert.equal(
      jobs.length,
      1
    );

    assert.equal(
      jobs[0].entryVenue,
      "QUICKSWAP_V2"
    );

    assert.equal(
      jobs[0].exitVenue,
      "SUSHISWAP_V2"
    );
  }
);

test(
  "structural one-token amounts are not copied into economics jobs",
  () => {
    const entry =
      evidence({
        candidate: USDT0,
        entryVenues: [
          "UNISWAP_V3"
        ],
        exitVenues: []
      });

    entry.entry
      .observations[0]
      .amountOut =
        "999999999999999999";

    const exit =
      evidence({
        candidate: WETH,
        entryVenues: [],
        exitVenues: [
          "UNISWAP_V3"
        ]
      });

    exit.exit
      .observations[0]
      .amountOut =
        "123456789";

    const jobs =
      buildEconomicsJobs({
        structural:
          structuralFixture({
            direction:
              ONE_FOR_ZERO,
            wethEvidence:
              exit,
            usdtEvidence:
              entry
          })
      });

    assert.equal(
      jobs.length,
      1
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        jobs[0],
        "amountOut"
      ),
      false
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        jobs[0],
        "startAmount"
      ),
      false
    );
  }
);

test(
  "RPC uncertainty cannot create economics jobs",
  () => {
    const uncertain =
      evidence({
        candidate: USDT0,
        entryVenues: [
          "UNISWAP_V3"
        ],
        exitVenues: []
      });

    uncertain.conclusive =
      false;

    uncertain.entry = {
      observations: [
        {
          venue:
            "UNISWAP_V3",
          status:
            RPC_FAILURE,
          errorCode:
            "SERVER_ERROR"
        }
      ],
      summary: {
        status:
          RPC_FAILURE,
        connected: false,
        venues: []
      }
    };

    const jobs =
      buildEconomicsJobs({
        structural:
          structuralFixture({
            direction:
              ONE_FOR_ZERO,

            usdtEvidence:
              uncertain,

            wethEvidence:
              evidence({
                candidate: WETH,
                entryVenues: [],
                exitVenues: [
                  "UNISWAP_V3"
                ]
              })
          })
      });

    assert.equal(
      jobs.length,
      0
    );
  }
);

test(
  "NO_ROUTE observations do not become venue jobs",
  () => {
    const usdt =
      evidence({
        candidate: USDT0,
        entryVenues: [
          "UNISWAP_V3"
        ],
        exitVenues: []
      });

    usdt.entry.observations.push({
      venue:
        "SUSHISWAP_V2",
      status:
        NO_ROUTE,
      errorCode:
        "CALL_EXCEPTION"
    });

    const jobs =
      buildEconomicsJobs({
        structural:
          structuralFixture({
            direction:
              ONE_FOR_ZERO,

            usdtEvidence:
              usdt,

            wethEvidence:
              evidence({
                candidate: WETH,
                entryVenues: [],
                exitVenues: [
                  "QUICKSWAP_V2"
                ]
              })
          })
      });

    assert.equal(
      jobs.length,
      1
    );

    assert.equal(
      jobs[0].entryVenue,
      "UNISWAP_V3"
    );

    assert.equal(
      jobs[0].exitVenue,
      "QUICKSWAP_V2"
    );
  }
);

test(
  "identity external leg cannot become an economics job",
  () => {
    const structural =
      structuralFixture({
        direction:
          ZERO_FOR_ONE,
        start: WETH,
        wethEvidence:
          evidence({
            candidate: WETH,
            entryVenues: [
              "UNISWAP_V3"
            ],
            exitVenues: [
              "UNISWAP_V3"
            ]
          }),
        usdtEvidence:
          evidence({
            candidate: USDT0,
            entryVenues: [
              "UNISWAP_V3"
            ],
            exitVenues: [
              "UNISWAP_V3"
            ]
          })
      });

    assert.deepEqual(
      buildEconomicsJobs({
        structural
      }),
      []
    );
  }
);

test(
  "classification PoolId mismatch cannot silently build jobs",
  () => {
    const structural =
      structuralFixture({
        direction:
          ONE_FOR_ZERO,
        usdtEvidence:
          evidence({
            candidate: USDT0,
            entryVenues: [
              "UNISWAP_V3"
            ],
            exitVenues: []
          }),
        wethEvidence:
          evidence({
            candidate: WETH,
            entryVenues: [],
            exitVenues: [
              "UNISWAP_V3"
            ]
          })
      });

    structural
      .classifications
      .pools[0]
      .poolId =
        "0x1111111111111111111111111111111111111111111111111111111111111111";

    assert.throws(
      () =>
        buildEconomicsJobs({
          structural
        }),
      /classification/
    );
  }
);
