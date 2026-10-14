"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const MODULE_PATH =
  "../scripts/utils/polygonV4CurrentRouteAmountEvidenceComposition";

function loadSubject() {
  return require(MODULE_PATH);
}

function makePreparedExecutionContext() {
  const amountIn = Object.freeze({
    exact: "candidate-amount"
  });

  const candidate = Object.freeze({
    blockTag: 94709817,
    amountIn
  });

  const executionLegs = Object.freeze([
    Object.freeze({ id: "leg-1" }),
    Object.freeze({ id: "leg-2" }),
    Object.freeze({ id: "leg-3" })
  ]);

  const executionPlan = "0x1234";

  return Object.freeze({
    candidate,
    executionLegs,
    executionPlan,
    deadline: 2000,
    minimumNetProfitWei: Object.freeze({
      id: "minimum-profit"
    })
  });
}

describe(
  "Polygon V4 current route/amount evidence composition",
  () => {
    it(
      "preserves exact prepared route and amount identities",
      () => {
        const {
          buildCurrentRouteAmountEvidenceComposition
        } = loadSubject();

        const preparedExecutionContext =
          makePreparedExecutionContext();

        const result =
          buildCurrentRouteAmountEvidenceComposition({
            preparedExecutionContext
          });

        const evidence =
          result.routeAmountEvidence;

        assert.equal(
          evidence.candidate,
          preparedExecutionContext.candidate
        );
        assert.equal(
          evidence.executionLegs,
          preparedExecutionContext.executionLegs
        );
        assert.equal(
          evidence.executionPlan,
          preparedExecutionContext.executionPlan
        );
        assert.equal(
          evidence.amountIn,
          preparedExecutionContext.candidate.amountIn
        );

        assert.deepEqual(
          Object.keys(evidence).sort(),
          [
            "amountIn",
            "candidate",
            "executionLegs",
            "executionPlan"
          ]
        );

        assert.equal(
          result.currentRouteAmountEvidenceCompositionReady,
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
      "rejects an invalid prepared execution context",
      () => {
        const {
          buildCurrentRouteAmountEvidenceComposition
        } = loadSubject();

        for (const preparedExecutionContext of [
          null,
          undefined,
          [],
          "prepared"
        ]) {
          assert.throws(
            () =>
              buildCurrentRouteAmountEvidenceComposition({
                preparedExecutionContext
              }),
            /Prepared execution context must be an object/
          );
        }
      }
    );

    it(
      "requires a prepared candidate object",
      () => {
        const {
          buildCurrentRouteAmountEvidenceComposition
        } = loadSubject();

        const prepared =
          makePreparedExecutionContext();

        assert.throws(
          () =>
            buildCurrentRouteAmountEvidenceComposition({
              preparedExecutionContext: {
                ...prepared,
                candidate: null
              }
            }),
          /Prepared execution context candidate must be an object/
        );
      }
    );

    it(
      "requires prepared execution legs",
      () => {
        const {
          buildCurrentRouteAmountEvidenceComposition
        } = loadSubject();

        const prepared =
          makePreparedExecutionContext();

        assert.throws(
          () =>
            buildCurrentRouteAmountEvidenceComposition({
              preparedExecutionContext: {
                ...prepared,
                executionLegs: null
              }
            }),
          /Prepared execution context execution legs required/
        );
      }
    );

    it(
      "requires an established execution plan",
      () => {
        const {
          buildCurrentRouteAmountEvidenceComposition
        } = loadSubject();

        const prepared =
          makePreparedExecutionContext();

        for (const executionPlan of [
          null,
          undefined
        ]) {
          assert.throws(
            () =>
              buildCurrentRouteAmountEvidenceComposition({
                preparedExecutionContext: {
                  ...prepared,
                  executionPlan
                }
              }),
            /Prepared execution context execution plan required/
          );
        }
      }
    );

    it(
      "requires candidate amount evidence without reinterpreting it",
      () => {
        const {
          buildCurrentRouteAmountEvidenceComposition
        } = loadSubject();

        const prepared =
          makePreparedExecutionContext();

        for (const amountIn of [
          null,
          undefined
        ]) {
          assert.throws(
            () =>
              buildCurrentRouteAmountEvidenceComposition({
                preparedExecutionContext: {
                  ...prepared,
                  candidate: {
                    ...prepared.candidate,
                    amountIn
                  }
                }
              }),
            /Prepared execution context candidate amount required/
          );
        }

        const opaqueAmount = Object.freeze({
          arbitrary: "opaque-upstream-value"
        });

        const candidate = Object.freeze({
          ...prepared.candidate,
          amountIn: opaqueAmount
        });

        const result =
          buildCurrentRouteAmountEvidenceComposition({
            preparedExecutionContext: {
              ...prepared,
              candidate
            }
          });

        assert.equal(
          result.routeAmountEvidence.amountIn,
          opaqueAmount
        );
        assert.equal(
          result.routeAmountEvidence.candidate,
          candidate
        );
      }
    );

    it(
      "does not copy unrelated prepared-context fields",
      () => {
        const {
          buildCurrentRouteAmountEvidenceComposition
        } = loadSubject();

        const prepared =
          makePreparedExecutionContext();

        const result =
          buildCurrentRouteAmountEvidenceComposition({
            preparedExecutionContext: {
              ...prepared,
              unrelatedMutableField: {
                value: "must-not-be-copied"
              }
            }
          });

        assert.deepEqual(
          Object.keys(
            result.routeAmountEvidence
          ).sort(),
          [
            "amountIn",
            "candidate",
            "executionLegs",
            "executionPlan"
          ]
        );

        assert.equal(
          Object.prototype.hasOwnProperty.call(
            result.routeAmountEvidence,
            "unrelatedMutableField"
          ),
          false
        );
      }
    );

  }
);
