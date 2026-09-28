"use strict";

const VENUES = require("./polygonScannerVenues");
const {
  evaluateBalancerEdgeCycle
} = require("./polygonBalancerEdgeEvaluator");

const EXTERNAL_VENUES = Object.freeze(Object.keys(VENUES));

async function evaluateBalancerEdgeCombinations({
  cycle,
  amountIn,
  provider,
  blockTag,
  evaluateCycle = evaluateBalancerEdgeCycle
}) {
  const results = [];

  for (const entryVenue of EXTERNAL_VENUES) {
    for (const exitVenue of EXTERNAL_VENUES) {
      const result = await evaluateCycle({
        cycle,
        amountIn,
        entryVenue,
        exitVenue,
        provider,
        blockTag
      });

      if (result) {
        results.push({
          entryVenue,
          exitVenue,
          ...result
        });
      }
    }
  }

  return results;
}

module.exports = {
  EXTERNAL_VENUES,
  evaluateBalancerEdgeCombinations
};
