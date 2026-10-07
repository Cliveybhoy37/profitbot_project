"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MODULE_PATH =
  "../scripts/utils/polygonV4CurrentStateExecutionPreflightEvidence";

function loadSubject() {
  return require(MODULE_PATH);
}

function makeFixture({
  executorAddress,
  chainEvidenceOverride
} = {}) {
  const executionPlan = "0x1234";

  const candidate = Object.freeze({
    blockTag: 94709817,
    amountIn: Object.freeze({
      exact: "candidate-amount"
    })
  });

  const executionLegs = Object.freeze([
    Object.freeze({ id: "leg-1" }),
    Object.freeze({ id: "leg-2" }),
    Object.freeze({ id: "leg-3" })
  ]);

  const executorContext = Object.freeze({
    ...(executorAddress === undefined
      ? {}
      : { executorAddress }),
    executorCodeHash:
      "0x347dca910e2d4b7dd6b4ba19151fc2cd28e33c268cbb38511169a0b4a753facc",
    v3Router:
      "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    v4Router:
      "0xDc264714F68d84CF29BC605589405E78bDBE7C9f",
    permit2:
      "0x000000000022D473030F116dDEE9F6B43aC78BA3",
    aaveProvider:
      "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    aavePool:
      "0x794a61358D6845594F94dc1DB02A252b5b4814aD"
  });

  const gasEvidence = Object.freeze({
    gasUnits: 652106,
    executorContext
  });

  const qualificationPolicySnapshot = Object.freeze({
    blockNumber: 1000,
    gasPriceWei: "30000000000"
  });

  const authoritativePreflight = Object.freeze({
    observationBlock: 94709817,
    ageBlocks: 1,
    expectedPremium: Object.freeze({
      exact: "expected-premium"
    }),
    estimatedGasCost: Object.freeze({
      exact: "estimated-gas-cost"
    }),
    expectedNetProfit: Object.freeze({
      exact: "expected-net-profit"
    }),
    protectedFinalOutput: Object.freeze({
      exact: "protected-final-output"
    }),
    worstCaseNetProfit: Object.freeze({
      exact: "worst-case-net-profit"
    }),
    minimumNetProfit: Object.freeze({
      exact: "minimum-net-profit"
    })
  });

  const qualificationResult = Object.freeze({
    qualified: true,
    stage: "QUALIFIED",
    preflight: authoritativePreflight
  });

  const qualifiedContext = Object.freeze({
    qualificationResult,
    candidate,
    executionLegs,
    executionPlan,
    deadline: 2000,
    minimumNetProfitWei: Object.freeze({
      id: "minimum-profit"
    }),
    policySnapshot: qualificationPolicySnapshot,
    gasEvidence
  });

  const receipt = Object.freeze({
    status: 1
  });

  const finalExecutionResult = Object.freeze({
    receipt
  });

  const simulationResult = Object.freeze({
    qualifiedContext,
    simulationResult: finalExecutionResult
  });

  const preparedExecutionContext = Object.freeze({
    handoff: Object.freeze({
      id: "handoff"
    }),
    candidate,
    executionLegs,
    executionPlan,
    deadline: 2000,
    minimumNetProfitWei:
      qualifiedContext.minimumNetProfitWei
  });

  const readinessEvidence = Object.freeze({
    candidate,
    executionLegs,
    executionPlan,
    gasEvidence,
    qualificationPolicySnapshot,
    qualifiedContext,
    simulationResult,
    finalExecutionResult,
    receipt,

    preparedExecutionContext,

    executionEvidenceReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  });

  const chainEvidence =
    chainEvidenceOverride === undefined
      ? Object.freeze({
          chainId: 137
        })
      : chainEvidenceOverride;

  const deploymentEvidence = Object.freeze({
    executorAddress:
      "0x1111111111111111111111111111111111111111",
    executorCodeHash:
      executorContext.executorCodeHash
  });

  const routeAmountEvidence = Object.freeze({
    candidate,
    executionLegs,
    executionPlan,
    amountIn: candidate.amountIn
  });

  const economicsEvidence = Object.freeze({
    gasEvidence,
    qualificationPolicySnapshot
  });

  const freshnessEvidence = Object.freeze({
    deadline: 2000,
    currentTimestamp: 1900
  });

  const balanceAllowanceEvidence = Object.freeze({
    checked: true,
    sufficient: true
  });

  const preflightEvidence =
    authoritativePreflight;

  const currentStateEvidence = Object.freeze({
    chainEvidence,
    deploymentEvidence,
    routeAmountEvidence,
    economicsEvidence,
    freshnessEvidence,
    balanceAllowanceEvidence,
    preflightEvidence
  });

  return {
    executionPlan,
    gasEvidence,
    qualificationPolicySnapshot,
    qualifiedContext,
    readinessEvidence,
    currentStateEvidence
  };
}

