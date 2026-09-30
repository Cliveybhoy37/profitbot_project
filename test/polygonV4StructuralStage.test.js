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
  pairKey,
  getStructuralProgress,
  collectUniqueExoticAddresses,
  metadataIsResolved,
  evidenceIsConclusive,
  supportedOrientationsForPool,
  buildStructuralResults
} = require(
  "../scripts/utils/polygonV4StructuralStage"
);

const CORE_A = {
  symbol: "USDC_NATIVE",
  address:
    "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
  decimals: 6
};

const CORE_B = {
  symbol: "WETH",
  address:
    "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
  decimals: 18
};

const EXOTIC_A =
  "0x1111111111111111111111111111111111111111";

const EXOTIC_B =
  "0x2222222222222222222222222222222222222222";

function evidence({
  entry,
  exit,
  conclusive = true
}) {
  return {
    entry: {
      summary: {
        status:
          entry
            ? QUOTE_OK
            : NO_ROUTE
      }
    },

    exit: {
      summary: {
        status:
          exit
            ? QUOTE_OK
            : NO_ROUTE
      }
    },

    hasEntry:
      entry,

    hasExit:
      exit,

    conclusive
  };
}

test(
  "pairKey is deterministic and case insensitive",
  () => {
    assert.equal(
      pairKey(
        CORE_A.address.toUpperCase(),
        EXOTIC_A.toUpperCase()
      ),
      `${CORE_A.address}:${EXOTIC_A}`
    );
  }
);

test(
  "empty STRUCTURAL stage produces clean progress",
  () => {
    const state = {
      stages: {
        STRUCTURAL: null
      }
    };

    assert.deepEqual(
      getStructuralProgress(
        state
      ),
      {
        classifications: null,
        metadata: {},
        outerEvidence: {},
        unresolved: []
      }
    );
  }
);

test(
  "existing STRUCTURAL progress is reused",
  () => {
    const state = {
      stages: {
        STRUCTURAL: {
          classifications: {
            pools: []
          },
          metadata: {
            [EXOTIC_A]: {
              status:
                "METADATA_OK",
              decimals: 18
            }
          },
          outerEvidence: {
            sample: {
              conclusive: true
            }
          },
          unresolved: [
            "sample"
          ]
        }
      }
    };

    const progress =
      getStructuralProgress(
        state
      );

    assert.equal(
      progress.metadata[
        EXOTIC_A
      ].decimals,
      18
    );

    assert.equal(
      progress.outerEvidence
        .sample.conclusive,
      true
    );

    assert.deepEqual(
      progress.unresolved,
      ["sample"]
    );
  }
);

test(
  "unique exotic collection deduplicates and skips quarantined pools",
  () => {
    const classifications = {
      pools: [
        {
          quarantined: false,
          exoticCurrencies: [
            EXOTIC_A,
            EXOTIC_B
          ]
        },
        {
          quarantined: false,
          exoticCurrencies: [
            EXOTIC_A
          ]
        },
        {
          quarantined: true,
          exoticCurrencies: [
            "0x3333333333333333333333333333333333333333"
          ]
        }
      ]
    };

    assert.deepEqual(
      collectUniqueExoticAddresses(
        classifications
      ),
      [
        EXOTIC_A,
        EXOTIC_B
      ]
    );
  }
);

test(
  "metadata resolution requires successful integer decimals",
  () => {
    assert.equal(
      metadataIsResolved({
        status:
          "METADATA_OK",
        decimals: 18
      }),
      true
    );

    assert.equal(
      metadataIsResolved({
        status:
          RPC_FAILURE,
        errorCode:
          "SERVER_ERROR"
      }),
      false
    );
  }
);

test(
  "conclusive evidence rejects unresolved RPC direction",
  () => {
    assert.equal(
      evidenceIsConclusive(
        evidence({
          entry: true,
          exit: false
        })
      ),
      true
    );

    assert.equal(
      evidenceIsConclusive({
        entry: {
          summary: {
            status:
              QUOTE_OK
          }
        },
        exit: {
          summary: {
            status:
              RPC_FAILURE
          }
        },
        hasEntry: true,
        hasExit: null,
        conclusive: false
      }),
      false
    );
  }
);

