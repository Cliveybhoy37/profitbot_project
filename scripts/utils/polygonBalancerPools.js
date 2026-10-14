"use strict";

// Curated Balancer V2 Polygon pools for read-only discovery.
// Pool contracts must still be validated against the Balancer Vault
// before being trusted for quote generation.

const tokens = require("./polygonScannerTokens");

module.exports = Object.freeze({
  TRICRYPTO: Object.freeze({
    name: "Balancer Polygon Tricrypto",
    address: "0x03cd191f589d12b0582a99808cf19851e468e6b5",
    poolId:
      "0x03cd191f589d12b0582a99808cf19851e468e6b500010000000000000000000a",
    type: "WEIGHTED",
    tokens: Object.freeze([
      "WBTC",
      "USDC_E",
      "WETH"
    ])
  }),

  BASE_POOL: Object.freeze({
    name: "Balancer Polygon Base Pool",
    address: "0x0297e37f1873d2dab4487aa67cd56b58e2f27875",
    poolId:
      "0x0297e37f1873d2dab4487aa67cd56b58e2f27875000100000000000000000002",
    type: "WEIGHTED",
    tokens: Object.freeze([
      "WPOL",
      "USDC_E",
      "WETH"
    ])
  }),

  TRUSTBAR: Object.freeze({
    name: "Trustbar Bitcoin Weth Usdc Pool",
    address: "0x702605f43471183158938c1a3e5f5a359d7b31ba",
    poolId:
      "0x702605f43471183158938c1a3e5f5a359d7b31ba00010000000000000000004a",
    type: "WEIGHTED",
    tokens: Object.freeze([
      "WBTC",
      "USDC_E",
      "WETH"
    ])
  }),

  STABLE_POOL: Object.freeze({
    name: "Balancer Polygon Stable Pool",
    address: "0x06df3b2bbb68adc8b0e302443692037ed9f91b42",
    poolId:
      "0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000012",
    type: "STABLE",
    tokens: Object.freeze([
      "USDC_E",
      "DAI"
    ])
  })
});

// Fail immediately if a registry entry references an unknown scanner token.
for (const pool of Object.values(module.exports)) {
  for (const symbol of pool.tokens) {
    if (!tokens[symbol]) {
      throw new Error(
        `Balancer pool ${pool.name} references unknown token ${symbol}`
      );
    }
  }
}
