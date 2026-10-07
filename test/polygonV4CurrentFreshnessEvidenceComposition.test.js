"use strict";

const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

function loadSubject() {
  return require(
    "../scripts/utils/polygonV4CurrentFreshnessEvidenceComposition"
  );
}

describe(
  "Polygon V4 current freshness evidence composition",
  () => {
    it(
      "preserves authoritative deadline and acquired current timestamp",
      () => {
        const {
          buildCurrentFreshnessEvidenceComposition
        } = loadSubject();

        const preparedExecutionContext =
          Object.freeze({
            deadline: 2000
          });

        const currentChainTimestampEvidence =
          Object.freeze({
            currentBlock: 123456,
            currentTimestamp: 1900
          });

        const result =
          buildCurrentFreshnessEvidenceComposition({
            preparedExecutionContext,
            currentChainTimestampEvidence
          });

        assert.deepEqual(
          Object.keys(result.freshnessEvidence),
          [
            "deadline",
            "currentTimestamp"
          ]
        );

        assert.equal(
          result.freshnessEvidence.deadline,
          preparedExecutionContext.deadline
        );

        assert.equal(
          result.freshnessEvidence.currentTimestamp,
          currentChainTimestampEvidence.currentTimestamp
        );

        assert.equal(
          Object.isFrozen(result.freshnessEvidence),
          true
        );

        assert.equal(
          Object.isFrozen(result),
          true
        );

        assert.equal(
          result.currentFreshnessEvidenceCompositionReady,
          true
        );
      }
    );
  }
);

describe(
  "Polygon V4 current freshness evidence composition validation",
  () => {
    const validPrepared = {
      deadline: 2000
    };

    const validTimestamp = {
      currentTimestamp: 1900
    };

    it("rejects invalid input objects", () => {
      const {
        buildCurrentFreshnessEvidenceComposition
      } = loadSubject();

      for (const value of [null, undefined, [], "invalid"]) {
        assert.throws(() =>
          buildCurrentFreshnessEvidenceComposition({
            preparedExecutionContext: value,
            currentChainTimestampEvidence: validTimestamp
          })
        );

        assert.throws(() =>
          buildCurrentFreshnessEvidenceComposition({
            preparedExecutionContext: validPrepared,
            currentChainTimestampEvidence: value
          })
        );
      }
    });

    it("requires a positive safe integer deadline", () => {
      const {
        buildCurrentFreshnessEvidenceComposition
      } = loadSubject();

      for (const deadline of [undefined, null, 0, -1, 1.5, Infinity]) {
        assert.throws(() =>
          buildCurrentFreshnessEvidenceComposition({
            preparedExecutionContext: { deadline },
            currentChainTimestampEvidence: validTimestamp
          })
        );
      }
    });

    it("requires a positive safe integer current timestamp", () => {
      const {
        buildCurrentFreshnessEvidenceComposition
      } = loadSubject();

      for (const currentTimestamp of [
        undefined,
        null,
        0,
        -1,
        1.5,
        Infinity
      ]) {
        assert.throws(() =>
          buildCurrentFreshnessEvidenceComposition({
            preparedExecutionContext: validPrepared,
            currentChainTimestampEvidence: {
              currentTimestamp
            }
          })
        );
      }
    });

    it("does not decide whether freshness is expired", () => {
      const {
        buildCurrentFreshnessEvidenceComposition
      } = loadSubject();

      const result =
        buildCurrentFreshnessEvidenceComposition({
          preparedExecutionContext: {
            deadline: 2000
          },
          currentChainTimestampEvidence: {
            currentTimestamp: 2000
          }
        });

      assert.equal(
        result.freshnessEvidence.deadline,
        2000
      );

      assert.equal(
        result.freshnessEvidence.currentTimestamp,
        2000
      );

      assert.equal(
        result.currentFreshnessEvidenceCompositionReady,
        true
      );
    });
  }
);
