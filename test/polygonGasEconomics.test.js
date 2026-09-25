const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  medianEffectiveGasPriceWei
} = require("../scripts/utils/polygonGasEconomics");

test("returns the median effective gas price for an odd sample", () => {
  assert.equal(
    medianEffectiveGasPriceWei([30n, 10n, 20n]),
    20n
  );
});

test("uses the upper-middle observed gas price for an even sample", () => {
  assert.equal(
    medianEffectiveGasPriceWei([40n, 10n, 30n, 20n]),
    30n
  );
});

test("rejects empty gas price samples", () => {
  assert.throws(
    () => medianEffectiveGasPriceWei([]),
    TypeError
  );
});

test("rejects non-positive gas prices", () => {
  assert.throws(
    () => medianEffectiveGasPriceWei([10n, 0n, 20n]),
    TypeError
  );
});
