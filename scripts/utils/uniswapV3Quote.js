// scripts/utils/uniswapV3Quote.js
// ————————————————————————————————————————————
// Single-hop price lookup for Uniswap V3 on Polygon
// ————————————————————————————————————————————

const { Contract, ethers } = require("ethers");
const path                 = require("path");

/*  ← Pull the ABI directly from the NPM package
 *     • robust across OS / working-directory changes
 *     • automatically stays in sync with the official repo
 */
const QuoterV2ABI = require(
  "@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json"
).abi;

const { tokenMap } = require("../../helpers/tokenMap");

// ⇢ Polygon addresses
const QUOTER_ADDRESS  = "0x91ae842A5Ffd8d12023116943e72A606179294f3";
const FACTORY_ADDRESS = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

const factoryAbi = [
  "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address)"
];

let quoter, factory;

// Initialise (lazy-load singletons)
function init(provider) {
  if (!quoter)  quoter  = new Contract(QUOTER_ADDRESS,  QuoterV2ABI, provider);
  if (!factory) factory = new Contract(FACTORY_ADDRESS, factoryAbi,     provider);
  return { quoter, factory };
}

/**
 *  getUniswapV3Quote(path, amountIn, provider)
 *  ------------------------------------------
 *  • path      : [tokenIn, tokenOut] addresses
 *  • amountIn  : BigNumber
 *  • provider  : ethers.js provider
 *  → returns   : { dex, amountOut }
 */
const getUniswapV3Quote = async (path, amountIn, provider) => {
  if (path.length !== 2) return null;

  const [tokenIn, tokenOut] = path;
  const FEE_TIERS = [500, 3000, 10000];              // 0.05 %, 0.3 %, 1 %

  const { quoter, factory } = init(provider);

  for (const fee of FEE_TIERS) {
    try {
      const pool = await factory.getPool(tokenIn, tokenOut, fee);
      if (pool === ethers.constants.AddressZero) continue;   // no pool at this tier

      const amountOut = await quoter.callStatic.quoteExactInputSingle({
        tokenIn,
        tokenOut,
        fee,
        amountIn,
        sqrtPriceLimitX96: 0
      });

      return { dex: `UniswapV3 (fee ${fee})`, amountOut };
    } catch {
      // pool exists but reverted (e.g. 0 liquidity) — soft skip
      continue;
    }
  }

  // Nothing worked
  return { dex: "UniswapV3", amountOut: ethers.BigNumber.from(0) };
};

module.exports = { getUniswapV3Quote };

