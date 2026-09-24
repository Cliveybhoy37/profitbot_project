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

test("default fee tiers include the 1% tier", () => {
  const modulePath = require.resolve("../scripts/utils/uniswapV3Quote");
  const previous = process.env.UNISWAP_V3_FAST_TIERS;

  delete process.env.UNISWAP_V3_FAST_TIERS;
  delete require.cache[modulePath];

  const { FEE_TIERS } = require("../scripts/utils/uniswapV3Quote");

  if (previous === undefined) {
    delete process.env.UNISWAP_V3_FAST_TIERS;
  } else {
    process.env.UNISWAP_V3_FAST_TIERS = previous;
  }
  delete require.cache[modulePath];

  assert.deepEqual(FEE_TIERS, [500, 3000, 10000]);
});

test("fast fee tiers omit the 1% tier when explicitly enabled", () => {
  const modulePath = require.resolve("../scripts/utils/uniswapV3Quote");
  const previous = process.env.UNISWAP_V3_FAST_TIERS;

  process.env.UNISWAP_V3_FAST_TIERS = "true";
  delete require.cache[modulePath];

  const { FEE_TIERS } = require("../scripts/utils/uniswapV3Quote");

  if (previous === undefined) {
    delete process.env.UNISWAP_V3_FAST_TIERS;
  } else {
    process.env.UNISWAP_V3_FAST_TIERS = previous;
  }
  delete require.cache[modulePath];

  assert.deepEqual(FEE_TIERS, [500, 3000]);
});
