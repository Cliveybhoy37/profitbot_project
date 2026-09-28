"use strict";

// Read-only external-liquidity research for Polygon.
// No signer, wallet, approvals, or transaction submission.

const venues = require("./polygonScannerVenues");
const {
  getQuote
} = require("./polygonDiscoveryQuotes");

async function probeExternalTokenLiquidity({
  provider,
  blockTag,
  startToken,
  candidateToken,
  amountIn,
  quoteFn = getQuote
}) {
  if (!provider) {
    throw new Error("External liquidity research requires provider");
  }

  if (!Number.isInteger(blockTag) || blockTag <= 0) {
    throw new Error("External liquidity research requires pinned block");
  }

  if (!startToken?.address || !candidateToken?.address) {
    throw new Error("External liquidity research requires token addresses");
  }

  if (!amountIn || typeof amountIn.lte !== "function" || amountIn.lte(0)) {
    throw new Error("External liquidity research requires positive amount");
  }

  const entryVenues = [];
  const exitVenues = [];

  for (const venueName of Object.keys(venues)) {
    let entry = null;
    let exit = null;

    try {
      entry = await quoteFn(
        venueName,
        [startToken.address, candidateToken.address],
        amountIn,
        provider,
        blockTag
      );
    } catch (_) {
      entry = null;
    }

    try {
      exit = await quoteFn(
        venueName,
        [candidateToken.address, startToken.address],
        amountIn,
        provider,
        blockTag
      );
    } catch (_) {
      exit = null;
    }

    if (entry?.amountOut && entry.amountOut.gt(0)) {
      entryVenues.push(venueName);
    }

    if (exit?.amountOut && exit.amountOut.gt(0)) {
      exitVenues.push(venueName);
    }
  }

  return {
    token: candidateToken,
    entryVenues,
    exitVenues,
    hasEntry: entryVenues.length > 0,
    hasExit: exitVenues.length > 0,
    hasRoundTripSupport:
      entryVenues.length > 0 && exitVenues.length > 0
  };
}

module.exports = {
  probeExternalTokenLiquidity
};
