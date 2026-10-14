"use strict";

// Pure validation/normalization for Balancer triangle scan targets.
// No RPC, API, wallet, signer, or transaction activity.

function buildScanTarget({
  name,
  address,
  poolId,
  tokens,
  tokenRegistry,
  startToken = "USDC_E",
  poolType = null,
  balances = null
}) {
  if (!poolId || typeof poolId !== "string") {
    throw new Error("Balancer scan target requires a poolId");
  }

  if (!Array.isArray(tokens) || tokens.length !== 3) {
    throw new Error(
      "Balancer scan target must contain exactly 3 scanner tokens"
    );
  }

  const uniqueTokens = [...new Set(tokens)];

  if (uniqueTokens.length !== 3) {
    throw new Error("Balancer scan target contains duplicate tokens");
  }

  for (const symbol of uniqueTokens) {
    if (!tokenRegistry[symbol]) {
      throw new Error(`Unknown scanner token ${symbol}`);
    }
  }

  if (!uniqueTokens.includes(startToken)) {
    throw new Error(
      `Balancer scan target does not contain ${startToken}`
    );
  }

  const otherTokens =
    uniqueTokens.filter(symbol => symbol !== startToken);

  if (balances !== null) {
    if (!Array.isArray(balances) || balances.length !== 3) {
      throw new Error(
        "Balancer scan target balances must contain exactly 3 entries"
      );
    }
  }

  return Object.freeze({
    name: name || "Dynamic verified Balancer target",
    address: address || null,
    poolId,
    tokens: Object.freeze(uniqueTokens),
    assets: Object.freeze(
      uniqueTokens.map(symbol => tokenRegistry[symbol].address)
    ),
    startToken,
    otherTokens: Object.freeze(otherTokens),
    poolType,
    balances:
      balances === null
        ? null
        : Object.freeze([...balances])
  });
}

module.exports = {
  buildScanTarget
};
