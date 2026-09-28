"use strict";

const {
  probeExternalTokenLiquidity
} = require("./polygonExternalLiquidityResearch");

// Research helpers for pruning Balancer edge orientations.
// External-liquidity collection is read-only and may perform provider quotes.
// No signer, wallet, approval, or transaction activity.

function selectSupportedEdgeOrientations({ edge, evidence }) {
  if (!edge?.tokenA?.address || !edge?.tokenB?.address) {
    throw new Error("Balancer edge tokens required");
  }

  if (!(evidence instanceof Map)) {
    throw new Error("External liquidity evidence map required");
  }

  const tokenA = evidence.get(edge.tokenA.address.toLowerCase());
  const tokenB = evidence.get(edge.tokenB.address.toLowerCase());

  if (!tokenA || !tokenB) {
    return [];
  }

  const supported = [];

  if (tokenA.hasEntry && tokenB.hasExit) {
    supported.push(0);
  }

  if (tokenB.hasEntry && tokenA.hasExit) {
    supported.push(1);
  }

  return supported;
}

function collectUniqueEdgeTokens(edges) {
  if (!Array.isArray(edges)) {
    throw new Error("Balancer edges must be an array");
  }

  const tokensByAddress = new Map();

  for (const edge of edges) {
    for (const token of [edge?.tokenA, edge?.tokenB]) {
      if (!token?.address) {
        continue;
      }

      const address = token.address.toLowerCase();

      if (!tokensByAddress.has(address)) {
        tokensByAddress.set(address, token);
      }
    }
  }

  return [...tokensByAddress.values()];
}

async function collectExternalLiquidityEvidence({
  tokens,
  provider,
  blockTag,
  startToken,
  amountIn,
  probeFn = probeExternalTokenLiquidity
}) {
  if (!Array.isArray(tokens)) {
    throw new Error("Balancer edge research tokens must be an array");
  }

  const evidence = new Map();

  for (const token of tokens) {
    const result = await probeFn({
      provider,
      blockTag,
      startToken,
      candidateToken: token,
      amountIn
    });

    evidence.set(token.address.toLowerCase(), result);
  }

  return evidence;
}

module.exports = {
  selectSupportedEdgeOrientations,
  collectUniqueEdgeTokens,
  collectExternalLiquidityEvidence
};
