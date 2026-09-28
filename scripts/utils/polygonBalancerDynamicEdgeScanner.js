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

        candidates.push(...results);
      } catch (_) {
        continue;
      }
    }
  }

  return {
    ...discovery,
    candidates
  };
}

module.exports = {
  scanDynamicBalancerEdges
};
