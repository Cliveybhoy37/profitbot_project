"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  selectSupportedEdgeOrientations
} = require("../scripts/utils/polygonBalancerEdgeResearch");

const TOKEN_A = {
  address: "0x0000000000000000000000000000000000000001",
  symbol: "A"
};

const TOKEN_B = {
  address: "0x0000000000000000000000000000000000000002",
  symbol: "B"
};

const edge = {
  tokenA: TOKEN_A,
  tokenB: TOKEN_B
};

test("selectSupportedEdgeOrientations keeps forward-only support", () => {
  const evidence = new Map([
    [TOKEN_A.address.toLowerCase(), { hasEntry: true, hasExit: false }],
    [TOKEN_B.address.toLowerCase(), { hasEntry: false, hasExit: true }]
  ]);

  assert.deepEqual(
    selectSupportedEdgeOrientations({ edge, evidence }),
    [0]
  );
});

test("selectSupportedEdgeOrientations keeps reverse-only support", () => {
  const evidence = new Map([
    [TOKEN_A.address.toLowerCase(), { hasEntry: false, hasExit: true }],
    [TOKEN_B.address.toLowerCase(), { hasEntry: true, hasExit: false }]
  ]);

  assert.deepEqual(
    selectSupportedEdgeOrientations({ edge, evidence }),
    [1]
  );
});

test("selectSupportedEdgeOrientations rejects unsupported edge", () => {
  const evidence = new Map([
    [TOKEN_A.address.toLowerCase(), { hasEntry: false, hasExit: false }],
    [TOKEN_B.address.toLowerCase(), { hasEntry: false, hasExit: false }]
  ]);

  assert.deepEqual(
    selectSupportedEdgeOrientations({ edge, evidence }),
    []
  );
});
