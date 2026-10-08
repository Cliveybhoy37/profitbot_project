"use strict";

const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const {
  buildCurrentStatePreflightCompositionEvidence
} = require(
  "../scripts/utils/" +
  "polygonV4CurrentStatePreflightCompositionEvidence"
);

function makeFixture() {
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
    executorAddress:
      "0x1111111111111111111111111111111111111111",
    executorCodeHash:
      "0x347dca910e2d4b7dd6b4ba19151fc2cd28e33c268cbb38511169a0b4a753facc"
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
    observationBlock: 94709817
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
    policySnapshot:
      qualificationPolicySnapshot,
    gasEvidence
  });

  const preparedExecutionContext = Object.freeze({
    candidate,
    executionLegs,
    executionPlan,
    deadline: 2000
  });

  const readinessEvidence = Object.freeze({
    candidate,
    executionLegs,
    executionPlan,
    gasEvidence,
    qualificationPolicySnapshot,
    qualifiedContext,
    preparedExecutionContext,
    executionEvidenceReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  });

  const chainEvidence = Object.freeze({
    chainId: 137
  });

  const deploymentEvidence = Object.freeze({
    executorAddress:
      executorContext.executorAddress,
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

  const currentStateEvidence = Object.freeze({
    chainEvidence,
    deploymentEvidence,
    routeAmountEvidence,
    economicsEvidence,
    freshnessEvidence,
    preflightEvidence:
      authoritativePreflight
  });

  const currentStateEvidenceComposition =
    Object.freeze({
      currentStateEvidence,
      currentStateEvidenceCompositionReady:
        true
    });

  return {
    readinessEvidence,
    currentStateEvidence,
    currentStateEvidenceComposition
  };
}

describe(
  "Polygon V4 current-state preflight composition evidence",
  () => {
    it(
      "bridges exact composed current-state evidence into established preflight",
      () => {
        const fixture = makeFixture();

        const result =
          buildCurrentStatePreflightCompositionEvidence({
            readinessEvidence:
              fixture.readinessEvidence,
            currentStateEvidenceComposition:
              fixture.currentStateEvidenceComposition
          });

        assert.equal(
          result.currentStateEvidenceComposition,
          fixture.currentStateEvidenceComposition
        );

        assert.equal(
          result.currentStatePreflightEvidence
            .readinessEvidence,
          fixture.readinessEvidence
        );

        assert.equal(
          result.currentStatePreflightEvidence
            .currentStateEvidence,
          fixture.currentStateEvidence
        );

        assert.equal(
          result.currentStatePreflightEvidence
            .currentStatePreflightReady,
          true
        );

        assert.equal(
          result.currentStatePreflightCompositionReady,
          true
        );

        assert.equal(
          Object.isFrozen(result),
          true
        );

        assert.deepEqual(
          Object.keys(result),
          [
            "currentStateEvidenceComposition",
            "currentStatePreflightEvidence",
            "currentStatePreflightCompositionReady"
          ]
        );
      }
    );

    it(
      "requires completed current-state evidence composition provenance",
      () => {
        const fixture = makeFixture();

        assert.throws(
          () =>
            buildCurrentStatePreflightCompositionEvidence({
              readinessEvidence:
                fixture.readinessEvidence,
              currentStateEvidenceComposition: {
                currentStateEvidence:
                  fixture.currentStateEvidence,
                currentStateEvidenceCompositionReady:
                  false
              }
            }),
          /Current-state evidence composition is not ready/
        );
      }
    );

    it(
      "requires composition and composed current-state objects",
      () => {
        const fixture = makeFixture();

        assert.throws(
          () =>
            buildCurrentStatePreflightCompositionEvidence({
              readinessEvidence:
                fixture.readinessEvidence,
              currentStateEvidenceComposition:
                null
            }),
          /Current-state evidence composition must be an object/
        );

        assert.throws(
          () =>
            buildCurrentStatePreflightCompositionEvidence({
              readinessEvidence:
                fixture.readinessEvidence,
              currentStateEvidenceComposition: {
                currentStateEvidenceCompositionReady:
                  true,
                currentStateEvidence: null
              }
            }),
          /Current-state evidence must be an object/
        );
      }
    );

    it(
      "does not advance execution authorization",
      () => {
        const fixture = makeFixture();

        const result =
          buildCurrentStatePreflightCompositionEvidence({
            readinessEvidence:
              fixture.readinessEvidence,
            currentStateEvidenceComposition:
              fixture.currentStateEvidenceComposition
          });

        assert.equal(
          Object.hasOwn(
            result,
            "liveExecutionAuthorized"
          ),
          false
        );

        assert.equal(
          Object.hasOwn(
            result,
            "signerAuthorized"
          ),
          false
        );

        assert.equal(
          Object.hasOwn(
            result,
            "broadcastAuthorized"
          ),
          false
        );

        assert.equal(
          result.currentStatePreflightEvidence
            .liveExecutionAuthorized,
          false
        );

        assert.equal(
          result.currentStatePreflightEvidence
            .signerAuthorized,
          false
        );

        assert.equal(
          result.currentStatePreflightEvidence
            .broadcastAuthorized,
          false
        );
      }
    );

    it(
      "propagates established preflight rejection without advancing authorization",
      () => {
        const fixture = makeFixture();

        const invalidReadiness = Object.freeze({
          ...fixture.readinessEvidence,
          liveExecutionAuthorized: true
        });

        assert.throws(
          () =>
            buildCurrentStatePreflightCompositionEvidence({
              readinessEvidence:
                invalidReadiness,
              currentStateEvidenceComposition:
                fixture.currentStateEvidenceComposition
            }),
          /Upstream execution authorization must remain false/
        );
      }
    );
  }
);
