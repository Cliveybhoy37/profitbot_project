"use strict";

const {
  describe,
  it
} = require("node:test");

const assert = require("node:assert/strict");

const {
  acquireCurrentChainTimestampEvidence
} = require(
  "../scripts/utils/polygonV4CurrentChainTimestampAcquisitionEvidence"
);

describe(
  "Polygon V4 current chain timestamp acquisition evidence",
  () => {
    it(
      "acquires frozen current block timestamp evidence",
      async () => {
        const calls = [];

        const provider = {
          async getBlockNumber() {
            calls.push([
              "getBlockNumber"
            ]);

            return 94570000;
          },

          async getBlock(blockNumber) {
            calls.push([
              "getBlock",
              blockNumber
            ]);

            return {
              number: 94570000,
              timestamp: 2000000000
            };
          }
        };

        const result =
          await acquireCurrentChainTimestampEvidence({
            provider
          });

        assert.deepEqual(
          calls,
          [
            ["getBlockNumber"],
            ["getBlock", 94570000]
          ]
        );

        assert.deepEqual(
          result.currentChainTimestampEvidence,
          {
            currentBlock: 94570000,
            currentTimestamp: 2000000000
          }
        );

        assert.equal(
          result.currentChainTimestampAcquisitionReady,
          true
        );

        assert.equal(
          Object.isFrozen(result),
          true
        );

        assert.equal(
          Object.isFrozen(
            result.currentChainTimestampEvidence
          ),
          true
        );
      }
    );

    it(
      "requires a provider object",
      async () => {
        await assert.rejects(
          acquireCurrentChainTimestampEvidence(),
          /Provider required/
        );
      }
    );

    it(
      "requires getBlockNumber and getBlock",
      async () => {
        await assert.rejects(
          acquireCurrentChainTimestampEvidence({
            provider: {}
          }),
          /Provider getBlockNumber required/
        );

        await assert.rejects(
          acquireCurrentChainTimestampEvidence({
            provider: {
              async getBlockNumber() {
                return 94570000;
              }
            }
          }),
          /Provider getBlock required/
        );
      }
    );

    it(
      "rejects an invalid current block number",
      async () => {
        for (const currentBlock of [
          0,
          -1,
          1.5,
          Number.MAX_SAFE_INTEGER + 1
        ]) {
          let getBlockCalls = 0;

          const provider = {
            async getBlockNumber() {
              return currentBlock;
            },

            async getBlock() {
              getBlockCalls += 1;

              return {
                number: currentBlock,
                timestamp: 2000000000
              };
            }
          };

          await assert.rejects(
            acquireCurrentChainTimestampEvidence({
              provider
            }),
            /Current block must be a positive safe integer/
          );

          assert.equal(
            getBlockCalls,
            0
          );
        }
      }
    );

    it(
      "fails closed when the exact current block is unavailable",
      async () => {
        const provider = {
          async getBlockNumber() {
            return 94570000;
          },

          async getBlock(blockNumber) {
            assert.equal(
              blockNumber,
              94570000
            );

            return null;
          }
        };

        await assert.rejects(
          acquireCurrentChainTimestampEvidence({
            provider
          }),
          /Current block unavailable/
        );
      }
    );

    it(
      "rejects a mismatched returned block number",
      async () => {
        const provider = {
          async getBlockNumber() {
            return 94570000;
          },

          async getBlock() {
            return {
              number: 94569999,
              timestamp: 2000000000
            };
          }
        };

        await assert.rejects(
          acquireCurrentChainTimestampEvidence({
            provider
          }),
          /Current block number mismatch/
        );
      }
    );

    it(
      "rejects an invalid current block timestamp",
      async () => {
        for (const currentTimestamp of [
          0,
          -1,
          1.5,
          Number.MAX_SAFE_INTEGER + 1
        ]) {
          const provider = {
            async getBlockNumber() {
              return 94570000;
            },

            async getBlock() {
              return {
                number: 94570000,
                timestamp: currentTimestamp
              };
            }
          };

          await assert.rejects(
            acquireCurrentChainTimestampEvidence({
              provider
            }),
            /Current timestamp must be a positive safe integer/
          );
        }
      }
    );

    it(
      "does not add deadline or execution-policy semantics",
      async () => {
        const provider = {
          async getBlockNumber() {
            return 94570000;
          },

          async getBlock() {
            return {
              number: 94570000,
              timestamp: 2000000000,
              gasLimit: "unrelated"
            };
          }
        };

        const result =
          await acquireCurrentChainTimestampEvidence({
            provider
          });

        assert.deepEqual(
          Object.keys(
            result.currentChainTimestampEvidence
          ).sort(),
          [
            "currentBlock",
            "currentTimestamp"
          ]
        );

        assert.equal(
          "deadline" in
            result.currentChainTimestampEvidence,
          false
        );
      }
    );
  }
);
