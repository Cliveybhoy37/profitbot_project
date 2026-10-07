"use strict";

const assert = require("assert");
const { describe, it } = require("node:test");
const { ethers } = require("ethers");

const {
  buildCurrentDeploymentCodeIdentityAcquisitionEvidence
} = require("../scripts/utils/polygonV4CurrentDeploymentCodeIdentityAcquisitionEvidence");

const {
  buildVerifiedDeploymentAddressEvidence
} = require("../scripts/utils/polygonV4VerifiedDeploymentAddressEvidence");

const EXECUTOR =
  "0x1111111111111111111111111111111111111111";

const RUNTIME_CODE = "0x6001600055";

const EXPECTED_CODE_HASH =
  ethers.utils.keccak256(RUNTIME_CODE);

function makeDeploymentAddressEvidence(overrides = {}) {
  return {
    executorAddress: EXECUTOR,
    deploymentTransactionHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    deploymentBlock: 123456,
    receiptStatus: 1,
    ...overrides
  };
}

function makeProvider(...args) {
  const code =
    args.length === 0
      ? RUNTIME_CODE
      : args[0];

  const calls = [];

  return {
    calls,

    async getCode(address) {
      calls.push(address);
      return code;
    }
  };
}

describe(
  "Polygon V4 current deployment code identity acquisition evidence",
  function () {
    it("builds frozen current deployment code identity evidence", async function () {
      const provider = makeProvider();

      const result =
        await buildCurrentDeploymentCodeIdentityAcquisitionEvidence({
          deploymentAddressEvidence:
            makeDeploymentAddressEvidence(),
          provider
        });

      assert.strictEqual(
        result.currentDeploymentCodeIdentityAcquisitionReady,
        true
      );

      assert.deepStrictEqual(
        result.deploymentEvidence,
        {
          executorAddress: EXECUTOR,
          executorCodeHash: EXPECTED_CODE_HASH
        }
      );

      assert.strictEqual(
        Object.isFrozen(result.deploymentEvidence),
        true
      );

      assert.strictEqual(
        Object.isFrozen(result),
        true
      );
    });

    it("rejects missing deployment address evidence", async function () {
      await assert.rejects(
        () =>
          buildCurrentDeploymentCodeIdentityAcquisitionEvidence({
            provider: makeProvider()
          }),
        /deployment address evidence/i
      );
    });

    it("rejects invalid or zero established executor address", async function () {
      for (const executorAddress of [
        "not-an-address",
        ethers.constants.AddressZero
      ]) {
        await assert.rejects(
          () =>
            buildCurrentDeploymentCodeIdentityAcquisitionEvidence({
              deploymentAddressEvidence:
                makeDeploymentAddressEvidence({
                  executorAddress
                }),
              provider: makeProvider()
            }),
          /executor address/i
        );
      }
    });

    it("requires a provider with getCode", async function () {
      for (const provider of [
        undefined,
        null,
        {},
        { getCode: true }
      ]) {
        await assert.rejects(
          () =>
            buildCurrentDeploymentCodeIdentityAcquisitionEvidence({
              deploymentAddressEvidence:
                makeDeploymentAddressEvidence(),
              provider
            }),
          /provider.*getCode|getCode.*required/i
        );
      }
    });

    it("calls getCode exactly once with the exact established executor address", async function () {
      const provider = makeProvider();

      await buildCurrentDeploymentCodeIdentityAcquisitionEvidence({
        deploymentAddressEvidence:
          makeDeploymentAddressEvidence(),
        provider
      });

      assert.deepStrictEqual(
        provider.calls,
        [EXECUTOR]
      );
    });

    it("rejects invalid or empty runtime bytecode", async function () {
      for (const code of [
        undefined,
        null,
        "",
        "not-hex",
        "0x"
      ]) {
        await assert.rejects(
          () =>
            buildCurrentDeploymentCodeIdentityAcquisitionEvidence({
              deploymentAddressEvidence:
                makeDeploymentAddressEvidence(),
              provider: makeProvider(code)
            }),
          /runtime bytecode|deployed runtime bytecode/i
        );
      }
    });

    it("carries forward only current deployment identity fields", async function () {
      const deploymentAddressEvidence =
        makeDeploymentAddressEvidence();

      const result =
        await buildCurrentDeploymentCodeIdentityAcquisitionEvidence({
          deploymentAddressEvidence,
          provider: makeProvider()
        });

      assert.notStrictEqual(
        result.deploymentEvidence,
        deploymentAddressEvidence
      );

      assert.deepStrictEqual(
        Object.keys(result.deploymentEvidence).sort(),
        [
          "executorAddress",
          "executorCodeHash"
        ]
      );

      assert.strictEqual(
        result.deploymentEvidence.deploymentTransactionHash,
        undefined
      );

      assert.strictEqual(
        result.deploymentEvidence.deploymentBlock,
        undefined
      );

      assert.strictEqual(
        result.deploymentEvidence.receiptStatus,
        undefined
      );
    });
    it("consumes the exact verified 1S.49 deployment address evidence", async function () {
      const verified =
        buildVerifiedDeploymentAddressEvidence({
          deploymentProvenance:
            makeDeploymentAddressEvidence()
        });

      const provider = makeProvider();

      const result =
        await buildCurrentDeploymentCodeIdentityAcquisitionEvidence({
          deploymentAddressEvidence:
            verified.deploymentAddressEvidence,
          provider
        });

      assert.deepStrictEqual(
        provider.calls,
        [verified.deploymentAddressEvidence.executorAddress]
      );

      assert.strictEqual(
        result.deploymentEvidence.executorAddress,
        verified.deploymentAddressEvidence.executorAddress
      );

      assert.strictEqual(
        result.deploymentEvidence.executorCodeHash,
        EXPECTED_CODE_HASH
      );
    });
  }
);