test(
  "core-exotic forward orientation uses exotic exit support",
  () => {
    const pool = {
      poolId:
        `0x${"11".repeat(32)}`,
      quarantined: false,
      currency0: {
        kind: "CORE",
        address:
          CORE_A.address
      },
      currency1: {
        kind: "EXOTIC",
        address:
          EXOTIC_A
      }
    };

    const outerEvidence = {
      [pairKey(
        CORE_A.address,
        EXOTIC_A
      )]:
        evidence({
          entry: false,
          exit: true
        })
    };

    assert.deepEqual(
      supportedOrientationsForPool({
        pool,
        outerEvidence,
        coreTokens: [
          CORE_A
        ]
      }),
      [
        {
          direction:
            "ZERO_FOR_ONE",
          start:
            CORE_A
        }
      ]
    );
  }
);

test(
  "core-exotic reverse orientation uses exotic entry support",
  () => {
    const pool = {
      poolId:
        `0x${"12".repeat(32)}`,
      quarantined: false,
      currency0: {
        kind: "CORE",
        address:
          CORE_A.address
      },
      currency1: {
        kind: "EXOTIC",
        address:
          EXOTIC_A
      }
    };

    const outerEvidence = {
      [pairKey(
        CORE_A.address,
        EXOTIC_A
      )]:
        evidence({
          entry: true,
          exit: false
        })
    };

    assert.deepEqual(
      supportedOrientationsForPool({
        pool,
        outerEvidence,
        coreTokens: [
          CORE_A
        ]
      }),
      [
        {
          direction:
            "ONE_FOR_ZERO",
          start:
            CORE_A
        }
      ]
    );
  }
);

test(
  "exotic-exotic forward orientation requires same core entry and exit topology",
  () => {
    const pool = {
      poolId:
        `0x${"13".repeat(32)}`,
      quarantined: false,

      currency0: {
        kind: "EXOTIC",
        address:
          EXOTIC_A
      },

      currency1: {
        kind: "EXOTIC",
        address:
          EXOTIC_B
      }
    };

    const outerEvidence = {
      [pairKey(
        CORE_A.address,
        EXOTIC_A
      )]:
        evidence({
          entry: true,
          exit: false
        }),

      [pairKey(
        CORE_A.address,
        EXOTIC_B
      )]:
        evidence({
          entry: false,
          exit: true
        })
    };

    assert.deepEqual(
      supportedOrientationsForPool({
        pool,
        outerEvidence,
        coreTokens: [
          CORE_A
        ]
      }),
      [
        {
          direction:
            "ZERO_FOR_ONE",
          start:
            CORE_A
        }
      ]
    );
  }
);

test(
  "exotic-exotic orientation is not produced from different start cores",
  () => {
    const pool = {
      poolId:
        `0x${"14".repeat(32)}`,
      quarantined: false,

      currency0: {
        kind: "EXOTIC",
        address:
          EXOTIC_A
      },

      currency1: {
        kind: "EXOTIC",
        address:
          EXOTIC_B
      }
    };

    const outerEvidence = {
      [pairKey(
        CORE_A.address,
        EXOTIC_A
      )]:
        evidence({
          entry: true,
          exit: false
        }),

      [pairKey(
        CORE_A.address,
        EXOTIC_B
      )]:
        evidence({
          entry: false,
          exit: false
        }),

      [pairKey(
        CORE_B.address,
        EXOTIC_A
      )]:
        evidence({
          entry: false,
          exit: false
        }),

      [pairKey(
        CORE_B.address,
        EXOTIC_B
      )]:
        evidence({
          entry: false,
          exit: true
        })
    };

    assert.deepEqual(
      supportedOrientationsForPool({
        pool,
        outerEvidence,
        coreTokens: [
          CORE_A,
          CORE_B
        ]
      }),
      []
    );
  }
);

