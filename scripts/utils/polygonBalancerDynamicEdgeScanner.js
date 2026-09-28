"use strict";

const {
  discoverDynamicVerifiedEdges
} = require("./polygonBalancerDiscovery");
const {
  buildBalancerEdgeCycleOrientations
} = require("./polygonBalancerEdgeCycles");
const {
  evaluateBalancerEdgeCombinations
} = require("./polygonBalancerEdgeCombinations");

async function scanDynamicBalancerEdges({
  provider,
  blockTag,
  startToken,
  amountIn,
  discoverEdges = discoverDynamicVerifiedEdges,
  buildOrientations = buildBalancerEdgeCycleOrientations,
  evaluateCombinations = evaluateBalancerEdgeCombinations
}) {
  const discovery = await discoverEdges({
    provider,
    blockTag
  });

  const candidates = [];

  for (const edge of discovery.edgeTargets) {
    let orientations;

    try {
      orientations = buildOrientations({
        edge,
        startToken
      });
    } catch (_) {
      continue;
    }

    for (const cycle of orientations) {
      try {
        const results = await evaluateCombinations({
          cycle,
          amountIn,
          provider,
          blockTag
        });

        for (const result of results) {
          candidates.push({
            ...result,
            cycle,
            grossDelta: result.amountOut.sub(result.amountIn)
          });
        }
      } catch (_) {
        continue;
      }
    }
  }

  const positiveCandidates = candidates.filter(
    candidate => candidate.grossDelta.gt(0)
  );

  return {
    ...discovery,
    candidates,
    positiveCandidates
  };
}

module.exports = {
  scanDynamicBalancerEdges
};