test(
  "accepts exact acquired current-chain evidence by identity",
  async () => {
    const {
      acquireCurrentChainIdentityEvidence
    } = require(
      "../scripts/utils/polygonV4CurrentChainIdentityAcquisitionEvidence"
    );

    const acquired =
      await acquireCurrentChainIdentityEvidence({
        provider: {
          async getNetwork() {
            return {
              chainId: 137
            };
          }
        }
      });

    const fixture = makeFixture({
      chainEvidenceOverride:
        acquired.chainEvidence
    });

    const {
      buildCurrentStateExecutionPreflightEvidence
    } = loadSubject();

    const result =
      buildCurrentStateExecutionPreflightEvidence({
        readinessEvidence:
          fixture.readinessEvidence,
        currentStateEvidence:
          fixture.currentStateEvidence
      });

    assert.equal(
      fixture.currentStateEvidence.chainEvidence,
      acquired.chainEvidence
    );

    assert.equal(
      result.currentStateEvidence.chainEvidence,
      acquired.chainEvidence
    );

    assert.equal(
      acquired.currentChainIdentityAcquisitionReady,
      true
    );
  }
);

test(
  "preserves exact 1S.26 readiness and injected current-state evidence identities",
  () => {
    const {
      buildCurrentStateExecutionPreflightEvidence
    } = loadSubject();

    const fixture = makeFixture();

    const result =
      buildCurrentStateExecutionPreflightEvidence({
        readinessEvidence:
          fixture.readinessEvidence,
        currentStateEvidence:
          fixture.currentStateEvidence
      });

    assert.equal(
      result.readinessEvidence,
      fixture.readinessEvidence
    );

    assert.equal(
      result.currentStateEvidence,
      fixture.currentStateEvidence
    );

    assert.equal(
      result.executionPlan,
      fixture.executionPlan
    );

    assert.equal(
      result.gasEvidence,
      fixture.gasEvidence
    );

    assert.equal(
      result.qualificationPolicySnapshot,
      fixture.qualificationPolicySnapshot
    );

    assert.equal(
      result.qualifiedContext,
      fixture.qualifiedContext
    );
  }
);

test(
  "marks current-state preflight ready without authorizing execution",
  () => {
    const {
      buildCurrentStateExecutionPreflightEvidence
    } = loadSubject();

    const fixture = makeFixture();

    const result =
      buildCurrentStateExecutionPreflightEvidence({
        readinessEvidence:
          fixture.readinessEvidence,
        currentStateEvidence:
          fixture.currentStateEvidence
      });

    assert.equal(
      result.currentStatePreflightReady,
      true
    );

    assert.equal(
      result.liveExecutionAuthorized,
      false
    );

    assert.equal(
      result.signerAuthorized,
      false
    );

    assert.equal(
      result.broadcastAuthorized,
      false
    );

    assert.equal(
      Object.isFrozen(result),
      true
    );
  }
);

