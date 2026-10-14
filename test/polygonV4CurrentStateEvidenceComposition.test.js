"use strict";

const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

function loadSubject() {
  return require(
    "../scripts/utils/polygonV4CurrentStateEvidenceComposition"
  );
}

function makeFixture() {
  const preflightEvidence =
    Object.freeze({ qualified: true });

  const readinessEvidence = {
    executionEvidenceReady: true,
    qualifiedContext: {
      qualificationResult: {
        preflight: preflightEvidence
      }
    }
  };

  const chainEvidence = { chainId: 137 };
  const deploymentEvidence = { executorAddress: "executor" };
  const routeAmountEvidence = { route: "route" };
  const economicsEvidence = { economics: "economics" };
  const freshnessEvidence = { deadline: 2000 };

  return {
    readinessEvidence,

    currentChainIdentityAcquisitionEvidence: {
      chainEvidence,
      currentChainIdentityAcquisitionReady: true
    },

    currentDeploymentCodeIdentityAcquisitionEvidence: {
      deploymentEvidence,
      currentDeploymentCodeIdentityAcquisitionReady: true
    },

    currentRouteAmountEvidenceComposition: {
      routeAmountEvidence,
      currentRouteAmountEvidenceCompositionReady: true
    },

    currentEconomicsEvidenceComposition: {
      economicsEvidence,
      currentEconomicsEvidenceCompositionReady: true
    },

    currentFreshnessEvidenceComposition: {
      freshnessEvidence,
      currentFreshnessEvidenceCompositionReady: true
    },

    preflightEvidence,
    chainEvidence,
    deploymentEvidence,
    routeAmountEvidence,
    economicsEvidence,
    freshnessEvidence
  };
}

