"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  toLiquidity,
  blocksSinceChange,
  classifyCandidate,
  rankCandidates
} = require("../scripts/utils/polygonBalancerCandidateRanking");

test("liquidity normalization rejects invalid values", () => {
  assert.equal(toLiquidity("5907.79"), 5907.79);
  assert.equal(toLiquidity(-1), 0);
  assert.equal(toLiquidity("not-a-number"), 0);
});

test("block activity age is calculated safely", () => {
  assert.equal(blocksSinceChange(10000, 9400), 600);
  assert.equal(blocksSinceChange(9400, 10000), null);
  assert.equal(blocksSinceChange("bad", 9000), null);
});

test("recent liquid supported pool is high research priority", () => {
  const result = classifyCandidate({
    name: "Recent Pool",
    type: "WEIGHTED",
    liquidity: 5907.79,
    blocksSinceChange: 615,
    triangleCount: 1
  });

  assert.equal(result.priority, "HIGH");
  assert.equal(result.supportedType, true);
  assert.deepEqual(result.reasons, []);
});

test("thin pool remains visible but receives low priority", () => {
  const result = classifyCandidate({
    name: "Thin Pool",
    type: "WEIGHTED",
    liquidity: 960.25,
    blocksSinceChange: 68068,
    triangleCount: 1
  });

  assert.equal(result.priority, "LOW");
  assert.ok(result.reasons.includes("very-low-liquidity"));
});

test("very stale pool remains visible but receives low priority", () => {
  const result = classifyCandidate({
    name: "Stale Pool",
    type: "WEIGHTED",
    liquidity: 1756.95,
    blocksSinceChange: 1353629,
    triangleCount: 1
  });

  assert.equal(result.priority, "LOW");
  assert.ok(result.reasons.includes("very-old-last-change"));
});

test("unsupported pool type is flagged for review", () => {
  const result = classifyCandidate({
    name: "Unknown Pool",
    type: "UNKNOWN",
    liquidity: 1253.63,
    blocksSinceChange: 100,
    triangleCount: 4
  });

  assert.equal(result.priority, "REVIEW");
  assert.equal(result.supportedType, false);
  assert.ok(result.reasons.includes("unsupported-pool-type"));
});

test("ranking prioritizes research candidates without deleting others", () => {
  const ranked = rankCandidates([
    {
      name: "Thin",
      type: "WEIGHTED",
      liquidity: 900,
      blocksSinceChange: 100,
      triangleCount: 1
    },
    {
      name: "High",
      type: "WEIGHTED",
      liquidity: 10000,
      blocksSinceChange: 500,
      triangleCount: 1
    },
    {
      name: "Unknown",
      type: "UNKNOWN",
      liquidity: 50000,
      blocksSinceChange: 10,
      triangleCount: 1
    }
  ]);

  assert.equal(ranked.length, 3);
  assert.deepEqual(
    ranked.map(candidate => candidate.name),
    ["High", "Thin", "Unknown"]
  );
});
