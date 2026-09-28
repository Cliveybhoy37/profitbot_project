"use strict";

const SUPPORTED_BALANCER_EDGE_POOL_TYPES = new Set([
  "WEIGHTED",
  "STABLE"
]);

function buildBalancerEdgeCycleOrientations({ edge, startToken }) {
  if (!edge || !edge.tokenA || !edge.tokenB) {
    throw new Error("Verified Balancer edge required");
  }

  if (!startToken || !startToken.address) {
    throw new Error("Start token required");
  }

  if (!SUPPORTED_BALANCER_EDGE_POOL_TYPES.has(edge.poolType)) {
    throw new Error(`Unsupported Balancer pool type: ${edge.poolType}`);
  }

  const startAddress = startToken.address.toLowerCase();
  const tokenAAddress = edge.tokenA.address.toLowerCase();
  const tokenBAddress = edge.tokenB.address.toLowerCase();

  if (
    startAddress === tokenAAddress ||
    startAddress === tokenBAddress
  ) {
    throw new Error("Start token must be outside the Balancer edge");
  }

  const buildCycle = (entryToken, exitToken) => ({
    poolId: edge.poolId,
    poolAddress: edge.poolAddress,
    poolName: edge.poolName,
    poolType: edge.poolType,
    liquidity: edge.liquidity,
    poolAssets: edge.poolAssets,
    balancesByAddress: edge.balancesByAddress,
    legs: [
      {
        role: "ENTRY",
        tokenIn: startToken,
        tokenOut: entryToken
      },
      {
        role: "BALANCER",
        tokenIn: entryToken,
        tokenOut: exitToken
      },
      {
        role: "EXIT",
        tokenIn: exitToken,
        tokenOut: startToken
      }
    ]
  });

  return [
    buildCycle(edge.tokenA, edge.tokenB),
    buildCycle(edge.tokenB, edge.tokenA)
  ];
}

module.exports = {
  buildBalancerEdgeCycleOrientations
};
