"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const { ethers } =
  require("ethers");

const {
  SNAPSHOT_PROVENANCE,
  validateAcquiredSnapshot,
  acquireProtectedPeakSnapshot
} = require(
  "../scripts/research/runPolygonV4ProtectedPeakSnapshot"
);

test(
  "validates a 1E-compatible snapshot with explicit provenance",
  () => {
    const gasPriceWei =
      ethers.BigNumber.from(
        "278281592114"
      );

    const snapshot =
      validateAcquiredSnapshot({
        blockTag: 94834040,
        gasPriceWei,
        premiumBps: 5
      });

    assert.equal(
      snapshot.blockTag,
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
      {
        quoteBlock: "PINNED",
        aavePremium:
          "BLOCK_PINNED",
        gasPrice:
          "OBSERVED_AT_ACQUISITION"
      }
    );

    assert.notEqual(
      snapshot.provenance,
      SNAPSHOT_PROVENANCE
    );
  }
);

test(
  "acquires one current provider-only snapshot and pins Aave to its quote block",
  async () => {
    const calls = [];

    const provider = {
      async getBlockNumber() {
        calls.push(
          "getBlockNumber"
        );

        return 94834040;
      },

      async getGasPrice() {
        calls.push(
          "getGasPrice"
        );

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
      await acquireProtectedPeakSnapshot({
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
      snapshot.blockTag,
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
      SNAPSHOT_PROVENANCE
    );
  }
);

test(
  "fails closed on malformed acquired snapshot values",
  async () => {
    assert.throws(
      () =>
        validateAcquiredSnapshot({
          blockTag: 0,
          gasPriceWei: 1,
          premiumBps: 5
        }),
      /blockTag/
    );

    assert.throws(
      () =>
        validateAcquiredSnapshot({
          blockTag: 94834040,
          gasPriceWei: 0,
          premiumBps: 5
        }),
      /gasPriceWei/
    );

    assert.throws(
      () =>
        validateAcquiredSnapshot({
          blockTag: 94834040,
          gasPriceWei: 1,
          premiumBps: -1
        }),
      /premiumBps/
    );

    assert.throws(
      () =>
        validateAcquiredSnapshot({
          blockTag: 94834040,
          gasPriceWei: 1,
          premiumBps: 10000
        }),
      /premiumBps/
    );

    await assert.rejects(
      acquireProtectedPeakSnapshot({
        provider: {
          async getBlockNumber() {
            return 94834040;
          },

          async getGasPrice() {
            return 1;
          }
        },

        resolveAaveEconomicsFn:
          async () => ({
            premiumBps:
              Number.MAX_SAFE_INTEGER + 1
          })
      }),
      /premiumBps/
    );
  }
);

test(
  "fails closed on invalid acquisition dependencies",
  async () => {
    await assert.rejects(
      acquireProtectedPeakSnapshot({
        provider: null
      }),
      /provider required/
    );

    await assert.rejects(
      acquireProtectedPeakSnapshot({
        provider: {}
      }),
      /getBlockNumber and getGasPrice/
    );

    await assert.rejects(
      acquireProtectedPeakSnapshot({
        provider: {
          async getBlockNumber() {
            return 94834040;
          },

          async getGasPrice() {
            return 1;
          }
        },

        resolveAaveEconomicsFn:
          null
      }),
      /resolveAaveEconomicsFn/
    );

    await assert.rejects(
      acquireProtectedPeakSnapshot({
        provider: {
          async getBlockNumber() {
            return 0;
          },

          async getGasPrice() {
            throw new Error(
              "must not reach gas acquisition"
            );
          }
        },

        resolveAaveEconomicsFn:
          async () => ({
            premiumBps: 5n
          })
      }),
      /blockTag/
    );

    await assert.rejects(
      acquireProtectedPeakSnapshot({
        provider: {
          async getBlockNumber() {
            return 94834040;
          },

          async getGasPrice() {
            return 1;
          }
        },

        resolveAaveEconomicsFn:
          async () => null
      }),
      /Aave economics required/
    );
  }
);
