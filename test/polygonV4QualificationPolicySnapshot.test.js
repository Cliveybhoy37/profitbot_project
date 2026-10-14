"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  POLICY_PROVENANCE,
  validateQualificationPolicySnapshot,
  acquireQualificationPolicySnapshot
} = require(
  "../scripts/utils/polygonV4QualificationPolicySnapshot"
);

test(
  "acquires qualification policy and pins Aave to the exact observed current block",
  async () => {
    const calls = [];

    const provider = {
      async getBlockNumber() {
        calls.push("getBlockNumber");
        return 94834040;
      },

      async getGasPrice() {
        calls.push("getGasPrice");
        return ethers.BigNumber.from(
          "278281592114"
        );
      }
    };

    const resolveAaveEconomicsFn =
      async (
        receivedProvider,
        providerAddress,
        blockTag
      ) => {
        calls.push(
          "resolveAaveEconomics"
        );

        assert.equal(
          receivedProvider,
          provider
        );

        assert.equal(
          providerAddress,
          undefined
        );

        assert.equal(
          blockTag,
          94834040
        );

        return {
          premiumBps: 5n
        };
      };

    const snapshot =
      await acquireQualificationPolicySnapshot({
        provider,
        resolveAaveEconomicsFn
      });

    assert.equal(
      calls[0],
      "getBlockNumber"
    );

    assert.deepEqual(
      new Set(calls.slice(1)),
      new Set([
        "getGasPrice",
        "resolveAaveEconomics"
      ])
    );

    assert.equal(
      snapshot.currentBlock,
      94834040
    );

    assert.equal(
      snapshot.gasPriceWei.toString(),
      "278281592114"
    );

    assert.equal(
      snapshot.premiumBps,
      5
    );

    assert.deepEqual(
      snapshot.provenance,
      POLICY_PROVENANCE
    );

    assert.notEqual(
      snapshot.provenance,
      POLICY_PROVENANCE
    );
  }
);

test(
  "fails closed on invalid acquisition dependencies",
  async () => {
    await assert.rejects(
      acquireQualificationPolicySnapshot({
        provider: null
      }),
      /provider required/
    );

    await assert.rejects(
      acquireQualificationPolicySnapshot({
        provider: {}
      }),
      /provider requires getBlockNumber and getGasPrice/
    );

    await assert.rejects(
      acquireQualificationPolicySnapshot({
        provider: {
          async getBlockNumber() {
            return 94834040;
          },
          async getGasPrice() {
            return ethers.BigNumber.from(1);
          }
        },
        resolveAaveEconomicsFn: null
      }),
      /resolveAaveEconomicsFn/
    );
  }
);

test(
  "rejects malformed current block before gas or Aave acquisition",
  async () => {
    let gasCalls = 0;
    let aaveCalls = 0;

    await assert.rejects(
      acquireQualificationPolicySnapshot({
        provider: {
          async getBlockNumber() {
            return 0;
          },
          async getGasPrice() {
            gasCalls += 1;
            throw new Error(
              "must not reach gas acquisition"
            );
          }
        },
        resolveAaveEconomicsFn:
          async () => {
            aaveCalls += 1;
            throw new Error(
              "must not reach Aave acquisition"
            );
          }
      }),
      /currentBlock/
    );

    assert.equal(gasCalls, 0);
    assert.equal(aaveCalls, 0);
  }
);

test(
  "fails closed on malformed qualification gas price",
  async () => {
    await assert.rejects(
      acquireQualificationPolicySnapshot({
        provider: {
          async getBlockNumber() {
            return 94834040;
          },
          async getGasPrice() {
            return 0;
          }
        },
        resolveAaveEconomicsFn:
          async () => ({
            premiumBps: 5n
          })
      }),
      /gasPriceWei must be positive/
    );
  }
);

test(
  "fails closed on missing or malformed Aave premium evidence",
  async () => {
    const provider = {
      async getBlockNumber() {
        return 94834040;
      },
      async getGasPrice() {
        return ethers.BigNumber.from(
          "278281592114"
        );
      }
    };

    await assert.rejects(
      acquireQualificationPolicySnapshot({
        provider,
        resolveAaveEconomicsFn:
          async () => null
      }),
      /Aave economics required/
    );

    for (const premiumBps of [
      -1n,
      10000n,
      BigInt(Number.MAX_SAFE_INTEGER) + 1n
    ]) {
      await assert.rejects(
        acquireQualificationPolicySnapshot({
          provider,
          resolveAaveEconomicsFn:
            async () => ({
              premiumBps
            })
        }),
        /premiumBps/
      );
    }
  }
);

test(
  "validates qualification policy independently of research snapshot semantics",
  () => {
    const snapshot =
      validateQualificationPolicySnapshot({
        currentBlock: 94834040,
        gasPriceWei:
          ethers.BigNumber.from(1),
        premiumBps: 5
      });

    assert.deepEqual(
      snapshot.provenance,
      {
        currentBlock:
          "PROVIDER_OBSERVED",
        gasPrice:
          "OBSERVED_AT_QUALIFICATION",
        aavePremium:
          "QUALIFICATION_BLOCK_PINNED"
      }
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        snapshot,
        "blockTag"
      ),
      false
    );
  }
);