describe(
  "Polygon V4 current-state evidence composition",
  () => {
    it(
      "assembles exact established evidence identities",
      () => {
        const {
          buildCurrentStateEvidenceComposition
        } = loadSubject();

        const preflightEvidence =
          Object.freeze({ qualified: true });

        const readinessEvidence =
          Object.freeze({
            executionEvidenceReady: true,
            qualifiedContext:
              Object.freeze({
                qualificationResult:
                  Object.freeze({
                    preflight:
                      preflightEvidence
                  })
              })
          });

        const chainEvidence =
          Object.freeze({ chainId: 137 });

        const deploymentEvidence =
          Object.freeze({ executorAddress: "executor" });

        const routeAmountEvidence =
          Object.freeze({ route: "route" });

        const economicsEvidence =
          Object.freeze({ economics: "economics" });

        const freshnessEvidence =
          Object.freeze({ deadline: 2000 });

        const result =
          buildCurrentStateEvidenceComposition({
            readinessEvidence,

            currentChainIdentityAcquisitionEvidence: {
              chainEvidence,
              currentChainIdentityAcquisitionReady: true
            },

            currentDeploymentCodeIdentityAcquisitionEvidence: {
              deploymentEvidence,
              currentDeploymentCodeIdentityAcquisitionReady: true
            },

            currentRouteAmountEvidenceComposition: {
              routeAmountEvidence,
              currentRouteAmountEvidenceCompositionReady: true
            },

            currentEconomicsEvidenceComposition: {
              economicsEvidence,
              currentEconomicsEvidenceCompositionReady: true
            },

            currentFreshnessEvidenceComposition: {
              freshnessEvidence,
              currentFreshnessEvidenceCompositionReady: true
            }
          });

        assert.deepEqual(
          Object.keys(result.currentStateEvidence),
          [
            "chainEvidence",
            "deploymentEvidence",
            "routeAmountEvidence",
            "economicsEvidence",
            "freshnessEvidence",
            "preflightEvidence"
          ]
        );

        assert.equal(
          result.currentStateEvidence.chainEvidence,
          chainEvidence
        );

        assert.equal(
          result.currentStateEvidence.deploymentEvidence,
          deploymentEvidence
        );

        assert.equal(
          result.currentStateEvidence.routeAmountEvidence,
          routeAmountEvidence
        );

        assert.equal(
          result.currentStateEvidence.economicsEvidence,
          economicsEvidence
        );

        assert.equal(
          result.currentStateEvidence.freshnessEvidence,
          freshnessEvidence
        );

        assert.equal(
          result.currentStateEvidence.preflightEvidence,
          preflightEvidence
        );

        assert.equal(
          Object.hasOwn(
            result.currentStateEvidence,
            "balanceAllowanceEvidence"
          ),
          false
        );

        assert.equal(
          Object.isFrozen(result.currentStateEvidence),
          true
        );

        assert.equal(
          Object.isFrozen(result),
          true
        );

        assert.equal(
          result.currentStateEvidenceCompositionReady,
          true
        );
      }
    );

    it(
      "requires execution readiness provenance",
      () => {
        const {
          buildCurrentStateEvidenceComposition
        } = loadSubject();

        for (const value of [
          undefined,
          null,
          false,
          1,
          "true"
        ]) {
          const fixture = makeFixture();

          fixture.readinessEvidence.executionEvidenceReady =
            value;

          assert.throws(() =>
            buildCurrentStateEvidenceComposition(fixture)
          );
        }
      }
    );

    it(
      "requires each constituent boundary wrapper to be an object",
      () => {
        const {
          buildCurrentStateEvidenceComposition
        } = loadSubject();

        const fields = [
          "currentChainIdentityAcquisitionEvidence",
          "currentDeploymentCodeIdentityAcquisitionEvidence",
          "currentRouteAmountEvidenceComposition",
          "currentEconomicsEvidenceComposition",
          "currentFreshnessEvidenceComposition"
        ];

        for (const field of fields) {
          for (const value of [
            null,
            undefined,
            [],
            "invalid"
          ]) {
            const fixture = makeFixture();
            fixture[field] = value;

            assert.throws(() =>
              buildCurrentStateEvidenceComposition(fixture)
            );
          }
        }
      }
    );

    it(
      "requires every constituent boundary ready flag to be exactly true",
      () => {
        const {
          buildCurrentStateEvidenceComposition
        } = loadSubject();

        const readyFields = [
          [
            "currentChainIdentityAcquisitionEvidence",
            "currentChainIdentityAcquisitionReady"
          ],
          [
            "currentDeploymentCodeIdentityAcquisitionEvidence",
            "currentDeploymentCodeIdentityAcquisitionReady"
          ],
          [
            "currentRouteAmountEvidenceComposition",
            "currentRouteAmountEvidenceCompositionReady"
          ],
          [
            "currentEconomicsEvidenceComposition",
            "currentEconomicsEvidenceCompositionReady"
          ],
          [
            "currentFreshnessEvidenceComposition",
            "currentFreshnessEvidenceCompositionReady"
          ]
        ];

        for (const [wrapperField, readyField] of readyFields) {
          for (const value of [
            undefined,
            null,
            false,
            1,
            "true"
          ]) {
            const fixture = makeFixture();
            fixture[wrapperField][readyField] = value;

            assert.throws(() =>
              buildCurrentStateEvidenceComposition(fixture)
            );
          }
        }
      }
    );

    it(
      "requires each constituent inner evidence value to be an object",
      () => {
        const {
          buildCurrentStateEvidenceComposition
        } = loadSubject();

        const fields = [
          [
            "currentChainIdentityAcquisitionEvidence",
            "chainEvidence"
          ],
          [
            "currentDeploymentCodeIdentityAcquisitionEvidence",
            "deploymentEvidence"
          ],
          [
            "currentRouteAmountEvidenceComposition",
            "routeAmountEvidence"
          ],
          [
            "currentEconomicsEvidenceComposition",
            "economicsEvidence"
          ],
          [
            "currentFreshnessEvidenceComposition",
            "freshnessEvidence"
          ]
        ];

        for (const [wrapperField, evidenceField] of fields) {
          for (const value of [
            undefined,
            null,
            [],
            "invalid"
          ]) {
            const fixture = makeFixture();
            fixture[wrapperField][evidenceField] = value;

            assert.throws(() =>
              buildCurrentStateEvidenceComposition(fixture)
            );
          }
        }
      }
    );

    it(
      "requires the authoritative nested qualification preflight",
      () => {
        const {
          buildCurrentStateEvidenceComposition
        } = loadSubject();

        {
          const fixture = makeFixture();
          fixture.readinessEvidence.qualifiedContext = null;

          assert.throws(() =>
            buildCurrentStateEvidenceComposition(fixture)
          );
        }

        {
          const fixture = makeFixture();
          fixture.readinessEvidence.qualifiedContext
            .qualificationResult = null;

          assert.throws(() =>
            buildCurrentStateEvidenceComposition(fixture)
          );
        }

        for (const value of [
          undefined,
          null,
          [],
          "invalid"
        ]) {
          const fixture = makeFixture();

          fixture.readinessEvidence.qualifiedContext
            .qualificationResult.preflight = value;

          assert.throws(() =>
            buildCurrentStateEvidenceComposition(fixture)
          );
        }
      }
    );

    it(
      "does not copy unrelated input fields into current-state evidence",
      () => {
        const {
          buildCurrentStateEvidenceComposition
        } = loadSubject();

        const fixture = makeFixture();

        fixture.readinessEvidence.unrelatedReadiness =
          "do-not-copy";

        fixture.currentChainIdentityAcquisitionEvidence
          .unrelatedChain = "do-not-copy";

        fixture.currentFreshnessEvidenceComposition
          .balanceAllowanceEvidence = {
            checked: true,
            sufficient: true
          };

        const result =
          buildCurrentStateEvidenceComposition(fixture);

        assert.deepEqual(
          Object.keys(result.currentStateEvidence),
          [
            "chainEvidence",
            "deploymentEvidence",
            "routeAmountEvidence",
            "economicsEvidence",
            "freshnessEvidence",
            "preflightEvidence"
          ]
        );

        assert.equal(
          Object.hasOwn(
            result.currentStateEvidence,
            "unrelatedReadiness"
          ),
          false
        );

        assert.equal(
          Object.hasOwn(
            result.currentStateEvidence,
            "unrelatedChain"
          ),
          false
        );

        assert.equal(
          Object.hasOwn(
            result.currentStateEvidence,
            "balanceAllowanceEvidence"
          ),
          false
        );
      }
    );

  }
);
