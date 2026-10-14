"use strict";

// Pure research-priority helpers for verified Balancer discovery results.
// These functions do not perform RPC calls or transactions.

const SUPPORTED_TYPES = new Set(["WEIGHTED", "STABLE"]);

function toLiquidity(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function blocksSinceChange(snapshotBlock, lastChangeBlock) {
  const snapshot = Number(snapshotBlock);
  const changed = Number(lastChangeBlock);

  if (
    !Number.isSafeInteger(snapshot) ||
    !Number.isSafeInteger(changed) ||
    snapshot < changed
  ) {
    return null;
  }

  return snapshot - changed;
}

function classifyCandidate(candidate) {
  const liquidity = toLiquidity(candidate.liquidity);
  const age = candidate.blocksSinceChange;
  const supportedType = SUPPORTED_TYPES.has(candidate.type);
  const triangleCount = Number(candidate.triangleCount || 0);

  const reasons = [];

  if (!supportedType) reasons.push("unsupported-pool-type");
  if (triangleCount < 1) reasons.push("no-verified-triangle");
  if (liquidity < 1000) reasons.push("very-low-liquidity");

  if (age === null || age === undefined) {
    reasons.push("unknown-activity-age");
  } else if (age > 1_000_000) {
    reasons.push("very-old-last-change");
  }

  let priority = "NORMAL";

  if (!supportedType || triangleCount < 1) {
    priority = "REVIEW";
  } else if (
    liquidity >= 5000 &&
    age !== null &&
    age !== undefined &&
    age <= 10000
  ) {
    priority = "HIGH";
  } else if (
    liquidity < 1000 ||
    (age !== null && age !== undefined && age > 1_000_000)
  ) {
    priority = "LOW";
  }

  return {
    ...candidate,
    liquidity,
    supportedType,
    priority,
    reasons
  };
}

function rankCandidates(candidates) {
  const order = {
    HIGH: 0,
    NORMAL: 1,
    LOW: 2,
    REVIEW: 3
  };

  return candidates
    .map(classifyCandidate)
    .sort((a, b) => {
      const priorityDifference =
        order[a.priority] - order[b.priority];

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return b.liquidity - a.liquidity;
    });
}

module.exports = {
  SUPPORTED_TYPES,
  toLiquidity,
  blocksSinceChange,
  classifyCandidate,
  rankCandidates
};
