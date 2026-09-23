"use strict";

// Explicit Polygon token registry for read-only opportunity discovery.
// Do not collapse USDC_NATIVE and USDC_E: they are different contracts.

module.exports = Object.freeze({
  USDC_NATIVE: Object.freeze({
    address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    decimals: 6
  }),
  USDC_E: Object.freeze({
    address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    decimals: 6
  }),
  WPOL: Object.freeze({
    address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    decimals: 18
  }),
  DAI: Object.freeze({
    address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    decimals: 18
  }),
  WETH: Object.freeze({
    address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    decimals: 18
  }),
  WBTC: Object.freeze({
    address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
    decimals: 8
  })
});
