"use strict";

const { ethers } = require("ethers");

const PROTECTED_QUALIFICATION_RUNTIME_POLICY =
  Object.freeze({
    chainId: 137,

    route: Object.freeze({
      startToken:
        "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      entryToken:
        "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
      exitToken:
        "0xA3f751662e282E83EC3cBc387d225Ca56dD63D3A"
    }),

    qualification: Object.freeze({
      slippageBps: 50,
      maxSlippageBps: 100,
      maxAgeBlocks: 3,
      deadlineSeconds: 300,

      policyGasUnits:
        ethers.BigNumber.from("700000"),

      safetyReserveWei:
        ethers.utils.parseEther("0.001"),

      minimumNetProfitWei:
        ethers.utils.parseEther("0.005")
    }),

    operational: Object.freeze({
      count: 2,
      minimumBlockGap: 1,
      maxAttempts: 3,
      maxCycles: 2,
      waitMs: 5000
    }),

    provenance: Object.freeze({
      policyGasUnits:
        "CONSERVATIVE_QUALIFICATION_POLICY",
      executionGasEvidence:
        "REQUIRED_SEPARATELY"
    })
  });

module.exports = {
  PROTECTED_QUALIFICATION_RUNTIME_POLICY
};
