"use strict";

// Read-only quote abstraction for Polygon opportunity discovery.
// This module has no signer, wallet, approvals, or transaction submission.

const { ethers } = require("ethers");
const venues = require("./polygonScannerVenues");
const { getUniswapV3Quote } = require("./uniswapV3Quote");

const V2_ROUTER_ABI = [
  "function getAmountsOut(uint256 amountIn,address[] path) view returns(uint256[] amounts)"
];

function makeV2Router(address, provider) {
  return new ethers.Contract(address, V2_ROUTER_ABI, provider);
}

async function getV2Quote(venueName, path, amountIn, provider) {
  const venue = venues[venueName];

  if (!venue || venue.type !== "V2") {
    throw new Error(`Unsupported V2 venue: ${venueName}`);
  }

  if (!Array.isArray(path) || path.length !== 2) return null;
  if (!provider || !amountIn || amountIn.lte(0)) return null;

  try {
    const router = makeV2Router(venue.router, provider);
    const amounts = await router.getAmountsOut(amountIn, path);
    const amountOut = amounts[amounts.length - 1];

    return {
      venue: venueName,
      type: "V2",
      amountOut,
      fee: null,
      pool: null
    };
  } catch (_) {
    return null;
  }
}

async function getQuote(venueName, path, amountIn, provider) {
  if (venueName === "UNISWAP_V3") {
    const quote = await getUniswapV3Quote(path, amountIn, provider);

    if (!quote || !quote.amountOut || quote.amountOut.lte(0)) {
      return null;
    }

    return {
      venue: venueName,
      type: "V3",
      amountOut: quote.amountOut,
      fee: quote.fee,
      pool: quote.pool
    };
  }

  return getV2Quote(venueName, path, amountIn, provider);
}

module.exports = {
  getQuote,
  getV2Quote,
  V2_ROUTER_ABI
};