test(
  "RPC uncertainty cannot create an orientation",
  () => {
    const pool = {
      poolId:
        `0x${"15".repeat(32)}`,
      quarantined: false,

      currency0: {
        kind: "CORE",
        address:
          CORE_A.address
      },

      currency1: {
        kind: "EXOTIC",
        address:
          EXOTIC_A
      }
    };

    const outerEvidence = {
      [pairKey(
        CORE_A.address,
        EXOTIC_A
      )]: {
        entry: {
          summary: {
            status:
              QUOTE_OK
          }
        },

        exit: {
          summary: {
            status:
              RPC_FAILURE
          }
        },

        hasEntry: true,
        hasExit: null,
        conclusive: false
      }
    };

    assert.deepEqual(
      supportedOrientationsForPool({
        pool,
        outerEvidence,
        coreTokens: [
          CORE_A
        ]
      }),
      []
    );
  }
);

test(
  "native POL pool is persisted as quarantined",
  () => {
    const classifications = {
      counts: {
        totalActive: 1
      },

      pools: [
        {
          poolId:
            `0x${"16".repeat(32)}`,
          category:
            "NATIVE_POL_QUARANTINED",
          quarantined: true,
          currency0: {
            kind:
              "NATIVE_POL",
            address:
              "0x0000000000000000000000000000000000000000"
          },
          currency1: {
            kind:
              "EXOTIC",
            address:
              EXOTIC_A
          }
        }
      ]
    };

    const result =
      buildStructuralResults({
        classifications,
        outerEvidence: {},
        coreTokens: [
          CORE_A
        ]
      });

    assert.equal(
      result.pools[0]
        .quarantined,
      true
    );

    assert.equal(
      result.pools[0]
        .quarantineReason,
      "NATIVE_POL"
    );

    assert.deepEqual(
      result.pools[0]
        .orientations,
      []
    );

    assert.equal(
      result.counts
        .quarantined,
      1
    );
  }
);

test(
  "structural results count supported and unsupported non-native pools",
  () => {
    const classifications = {
      counts: {
        totalActive: 2
      },

      pools: [
        {
          poolId:
            `0x${"17".repeat(32)}`,
          category:
            "CORE_EXOTIC",
          quarantined: false,
          currency0: {
            kind: "CORE",
            address:
              CORE_A.address
          },
          currency1: {
            kind: "EXOTIC",
            address:
              EXOTIC_A
          }
        },
        {
          poolId:
            `0x${"18".repeat(32)}`,
          category:
            "CORE_EXOTIC",
          quarantined: false,
          currency0: {
            kind: "CORE",
            address:
              CORE_A.address
          },
          currency1: {
            kind: "EXOTIC",
            address:
              EXOTIC_B
          }
        }
      ]
    };

    const outerEvidence = {
      [pairKey(
        CORE_A.address,
        EXOTIC_A
      )]:
        evidence({
          entry: false,
          exit: true
        }),

      [pairKey(
        CORE_A.address,
        EXOTIC_B
      )]:
        evidence({
          entry: false,
          exit: false
        })
    };

    const result =
      buildStructuralResults({
        classifications,
        outerEvidence,
        coreTokens: [
          CORE_A
        ]
      });

    assert.equal(
      result.counts
        .totalActive,
      2
    );

    assert.equal(
      result.counts
        .withOrientation,
      1
    );

    assert.equal(
      result.counts
        .withoutOrientation,
      1
    );
  }
);

test(
  "core-core market is deferred rather than given an identity-leg orientation",
  () => {
    const classifications = {
      counts: {
        totalActive: 1
      },

      pools: [
        {
          poolId:
            `0x${"19".repeat(32)}`,
          category:
            "CORE_CORE",
          quarantined: false,

          currency0: {
            kind: "CORE",
            address:
              CORE_A.address
          },

          currency1: {
            kind: "CORE",
            address:
              CORE_B.address
          }
        }
      ]
    };

    const result =
      buildStructuralResults({
        classifications,
        outerEvidence: {},
        coreTokens: [
          CORE_A,
          CORE_B
        ]
      });

    assert.equal(
      result.pools[0]
        .deferredCoreCore,
      true
    );

    assert.deepEqual(
      result.pools[0]
        .orientations,
      []
    );

    assert.equal(
      result.counts
        .deferredCoreCore,
      1
    );

    assert.equal(
      result.counts
        .withOrientation,
      0
    );

    assert.equal(
      result.counts
        .withoutOrientation,
      0
    );
  }
);
