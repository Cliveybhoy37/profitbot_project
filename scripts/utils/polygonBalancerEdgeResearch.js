"use strict";

// Pure research helper for pruning Balancer edge orientations.
// Consumes previously collected external-liquidity evidence.
// No provider, signer, wallet, quote, or transaction activity.

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

module.exports = {
  selectSupportedEdgeOrientations
};
