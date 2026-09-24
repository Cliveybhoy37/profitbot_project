const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  ceilDiv,
  flashloanFeeRaw,
  flashloanAdjustedResearchEconomics,
  maxAffordableGasUnits,
  nativeGasCostInTokenRaw
} = require("../scripts/utils/polygonNetEconomics");

test("ceilDiv rounds costs upward", () => {
  assert.equal(ceilDiv(10n, 5n), 2n);
  assert.equal(ceilDiv(11n, 5n), 3n);
  assert.equal(ceilDiv(0n, 5n), 0n);
});

test("flashloan fee uses basis points and rounds upward", () => {
  assert.equal(flashloanFeeRaw(100_000_000n, 5n), 50_000n);
  assert.equal(flashloanFeeRaw(1n, 5n), 1n);
});

test("research economics reports budget remaining after flashloan premium", () => {
  const result = flashloanAdjustedResearchEconomics({
    startAmount: 100_000_000n,
    finalAmount: 100_200_000n,
    premiumBps: 5n
  });

  assert.equal(result.grossDelta, 200_000n);
  assert.equal(result.flashloanFee, 50_000n);
  assert.equal(result.gasBudget, 150_000n);
  assert.equal(result.coversFlashloanFee, true);
});

test("research economics rejects gross-positive route that cannot cover premium", () => {
  const result = flashloanAdjustedResearchEconomics({
    startAmount: 100_000_000n,
    finalAmount: 100_040_000n,
    premiumBps: 5n
  });

  assert.equal(result.grossDelta, 40_000n);
  assert.equal(result.flashloanFee, 50_000n);
  assert.equal(result.gasBudget, -10_000n);
  assert.equal(result.coversFlashloanFee, false);
});

test("research economics requires budget strictly above flashloan premium", () => {
  const result = flashloanAdjustedResearchEconomics({
    startAmount: 100_000_000n,
    finalAmount: 100_050_000n,
    premiumBps: 5n
  });

  assert.equal(result.gasBudget, 0n);
  assert.equal(result.coversFlashloanFee, false);
});

test("gas budget converts to maximum affordable whole gas units", () => {
  const result = maxAffordableGasUnits({
    tokenBudget: 3_750n,
    maxFeePerGasWei: 30_000_000_000n,
    nativePrice: 25_000_000n,
    tokenPrice: 100_000_000n,
    tokenDecimals: 6
  });

  assert.equal(result, 500_000n);
});

test("affordable gas floors below an unaffordable boundary", () => {
  const gasUnits = maxAffordableGasUnits({
    tokenBudget: 3_749n,
    maxFeePerGasWei: 30_000_000_000n,
    nativePrice: 25_000_000n,
    tokenPrice: 100_000_000n,
    tokenDecimals: 6
  });

  assert.ok(gasUnits < 500_000n);

  const cost = nativeGasCostInTokenRaw({
    gasUnits,
    maxFeePerGasWei: 30_000_000_000n,
    nativePrice: 25_000_000n,
    tokenPrice: 100_000_000n,
    tokenDecimals: 6
  });

  assert.ok(cost <= 3_749n);
});

test("native gas converts to 6-decimal borrowed-token raw units", () => {
  const result = nativeGasCostInTokenRaw({
    gasUnits: 500_000n,
    maxFeePerGasWei: 30_000_000_000n,
    nativePrice: 25_000_000n,
    tokenPrice: 100_000_000n,
    tokenDecimals: 6
  });

  assert.equal(result, 3_750n);
});

test("gas conversion rejects invalid token pricing", () => {
  assert.throws(
    () =>
      nativeGasCostInTokenRaw({
        gasUnits: 500_000n,
        maxFeePerGasWei: 30_000_000_000n,
        nativePrice: 25_000_000n,
        tokenPrice: 0n,
        tokenDecimals: 6
      }),
    TypeError
  );
});

test("Aave economics wrapper preserves conservative flashloan fee calculation", () => {
  const {
    calculateFlashloanFee
  } = require("../scripts/utils/polygonAaveEconomics");

  assert.equal(calculateFlashloanFee(100_000_000n, 5n), 50_000n);
});

test("Aave economics wrapper preserves affordable gas calculation", () => {
  const {
    calculateMaxAffordableGasUnits
  } = require("../scripts/utils/polygonAaveEconomics");

  assert.equal(
    calculateMaxAffordableGasUnits({
      tokenBudget: 3_750n,
      maxFeePerGasWei: 30_000_000_000n,
      nativePrice: 25_000_000n,
      tokenPrice: 100_000_000n,
      tokenDecimals: 6
    }),
    500_000n
  );
});

test("Aave economics wrapper preserves conservative gas calculation", () => {
  const {
    calculateGasCostInToken
  } = require("../scripts/utils/polygonAaveEconomics");

  assert.equal(
    calculateGasCostInToken({
      gasUnits: 500_000n,
      maxFeePerGasWei: 30_000_000_000n,
      nativePrice: 25_000_000n,
      tokenPrice: 100_000_000n,
      tokenDecimals: 6
    }),
    3_750n
  );
});