test(
  "rejects readiness evidence that is not execution-evidence ready",
  () => {
    const {
      buildCurrentStateExecutionPreflightEvidence
    } = loadSubject();

    const fixture = makeFixture();

    const invalid = {
      ...fixture.readinessEvidence,
      executionEvidenceReady: false
    };

    assert.throws(
      () =>
        buildCurrentStateExecutionPreflightEvidence({
          readinessEvidence: invalid,
          currentStateEvidence:
            fixture.currentStateEvidence
        }),
      /execution.*ready/i
    );
  }
);

test(
  "rejects any upstream live, signer, or broadcast authorization",
  () => {
    const {
      buildCurrentStateExecutionPreflightEvidence
    } = loadSubject();

    for (const field of [
      "liveExecutionAuthorized",
      "signerAuthorized",
      "broadcastAuthorized"
    ]) {
      const fixture = makeFixture();

      const invalid = {
        ...fixture.readinessEvidence,
        [field]: true
      };

      assert.throws(
        () =>
          buildCurrentStateExecutionPreflightEvidence({
            readinessEvidence: invalid,
            currentStateEvidence:
              fixture.currentStateEvidence
          }),
        /authoriz/i
      );
    }
  }
);

test(
  "rejects non-Polygon chain evidence",
  () => {
    const {
      buildCurrentStateExecutionPreflightEvidence
    } = loadSubject();

    const fixture = makeFixture();

    const invalidCurrentState = {
      ...fixture.currentStateEvidence,
      chainEvidence: {
        chainId: 1
      }
    };

    assert.throws(
      () =>
        buildCurrentStateExecutionPreflightEvidence({
          readinessEvidence:
            fixture.readinessEvidence,
          currentStateEvidence:
            invalidCurrentState
        }),
      /chain/i
    );
  }
);

test(
  "requires deployed executor identity evidence",
  () => {
    const {
      buildCurrentStateExecutionPreflightEvidence
    } = loadSubject();

    const fixture = makeFixture();

    const invalidCurrentState = {
      ...fixture.currentStateEvidence,
      deploymentEvidence: {
        executorAddress:
          "0x1111111111111111111111111111111111111111"
      }
    };

    assert.throws(
      () =>
        buildCurrentStateExecutionPreflightEvidence({
          readinessEvidence:
            fixture.readinessEvidence,
          currentStateEvidence:
            invalidCurrentState
        }),
      /deployment|code.*hash|executor/i
    );
  }
);

test(
  "rejects malformed deployed executor address evidence",
  () => {
    const {
      buildCurrentStateExecutionPreflightEvidence
    } = loadSubject();

    const fixture = makeFixture();

    const invalidCurrentState = {
      ...fixture.currentStateEvidence,
      deploymentEvidence: {
        ...fixture.currentStateEvidence
          .deploymentEvidence,
        executorAddress: "not-an-address"
      }
    };

    assert.throws(
      () =>
        buildCurrentStateExecutionPreflightEvidence({
          readinessEvidence:
            fixture.readinessEvidence,
          currentStateEvidence:
            invalidCurrentState
        }),
      /executor|address|deployment/i
    );
  }
);

test(
  "rejects zero deployed executor address evidence",
  () => {
    const {
      buildCurrentStateExecutionPreflightEvidence
    } = loadSubject();

    const fixture = makeFixture();

    const invalidCurrentState = {
      ...fixture.currentStateEvidence,
      deploymentEvidence: {
        ...fixture.currentStateEvidence
          .deploymentEvidence,
        executorAddress:
          "0x0000000000000000000000000000000000000000"
      }
    };

    assert.throws(
      () =>
        buildCurrentStateExecutionPreflightEvidence({
          readinessEvidence:
            fixture.readinessEvidence,
          currentStateEvidence:
            invalidCurrentState
        }),
      /executor|address|deployment/i
    );
  }
);

