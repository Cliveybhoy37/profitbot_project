"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

function loadSubject() {
  return require(
    "../scripts/utils/polygonV4CurrentChainIdentityAcquisitionEvidence"
  );
}

test(
  "acquires current Polygon chain identity exactly once",
  async () => {
    const {
      acquireCurrentChainIdentityEvidence
    } = loadSubject();

    let getNetworkCalls = 0;

    const provider = {
      async getNetwork() {
        getNetworkCalls += 1;

        return {
          chainId: 137
        };
      }
    };

    const result =
      await acquireCurrentChainIdentityEvidence({
        provider
      });

    assert.equal(
      getNetworkCalls,
      1
    );

    assert.deepEqual(
      result.chainEvidence,
      {
        chainId: 137
      }
    );

    assert.equal(
      result.currentChainIdentityAcquisitionReady,
      true
    );

    assert.equal(
      Object.isFrozen(
        result.chainEvidence
      ),
      true
    );

    assert.equal(
      Object.isFrozen(result),
      true
    );
  }
);

test(
  "rejects invalid provider before acquisition",
  async () => {
    const {
      acquireCurrentChainIdentityEvidence
    } = loadSubject();

    await assert.rejects(
      acquireCurrentChainIdentityEvidence({
        provider: null
      }),
      /Provider required/
    );
  }
);

test(
  "rejects missing getNetwork capability before acquisition",
  async () => {
    const {
      acquireCurrentChainIdentityEvidence
    } = loadSubject();

    await assert.rejects(
      acquireCurrentChainIdentityEvidence({
        provider: {}
      }),
      /Provider getNetwork required/
    );
  }
);

test(
  "rejects invalid network evidence after exactly one acquisition",
  async () => {
    const {
      acquireCurrentChainIdentityEvidence
    } = loadSubject();

    let getNetworkCalls = 0;

    const provider = {
      async getNetwork() {
        getNetworkCalls += 1;
        return null;
      }
    };

    await assert.rejects(
      acquireCurrentChainIdentityEvidence({
        provider
      }),
      /Provider network required/
    );

    assert.equal(
      getNetworkCalls,
      1
    );
  }
);

test(
  "rejects non-Polygon chain after exactly one acquisition",
  async () => {
    const {
      acquireCurrentChainIdentityEvidence
    } = loadSubject();

    let getNetworkCalls = 0;

    const provider = {
      async getNetwork() {
        getNetworkCalls += 1;

        return {
          chainId: 1
        };
      }
    };

    await assert.rejects(
      acquireCurrentChainIdentityEvidence({
        provider
      }),
      /Polygon chain ID 137 required/
    );

    assert.equal(
      getNetworkCalls,
      1
    );
  }
);
