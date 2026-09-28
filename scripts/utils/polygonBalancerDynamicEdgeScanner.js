"use strict";

const { ethers } = require("ethers");

const {
  discoverDynamicVerifiedEdges
} = require("./polygonBalancerDiscovery");
const {
  buildBalancerEdgeCycleOrientations
} = require("./polygonBalancerEdgeCycles");
const {
  evaluateBalancerEdgeCombinations
} = require("./polygonBalancerEdgeCombinations");
const {
  flashloanAdjustedResearchEconomics
} = require("./polygonNetEconomics");

async function scanDynamicBalancerEdges({
  provider,
  blockTag,
  startToken,
  amountIn,
  premiumBps,
  candidateFilterFn,
  orientationEvidence,
  selectOrientations,
  discoverEdges = discoverDynamicVerifiedEdges,
  buildOrientations = buildBalancerEdgeCycleOrientations,
  evaluateCombinations = evaluateBalancerEdgeCombinations
}) {
  const discovery = await discoverEdges({
    provider,
    blockTag,
    candidateFilterFn
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

    const selectedOrientations = selectOrientations
      ? selectOrientations({ edge, evidence: orientationEvidence })
          .map(index => orientations[index])
          .filter(Boolean)
      : orientations;

    for (const cycle of selectedOrientations) {
      try {
        const results = await evaluateCombinations({
          cycle,
          amountIn,
          provider,
          blockTag
        });

        for (const result of results) {
          const grossDelta = result.amountOut.sub(result.amountIn);
          const candidate = {
            ...result,
            cycle,
            grossDelta
          };

          if (premiumBps !== undefined) {
            const economics = flashloanAdjustedResearchEconomics({
              startAmount: BigInt(result.amountIn.toString()),
              finalAmount: BigInt(result.amountOut.toString()),
              premiumBps
            });

            candidate.flashloanFee = ethers.BigNumber.from(
              economics.flashloanFee.toString()
            );
            candidate.gasBudget = ethers.BigNumber.from(
              economics.gasBudget.toString()
            );
            candidate.coversFlashloanFee = economics.coversFlashloanFee;
          }

          candidates.push(candidate);
        }
      } catch (_) {
        continue;
      }
    }
  }

  const positiveCandidates = candidates.filter(
    candidate => candidate.grossDelta.gt(0)
  );

  const premiumCoveredCandidates = candidates.filter(
    candidate => candidate.coversFlashloanFee === true
  );

  return {
    ...discovery,
    candidates,
    positiveCandidates,
    premiumCoveredCandidates
  };
}

module.exports = {
  scanDynamicBalancerEdges
};
