"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  STATE_VIEW,
  normalizePoolId,
  readPoolLiquidity,
  inspectPoolActivity
} = require("../scripts/utils/polygonV4ActivePools");

const POOL_A =
  `0x${"11".repeat(32)}`;

const POOL_B =
  `0x${"22".repeat(32)}`;

const POOL_C =
  `0x${"33".repeat(32)}`;

test("uses expected Polygon StateView address", () => {
  assert.equal(
    STATE_VIEW.toLowerCase(),
    "0x5ea1bd7974c8a611cbab0bdcafcb1d9cc9b3ba5a"
  );
});

test("normalizePoolId validates bytes32 PoolIds", () => {
  assert.equal(
    normalizePoolId(
      POOL_A.toUpperCase()
        .replace(/^0X/, "0x")
    ),
    POOL_A
  );

  assert.throws(
    () =>
      normalizePoolId("0x1234"),
    /Invalid V4 PoolId/
  );
});

test("successful nonzero liquidity is active", async () => {
  const calls = [];

  const stateView = {
    async getLiquidity(
      poolId,
      overrides
    ) {
      calls.push({
        poolId,
        overrides
      });

      return ethers.BigNumber.from(
        "123456789"
      );
    }
  };

  const result =
    await readPoolLiquidity({
      stateView,
      poolId: POOL_A,
      blockTag: 94709817
    });

  assert.deepEqual(
    result,
    {
      poolId: POOL_A,
      blockTag: 94709817,
      ok: true,
      liquidity: "123456789",
      active: true
    }
  );

  assert.equal(
    calls.length,
    1
  );

  assert.equal(
    calls[0].overrides.blockTag,
    94709817
  );
});

test("successful zero liquidity is inactive", async () => {
  const stateView = {
    async getLiquidity() {
      return ethers.constants.Zero;
    }
  };

  const result =
    await readPoolLiquidity({
      stateView,
      poolId: POOL_A,
      blockTag: 94709817
    });

  assert.equal(result.ok, true);
  assert.equal(
    result.liquidity,
    "0"
  );
  assert.equal(
    result.active,
    false
  );
});

test("RPC failure is not classified as inactive", async () => {
  const stateView = {
    async getLiquidity() {
      const error =
        new Error("provider failure");

      error.code =
        "SERVER_ERROR";

      throw error;
    }
  };

  const result =
    await readPoolLiquidity({
      stateView,
      poolId: POOL_A,
      blockTag: 94709817
    });

  assert.deepEqual(
    result,
    {
      poolId: POOL_A,
      blockTag: 94709817,
      ok: false,
      errorCode: "SERVER_ERROR"
    }
  );

  assert.equal(
    Object.hasOwn(
      result,
      "liquidity"
    ),
    false
  );

  assert.equal(
    Object.hasOwn(
      result,
      "active"
    ),
    false
  );
});

test("activity inspection separates active inactive and failed pools", async () => {
  const values =
    new Map([
      [
        POOL_A,
        ethers.BigNumber.from(10)
      ],
      [
        POOL_B,
        ethers.constants.Zero
      ]
    ]);

  const stateView = {
    async getLiquidity(poolId) {
      if (poolId === POOL_C) {
        const error =
          new Error("temporary RPC failure");

        error.code =
          "CALL_EXCEPTION";

        throw error;
      }

      return values.get(poolId);
    }
  };

  const result =
    await inspectPoolActivity({
      stateView,
      pools: [
        { poolId: POOL_A },
        { poolId: POOL_B },
        { poolId: POOL_C }
      ],
      blockTag: 94709817
    });

  assert.equal(
    result.observations.length,
    3
  );

  assert.equal(
    result.active.length,
    1
  );

  assert.equal(
    result.active[0].poolId,
    POOL_A
  );

  assert.equal(
    result.inactive.length,
    1
  );

  assert.equal(
    result.inactive[0].poolId,
    POOL_B
  );

  assert.equal(
    result.failures.length,
    1
  );

  assert.equal(
    result.failures[0].poolId,
    POOL_C
  );
});

test("onObservation receives each completed observation", async () => {
  const seen = [];

  const stateView = {
    async getLiquidity(poolId) {
      return poolId === POOL_A
        ? ethers.BigNumber.from(5)
        : ethers.constants.Zero;
    }
  };

  await inspectPoolActivity({
    stateView,
    pools: [
      { poolId: POOL_A },
      { poolId: POOL_B }
    ],
    blockTag: 94709817,
    onObservation:
      async observation => {
        seen.push(observation);
      }
  });

  assert.equal(
    seen.length,
    2
  );

  assert.equal(
    seen[0].ok,
    true
  );

  assert.equal(
    seen[1].ok,
    true
  );
});

test("rejects invalid blockTag before making RPC call", async () => {
  let called = false;

  const stateView = {
    async getLiquidity() {
      called = true;
      return ethers.constants.Zero;
    }
  };

  await assert.rejects(
    () =>
      readPoolLiquidity({
        stateView,
        poolId: POOL_A,
        blockTag: -1
      }),
    /blockTag/
  );

  assert.equal(
    called,
    false
  );
});