test(
  "rejects malformed deployed executor code-hash evidence",
  () => {
    const {
      buildCurrentStateExecutionPreflightEvidence
    } = loadSubject();

    const fixture = makeFixture();

    const invalidCurrentState = {
      ...fixture.currentStateEvidence,
      deploymentEvidence: {
        ...fixture.currentStateEvidence
          .deploymentEvidence,
        executorCodeHash: "0x1234"
      }
    };

    assert.throws(
      () =>
        buildCurrentStateExecutionPreflightEvidence({
          readinessEvidence:
            fixture.readinessEvidence,
          currentStateEvidence:
            invalidCurrentState
        }),
      /executor|code.*hash|deployment/i
    );
  }
);

test(
  "rejects deployed executor address that diverges from measured gas evidence",
  () => {
    const {
      buildCurrentStateExecutionPreflightEvidence
    } = loadSubject();

    const fixture = makeFixture({
      executorAddress:
        "0x2222222222222222222222222222222222222222"
    });

    const mismatchedCurrentStateEvidence =
      Object.freeze({
        ...fixture.currentStateEvidence,
        deploymentEvidence: Object.freeze({
          ...fixture.currentStateEvidence.deploymentEvidence,
          executorAddress:
            "0x3333333333333333333333333333333333333333"
        })
      });

    assert.throws(
      () =>
        buildCurrentStateExecutionPreflightEvidence({
          readinessEvidence:
            fixture.readinessEvidence,
          currentStateEvidence:
            mismatchedCurrentStateEvidence
        }),
      /executor.*address.*identity.*mismatch/i
    );
  }
);

