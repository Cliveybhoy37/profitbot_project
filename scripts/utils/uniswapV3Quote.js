"use strict";

// Read-only single-hop Uniswap V3 quoting for Polygon.

const { Contract, ethers } = require("ethers");

const QUOTER_ADDRESS = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";
const FACTORY_ADDRESS = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const FULL_FEE_TIERS = [500, 3000, 10000];
const FAST_FEE_TIERS = [500, 3000];

const FEE_TIERS =
  process.env.UNISWAP_V3_FAST_TIERS === "true"
    ? FAST_FEE_TIERS
    : FULL_FEE_TIERS;

const poolCache = new Map();

function poolCacheKey(tokenA, tokenB, fee, blockTag) {
  const pair = [tokenA.toLowerCase(), tokenB.toLowerCase()].sort();

  return [
    blockTag == null ? "latest" : blockTag,
    pair[0],
    pair[1],
    fee
  ].join(":");
}

const QUOTER_ABI = [
  "function quoteExactInputSingle(address tokenIn,address tokenOut,uint24 fee,uint256 amountIn,uint160 sqrtPriceLimitX96) returns (uint256 amountOut)"
];

const FACTORY_ABI = [
  "function getPool(address tokenA,address tokenB,uint24 fee) view returns (address pool)"
];

function selectBestQuote(quotes) {
  if (!Array.isArray(quotes) || quotes.length === 0) return null;

  return quotes.reduce((best, quote) => {
    if (!best) return quote;

    const greater =
      quote.amountOut && typeof quote.amountOut.gt === "function"
        ? quote.amountOut.gt(best.amountOut)
        : quote.amountOut > best.amountOut;

    return greater ? quote : best;
  }, null);
}

async function getUniswapV3Quote(path, amountIn, provider, blockTag = null) {
  if (!Array.isArray(path) || path.length !== 2) return null;
  if (!provider || !amountIn || amountIn.lte(0)) return null;

  const [tokenIn, tokenOut] = path;
  const quoter = new Contract(QUOTER_ADDRESS, QUOTER_ABI, provider);
  const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);

  const quotes = [];

  for (const fee of FEE_TIERS) {
    try {
      const callOverrides = blockTag == null ? {} : { blockTag };
      const cacheKey =
        blockTag == null
          ? null
          : poolCacheKey(tokenIn, tokenOut, fee, blockTag);

      let pool =
        cacheKey == null
          ? undefined
          : poolCache.get(cacheKey);

      if (pool === undefined) {
        pool = await factory.getPool(
          tokenIn,
          tokenOut,
          fee,
          callOverrides
        );

        if (cacheKey != null) {
          poolCache.set(cacheKey, pool);
        }
      }

      if (pool === ethers.constants.AddressZero) continue;

      const amountOut = await quoter.callStatic.quoteExactInputSingle(
        tokenIn,
        tokenOut,
        fee,
        amountIn,
        0,
        callOverrides
      );

      quotes.push({
        dex: "UniswapV3",
        amountOut,
        fee,
        pool
      });
    } catch (_) {
      // Missing, empty or reverting pools are not viable candidates.
    }
  }

  const best = selectBestQuote(quotes);

  return best || {
    dex: "UniswapV3",
    amountOut: ethers.constants.Zero,
    fee: null,
    pool: null
  };
}

module.exports = {
  getUniswapV3Quote,
  selectBestQuote,
  QUOTER_ADDRESS,
  FACTORY_ADDRESS,
  FEE_TIERS,
  FULL_FEE_TIERS,
  FAST_FEE_TIERS
};
