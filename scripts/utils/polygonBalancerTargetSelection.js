"use strict";

// Pure selection of scan targets from already on-chain-verified
// Balancer discovery results. No RPC, API, wallet, or transaction activity.

const {
  buildScanTarget
} = require("./polygonBalancerScanTarget");

const SUPPORTED_POOL_TYPES = new Set([
  "WEIGHTED",
  "STABLE"
]);

function buildVerifiedScanTargets({
  candidate,
  verification,
  tokenRegistry,
  startToken = "USDC_E"
}) {
  if (!candidate || !verification) {
    throw new Error("Verified Balancer candidate required");
  }

  if (!verification.apiMatchesChain) {
    throw new Error("Balancer candidate failed API/Vault verification");
  }

  if (!SUPPORTED_POOL_TYPES.has(candidate.type)) {
    return [];
  }

  if (!Array.isArray(verification.triangles)) {
    throw new Error("Verified Balancer triangles required");
  }

  return verification.triangles
    .filter(triangle =>
      triangle.includes(startToken)
    )
    .map(triangle =>
      buildScanTarget({
        name: candidate.name,
        address: candidate.address,
        poolId: verification.poolId,
        tokens: triangle,
        tokenRegistry,
        startToken,
        poolType: candidate.type,
        balances: verification.balancesByAddress
          ? triangle.map(symbol =>
              verification.balancesByAddress[
                tokenRegistry[symbol].address.toLowerCase()
              ]
            )
          : null
      })
    );
}

module.exports = {
  SUPPORTED_POOL_TYPES,
  buildVerifiedScanTargets
};
