"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const { ethers } =
  require("ethers");

const {
  SLIPPAGE_BPS,
  POLICY_GAS_UNITS,
  SAFETY_RESERVE,
  MINIMUM_NET_PROFIT
} = require(
  "../scripts/research/runPolygonV4LiveQualification"
);

const {
  amountSurfaceEconomics
} = require(
  "../scripts/utils/polygonV4AmountSurface"
);

test(
  "amount surface mirrors protected qualification arithmetic",
  () => {
    const result =
      amountSurfaceEconomics({
        amountIn:
          "125000000000000000",
        finalAmount:
          "144998569388452416",
        premiumBps:
          5,
        gasPriceWei:
          "266300438750"
      });

    assert.equal(
      result.slippageBps,
      SLIPPAGE_BPS
    );

    assert.equal(
      result.gasUnits.toString(),
      POLICY_GAS_UNITS.toString()
    );

    assert.equal(
      result.safetyReserveWei.toString(),
      SAFETY_RESERVE.toString()
    );

    assert.equal(
      result.minimumNetProfitWei.toString(),
      MINIMUM_NET_PROFIT.toString()
    );

    assert.equal(
      result.grossDelta.toString(),
      "19998569388452416"
    );

    assert.equal(
      result.protectedFinalOutput.toString(),
      "144273576541510153"
    );

    assert.equal(
      result.protectionHaircut.toString(),
      "724992846942263"
    );

    assert.equal(
      result.premiumWei.toString(),
      "62500000000000"
    );

    assert.equal(
      result.protectedGasBudgetWei.toString(),
      "13211076541510153"
    );

    assert.equal(
      result.gasPriceCeilingWei.toString(),
      "18872966487"
    );

    assert.equal(
      result.modeledGasCostWei.toString(),
      "186410307125000000"
    );

    assert.equal(
      result.economicDeficitWei.toString(),
      "173199230583489847"
    );

    assert.equal(
      result.gasCoveragePpm.toString(),
      "70870"
    );

    assert.equal(
      result.qualifiesAtObservedGas,
      false
    );
  }
);

test(
  "amount surface reports qualification when gas fits protected budget",
  () => {
    const result =
      amountSurfaceEconomics({
        amountIn: "100000",
        finalAmount: "120000",
        premiumBps: 5,
        slippageBps: 50,
        gasUnits: "100",
        safetyReserveWei: "1000",
        minimumNetProfitWei:
          "5000",
        gasPriceWei: "100"
      });

    assert.equal(
      result.protectedFinalOutput.toString(),
      "119400"
    );

    assert.equal(
      result.premiumWei.toString(),
      "50"
    );

    assert.equal(
      result.protectedGasBudgetWei.toString(),
      "13350"
    );

    assert.equal(
      result.gasPriceCeilingWei.toString(),
      "133"
    );

    assert.equal(
      result.modeledGasCostWei.toString(),
      "10000"
    );

    assert.equal(
      result.economicDeficitWei.toString(),
      "0"
    );

    assert.equal(
      result.gasCoveragePpm.toString(),
      "1335000"
    );

    assert.equal(
      result.qualifiesAtObservedGas,
      true
    );
  }
);

test(
  "amount surface clamps negative protected gas budget without hiding signed deficit",
  () => {
    const result =
      amountSurfaceEconomics({
        amountIn: "100000",
        finalAmount: "101000",
        premiumBps: 5,
        slippageBps: 50,
        gasUnits: "100",
        safetyReserveWei: "1000",
        minimumNetProfitWei:
          "5000"
      });

    assert.equal(
      result.protectedFinalOutput.toString(),
      "100495"
    );

    assert.equal(
      result.protectedGasBudgetSigned.toString(),
      "-5555"
    );

    assert.equal(
      result.protectedGasBudgetWei.toString(),
      "0"
    );

    assert.equal(
      result.gasPriceCeilingWei.toString(),
      "0"
    );

    assert.equal(
      result.modeledGasCostWei,
      null
    );

    assert.equal(
      result.economicDeficitWei,
      null
    );

    assert.equal(
      result.qualifiesAtObservedGas,
      null
    );
  }
);

test(
  "amount surface rejects invalid economic inputs",
  () => {
    assert.throws(
      () =>
        amountSurfaceEconomics({
          amountIn: "0",
          finalAmount: "1",
          premiumBps: 5
        }),
      /amountIn must be positive/
    );

    assert.throws(
      () =>
        amountSurfaceEconomics({
          amountIn: "1",
          finalAmount: "2",
          premiumBps: 10000
        }),
      /premiumBps/
    );

    assert.throws(
      () =>
        amountSurfaceEconomics({
          amountIn: "1",
          finalAmount: "2",
          premiumBps: 5,
          gasPriceWei: "0"
        }),
      /gasPriceWei must be positive/
    );
  }
);
