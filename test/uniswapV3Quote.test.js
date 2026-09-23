const { test } = require("node:test");
const assert = require("node:assert/strict");

const { selectBestQuote } = require("../scripts/utils/uniswapV3Quote");

test("selectBestQuote chooses highest output rather than first fee tier", () => {
  const quotes = [
    { dex: "UniswapV3", amountOut: 100n, fee: 500, pool: "pool500" },
    { dex: "UniswapV3", amountOut: 125n, fee: 3000, pool: "pool3000" },
    { dex: "UniswapV3", amountOut: 110n, fee: 10000, pool: "pool10000" }
  ];

  const best = selectBestQuote(quotes);

  assert.equal(best.amountOut, 125n);
  assert.equal(best.fee, 3000);
  assert.equal(best.pool, "pool3000");
});

test("selectBestQuote returns null when no viable quotes exist", () => {
  assert.equal(selectBestQuote([]), null);
});
