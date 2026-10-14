"use strict";

const assert = require("assert");
const { describe, it } = require("node:test");

const {
  buildVerifiedDeploymentAddressEvidence
} = require("../scripts/utils/polygonV4VerifiedDeploymentAddressEvidence");

const EXECUTOR =
  "0x1111111111111111111111111111111111111111";

const TX_HASH =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function makeProvenance(overrides = {}) {
  return {
    executorAddress: EXECUTOR,
    deploymentTransactionHash: TX_HASH,
    deploymentBlock: 123456,
    receiptStatus: 1,
    ...overrides
  };
}

describe("Polygon V4 verified deployment address evidence", function () {
  it("builds frozen verified deployment-address evidence", function () {
    const deploymentProvenance = makeProvenance();

    const result =
      buildVerifiedDeploymentAddressEvidence({
        deploymentProvenance
      });

    assert.strictEqual(
      result.verifiedDeploymentAddressReady,
      true
    );

    assert.strictEqual(
      result.deploymentAddressEvidence.executorAddress,
      EXECUTOR
    );

    assert.strictEqual(
      result.deploymentAddressEvidence.deploymentTransactionHash,
      TX_HASH
    );

    assert.strictEqual(
      result.deploymentAddressEvidence.deploymentBlock,
      123456
    );

    assert.strictEqual(
      result.deploymentAddressEvidence.receiptStatus,
      1
    );

    assert.strictEqual(
      Object.isFrozen(result.deploymentAddressEvidence),
      true
    );

    assert.strictEqual(
      Object.isFrozen(result),
      true
    );
  });

  it("rejects missing deployment provenance", function () {
    assert.throws(
      () =>
        buildVerifiedDeploymentAddressEvidence(),
      /deployment provenance/i
    );
  });

  it("rejects invalid or zero executor address", function () {
    for (const executorAddress of [
      "not-an-address",
      "0x0000000000000000000000000000000000000000"
    ]) {
      assert.throws(
        () =>
          buildVerifiedDeploymentAddressEvidence({
            deploymentProvenance:
              makeProvenance({
                executorAddress
              })
          }),
        /executor address/i
      );
    }
  });

  it("rejects invalid deployment transaction hash", function () {
    for (const deploymentTransactionHash of [
      "",
      "0x1234",
      "not-a-hash"
    ]) {
      assert.throws(
        () =>
          buildVerifiedDeploymentAddressEvidence({
            deploymentProvenance:
              makeProvenance({
                deploymentTransactionHash
              })
          }),
        /deployment transaction hash/i
      );
    }
  });

  it("rejects invalid deployment block", function () {
    for (const deploymentBlock of [
      0,
      -1,
      1.5,
      Number.MAX_SAFE_INTEGER + 1
    ]) {
      assert.throws(
        () =>
          buildVerifiedDeploymentAddressEvidence({
            deploymentProvenance:
              makeProvenance({
                deploymentBlock
              })
          }),
        /deployment block/i
      );
    }
  });

  it("requires successful deployment receipt status", function () {
    for (const receiptStatus of [
      0,
      false,
      "1",
      undefined
    ]) {
      assert.throws(
        () =>
          buildVerifiedDeploymentAddressEvidence({
            deploymentProvenance:
              makeProvenance({
                receiptStatus
              })
          }),
        /receipt status/i
      );
    }
  });

  it("copies only the validated deployment provenance fields", function () {
    const deploymentProvenance = {
      ...makeProvenance(),
      unrelatedMutableField: {
        value: "must-not-survive"
      }
    };

    const result =
      buildVerifiedDeploymentAddressEvidence({
        deploymentProvenance
      });

    assert.notStrictEqual(
      result.deploymentAddressEvidence,
      deploymentProvenance
    );

    assert.deepStrictEqual(
      Object.keys(
        result.deploymentAddressEvidence
      ).sort(),
      [
        "deploymentBlock",
        "deploymentTransactionHash",
        "executorAddress",
        "receiptStatus"
      ]
    );

    assert.strictEqual(
      Object.prototype.hasOwnProperty.call(
        result.deploymentAddressEvidence,
        "unrelatedMutableField"
      ),
      false
    );
  });

});