test(
  "rejects deployed executor code hash that diverges from measured gas evidence",
  () => {
    const {
      buildCurrentStateExecutionPreflightEvidence
    } = loadSubject();

    const fixture = makeFixture();

    const invalidCurrentState = {
      ...fixture.currentStateEvidence,
      deploymentEvidence: {
        ...fixture.currentStateEvidence
          .deploymentEvidence,
        executorCodeHash:
          "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      }
    };

    assert.throws(
      () =>
        buildCurrentStateExecutionPreflightEvidence({
          readinessEvidence:
            fixture.readinessEvidence,
          currentStateEvidence:
            invalidCurrentState
        }),
      /executor|code.*hash|identity|mismatch/i
    );
  }
);

test(
  "rejects execution-plan identity divergence",
  () => {
    const {
      buildCurrentStateExecutionPreflightEvidence
    } = loadSubject();

    const fixture = makeFixture();

    const invalidCurrentState = {
      ...fixture.currentStateEvidence,
      routeAmountEvidence: {
        ...fixture.currentStateEvidence
          .routeAmountEvidence,
        executionPlan: "0xabcd"
      }
    };

    assert.throws(
      () =>
        buildCurrentStateExecutionPreflightEvidence({
          readinessEvidence:
            fixture.readinessEvidence,
          currentStateEvidence:
            invalidCurrentState
        }),
      /execution.*plan|identity/i
    );
  }
);

test(
  "rejects gas-evidence identity divergence",
  () => {
    const {
      buildCurrentStateExecutionPreflightEvidence
    } = loadSubject();

    const fixture = makeFixture();

    const invalidCurrentState = {
      ...fixture.currentStateEvidence,
      economicsEvidence: {
        ...fixture.currentStateEvidence
          .economicsEvidence,
        gasEvidence: {
          gasUnits: 652106
        }
      }
    };

    assert.throws(
      () =>
        buildCurrentStateExecutionPreflightEvidence({
          readinessEvidence:
            fixture.readinessEvidence,
          currentStateEvidence:
            invalidCurrentState
        }),
      /gas.*evidence|identity/i
    );
  }
);

test(
  "rejects qualification-policy identity divergence",
  () => {
    const {
      buildCurrentStateExecutionPreflightEvidence
    } = loadSubject();

    const fixture = makeFixture();

    const invalidCurrentState = {
      ...fixture.currentStateEvidence,
      economicsEvidence: {
        ...fixture.currentStateEvidence
          .economicsEvidence,
        qualificationPolicySnapshot: {
          blockNumber: 1000,
          gasPriceWei: "30000000000"
        }
      }
    };

    assert.throws(
      () =>
        buildCurrentStateExecutionPreflightEvidence({
          readinessEvidence:
            fixture.readinessEvidence,
          currentStateEvidence:
            invalidCurrentState
        }),
      /policy|identity/i
    );
  }
);

test(
  "rejects expired current-state deadline evidence",
  () => {
    const {
      buildCurrentStateExecutionPreflightEvidence
    } = loadSubject();

    const fixture = makeFixture();

    const invalidCurrentState = {
      ...fixture.currentStateEvidence,
      freshnessEvidence: {
        deadline: 2000,
        currentTimestamp: 2000
      }
    };

    assert.throws(
      () =>
        buildCurrentStateExecutionPreflightEvidence({
          readinessEvidence:
            fixture.readinessEvidence,
          currentStateEvidence:
            invalidCurrentState
        }),
      /deadline|fresh/i
    );
  }
);

test(
  "requires sufficient balance and allowance evidence",
  () => {
    const {
      buildCurrentStateExecutionPreflightEvidence
    } = loadSubject();

    const fixture = makeFixture();

    const invalidCurrentState = {
      ...fixture.currentStateEvidence,
      balanceAllowanceEvidence: {
        checked: true,
        sufficient: false
      }
    };

    assert.throws(
      () =>
        buildCurrentStateExecutionPreflightEvidence({
          readinessEvidence:
            fixture.readinessEvidence,
          currentStateEvidence:
            invalidCurrentState
        }),
      /balance|allowance|sufficient/i
    );
  }
);

test(
  "requires exact authoritative qualified preflight identity",
  () => {
    const {
      buildCurrentStateExecutionPreflightEvidence
    } = loadSubject();

    const fixture = makeFixture();

    const divergentPreflight =
      Object.freeze({
        ...fixture.currentStateEvidence
          .preflightEvidence
      });

    const invalidCurrentState = {
      ...fixture.currentStateEvidence,
      preflightEvidence:
        divergentPreflight
    };

    assert.throws(
      () =>
        buildCurrentStateExecutionPreflightEvidence({
          readinessEvidence:
            fixture.readinessEvidence,
          currentStateEvidence:
            invalidCurrentState
        }),
      /preflight|identity|qualified/i
    );
  }
);

test(
  "rejects readiness whose qualification result is not QUALIFIED",
  () => {
    const {
      buildCurrentStateExecutionPreflightEvidence
    } = loadSubject();

    const fixture = makeFixture();

    const invalidQualificationResult = {
      ...fixture.qualifiedContext
        .qualificationResult,
      stage: "PREFLIGHT"
    };

    const invalidQualifiedContext = {
      ...fixture.qualifiedContext,
      qualificationResult:
        invalidQualificationResult
    };

    const invalidReadiness = {
      ...fixture.readinessEvidence,
      qualifiedContext:
        invalidQualifiedContext
    };

    assert.throws(
      () =>
        buildCurrentStateExecutionPreflightEvidence({
          readinessEvidence:
            invalidReadiness,
          currentStateEvidence:
            fixture.currentStateEvidence
        }),
      /qualified|preflight|stage/i
    );
  }
);

test(
  "rejects candidate identity divergence",
  () => {
    const {
      buildCurrentStateExecutionPreflightEvidence
    } = loadSubject();

    const fixture = makeFixture();

    const invalidCurrentState = {
      ...fixture.currentStateEvidence,
      routeAmountEvidence: {
        ...fixture.currentStateEvidence
          .routeAmountEvidence,
        candidate: {
          ...fixture.currentStateEvidence
            .routeAmountEvidence.candidate
        }
      }
    };

    assert.throws(
      () =>
        buildCurrentStateExecutionPreflightEvidence({
          readinessEvidence:
            fixture.readinessEvidence,
          currentStateEvidence:
            invalidCurrentState
        }),
      /candidate|identity/i
    );
  }
);

test(
  "rejects execution-leg identity divergence",
  () => {
    const {
      buildCurrentStateExecutionPreflightEvidence
    } = loadSubject();

    const fixture = makeFixture();

    const invalidCurrentState = {
      ...fixture.currentStateEvidence,
      routeAmountEvidence: {
        ...fixture.currentStateEvidence
          .routeAmountEvidence,
        executionLegs: [
          ...fixture.currentStateEvidence
            .routeAmountEvidence.executionLegs
        ]
      }
    };

    assert.throws(
      () =>
        buildCurrentStateExecutionPreflightEvidence({
          readinessEvidence:
            fixture.readinessEvidence,
          currentStateEvidence:
            invalidCurrentState
        }),
      /execution legs|identity/i
    );
  }
);

test(
  "rejects route-amount identity divergence",
  () => {
    const {
      buildCurrentStateExecutionPreflightEvidence
    } = loadSubject();

    const fixture = makeFixture();

    const invalidCurrentState = {
      ...fixture.currentStateEvidence,
      routeAmountEvidence: {
        ...fixture.currentStateEvidence
          .routeAmountEvidence,
        amountIn: {
          ...fixture.currentStateEvidence
            .routeAmountEvidence.amountIn
        }
      }
    };

    assert.throws(
      () =>
        buildCurrentStateExecutionPreflightEvidence({
          readinessEvidence:
            fixture.readinessEvidence,
          currentStateEvidence:
            invalidCurrentState
        }),
      /route amount|identity/i
    );
  }
);

test(
  "rejects current-state deadline identity divergence",
  () => {
    const {
      buildCurrentStateExecutionPreflightEvidence
    } = loadSubject();

    const fixture = makeFixture();

    const invalidCurrentState = {
      ...fixture.currentStateEvidence,
      freshnessEvidence: {
        deadline: 2001,
        currentTimestamp: 1900
      }
    };

    assert.throws(
      () =>
        buildCurrentStateExecutionPreflightEvidence({
          readinessEvidence:
            fixture.readinessEvidence,
          currentStateEvidence:
            invalidCurrentState
        }),
      /deadline|identity/i
    );
  }
);

test(
  "production boundary contains no signer, transaction, broadcast, fork, or RPC ownership",
  () => {
    const sourcePath = path.join(
      __dirname,
      "..",
      "scripts",
      "utils",
      "polygonV4CurrentStateExecutionPreflightEvidence.js"
    );

    const source = fs.readFileSync(
      sourcePath,
      "utf8"
    );

    const forbidden = [
      /PRIVATE_KEY/i,
      /privateKey/,
      /new\s+(?:ethers\.)?Wallet/,
      /getSigner\s*\(/,
      /getSigners\s*\(/,
      /sendTransaction\s*\(/,
      /sendRawTransaction\s*\(/,
      /broadcastTransaction\s*\(/,
      /\.initiateFlashloan\s*\(/,
      /\.wait\s*\(/,
      /hardhat_reset/,
      /evm_snapshot/,
      /evm_revert/,
      /\.getNetwork\s*\(/,
      /\.getBlock\s*\(/,
      /\.getBlockNumber\s*\(/,
      /\.getCode\s*\(/,
      /\.getGasPrice\s*\(/,
      /\.getFeeData\s*\(/,
      /\.estimateGas\s*\(/,
      /\.call\s*\(/
    ];

    for (const pattern of forbidden) {
      assert.equal(
        pattern.test(source),
        false,
        `forbidden ownership matched ${pattern}`
      );
    }
  }
);
