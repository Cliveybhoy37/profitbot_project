"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  observeProtectedPeakProviderBlock
} = require(
  "../scripts/research/runPolygonV4ProtectedPeakProviderBlock"
);

test(
  "returns the exact provider block from one observation",
  async () => {
    let calls = 0;

    const provider = {
      async getBlockNumber() {
        calls += 1;
        return 94834040;
      }
    };

    const blockTag =
      await observeProtectedPeakProviderBlock({
        provider
      });

    assert.equal(
      blockTag,
      94834040
    );

    assert.equal(
      calls,
      1
    );
  }
);

test(
  "rejects a missing provider before observation",
  async () => {
    await assert.rejects(
      observeProtectedPeakProviderBlock({
        provider: null
      }),
      /provider required/
    );
  }
);

test(
  "rejects a provider without getBlockNumber",
  async () => {
    await assert.rejects(
      observeProtectedPeakProviderBlock({
        provider: {}
      }),
      /provider requires getBlockNumber/
    );
  }
);

test(
  "rejects malformed provider block evidence",
  async () => {
    const invalidValues = [
      0,
      -1,
      1.5,
      Number.MAX_SAFE_INTEGER + 1,
      null,
      undefined,
      "94834040"
    ];

    for (const value of invalidValues) {
      let calls = 0;

      await assert.rejects(
        observeProtectedPeakProviderBlock({
          provider: {
            async getBlockNumber() {
              calls += 1;
              return value;
            }
          }
        }),
        /blockTag must be a positive safe integer/
      );

      assert.equal(
        calls,
        1
      );
    }
  }
);

test(
  "propagates provider observation failure unchanged",
  async () => {
    const failure =
      new Error("provider observation failed");

    await assert.rejects(
      observeProtectedPeakProviderBlock({
        provider: {
          async getBlockNumber() {
            throw failure;
          }
        }
      }),
      error => error === failure
    );
  }
);
