"use strict";

function medianEffectiveGasPriceWei(gasPricesWei) {
  if (!Array.isArray(gasPricesWei) || gasPricesWei.length === 0) {
    throw new TypeError("gasPricesWei must be a non-empty array");
  }

  const sorted = gasPricesWei.map((value) => {
    const gasPrice = BigInt(value);

    if (gasPrice <= 0n) {
      throw new TypeError("gas prices must be greater than zero");
    }

    return gasPrice;
  }).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  return sorted[Math.floor(sorted.length / 2)];
}

module.exports = {
  medianEffectiveGasPriceWei
};
