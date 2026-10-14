"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const MODULE_PATH =
  "../scripts/utils/polygonV4CurrentEconomicsEvidenceComposition";

function loadSubject() {
  return require(MODULE_PATH);
}

function makeReadinessEvidence() {
  const gasEvidence = Object.freeze({
    gasUnits: 652106,
    executorContext: Object.freeze({
      id: "executor-context"
    })
  });

  const qualificationPolicySnapshot =
    Object.freeze({
      blockNumber: 1000,
      gasPriceWei: "30000000000"
    });

  return Object.freeze({
    gasEvidence,
    qualificationPolicySnapshot,

    preparedExecutionContext:
      Object.freeze({
        id: "prepared-context"
      }),

    qualifiedContext:
      Object.freeze({
        id: "qualified-context"
      }),

    executionEvidenceReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  });
}

describe(
  "Polygon V4 current economics evidence composition",
  () => {
    it(
      "preserves exact readiness economics identities",
      () => {
        const {
          buildCurrentEconomicsEvidenceComposition
        } = loadSubject();

        const readinessEvidence =
          makeReadinessEvidence();

        const result =
          buildCurrentEconomicsEvidenceComposition({
            readinessEvidence
          });

        const evidence =
          result.economicsEvidence;

        assert.equal(
          evidence.gasEvidence,
          readinessEvidence.gasEvidence
        );

        assert.equal(
          evidence.qualificationPolicySnapshot,
          readinessEvidence
            .qualificationPolicySnapshot
        );

        assert.deepEqual(
          Object.keys(evidence).sort(),
          [
            "gasEvidence",
            "qualificationPolicySnapshot"
          ]
        );

        assert.equal(
          result.currentEconomicsEvidenceCompositionReady,
          true
        );

        assert.equal(
          Object.isFrozen(evidence),
          true
        );

        assert.equal(
          Object.isFrozen(result),
          true
        );
      }
    );
    it(
      "rejects invalid readiness evidence",
      () => {
        const {
          buildCurrentEconomicsEvidenceComposition
        } = loadSubject();

        for (
          const readinessEvidence of
          [null, undefined, [], "readiness"]
        ) {
          assert.throws(
            () =>
              buildCurrentEconomicsEvidenceComposition({
                readinessEvidence
              }),
            /readinessEvidence must be an object/
          );
        }
      }
    );

    it(
      "requires execution evidence readiness",
      () => {
        const {
          buildCurrentEconomicsEvidenceComposition
        } = loadSubject();

        const base =
          makeReadinessEvidence();

        for (
          const executionEvidenceReady of
          [false, null, undefined]
        ) {
          assert.throws(
            () =>
              buildCurrentEconomicsEvidenceComposition({
                readinessEvidence: {
                  ...base,
                  executionEvidenceReady
                }
              }),
            /Execution evidence is not ready/
          );
        }
      }
    );

    it(
      "requires established gas evidence",
      () => {
        const {
          buildCurrentEconomicsEvidenceComposition
        } = loadSubject();

        const base =
          makeReadinessEvidence();

        for (
          const gasEvidence of
          [null, undefined, [], "gas"]
        ) {
          assert.throws(
            () =>
              buildCurrentEconomicsEvidenceComposition({
                readinessEvidence: {
                  ...base,
                  gasEvidence
                }
              }),
            /readinessEvidence\.gasEvidence must be an object/
          );
        }
      }
    );

    it(
      "requires established qualification policy snapshot",
      () => {
        const {
          buildCurrentEconomicsEvidenceComposition
        } = loadSubject();

        const base =
          makeReadinessEvidence();

        for (
          const qualificationPolicySnapshot of
          [null, undefined, [], "policy"]
        ) {
          assert.throws(
            () =>
              buildCurrentEconomicsEvidenceComposition({
                readinessEvidence: {
                  ...base,
                  qualificationPolicySnapshot
                }
              }),
            /readinessEvidence\.qualificationPolicySnapshot must be an object/
          );
        }
      }
    );

    it(
      "does not copy unrelated readiness fields",
      () => {
        const {
          buildCurrentEconomicsEvidenceComposition
        } = loadSubject();

        const readinessEvidence = {
          ...makeReadinessEvidence(),
          unrelatedMutableField: {
            value: "must-not-be-copied"
          }
        };

        const result =
          buildCurrentEconomicsEvidenceComposition({
            readinessEvidence
          });

        assert.deepEqual(
          Object.keys(
            result.economicsEvidence
          ).sort(),
          [
            "gasEvidence",
            "qualificationPolicySnapshot"
          ]
        );

        assert.equal(
          Object.prototype.hasOwnProperty.call(
            result.economicsEvidence,
            "unrelatedMutableField"
          ),
          false
        );
      }
    );

  }
);
