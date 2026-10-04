"use strict";

const { ethers } = require("ethers");
const { buildV4ExecutionLegs } = require("./polygonV4ExecutionRoute");
const { validateForkReceiptGasEvidence } = require("./polygonV4ForkReceiptGasEvidence");

const WPOL = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
const DAI = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
const APEPE = "0xA3f751662e282E83EC3cBc387d225Ca56dD63D3A";

const executionLegs = buildV4ExecutionLegs([{ venue: "UNISWAP_V3", tokenIn: WPOL, tokenOut: DAI, amountOut: ethers.BigNumber.from("14481764747850506"), fee: 100 },{ venue: "UNISWAP_V4", tokenIn: DAI, tokenOut: APEPE, amountOut: ethers.BigNumber.from("12592522662788687883109"), poolKey: { currency0: DAI, currency1: APEPE, fee: 10000, tickSpacing: 100, hooks: ethers.constants.AddressZero }, zeroForOne: true },{ venue: "UNISWAP_V3", tokenIn: APEPE, tokenOut: WPOL, amountOut: ethers.BigNumber.from("141808483715718886"), fee: 100 }], 50);

for (const leg of executionLegs) Object.freeze(leg);
Object.freeze(executionLegs);

const HISTORICAL_EXECUTION_GAS_EVIDENCE = Object.freeze({
  observationBlock: 94709817,
  loanToken: WPOL,
  loanAmount: ethers.BigNumber.from("125000000000000000"),
  executionLegs,
  executionDeadline: 1790770167,
  minimumProfit: ethers.utils.parseEther("0.005"),
  gasUnits: ethers.BigNumber.from("652106"),
  executionPlanHash: "0xf3dddb908db797d2732935ea25dfb48215c98ef85587ac012c2ba1093b94e009",
  executorContext: Object.freeze({
    executorCodeHash: "0x347dca910e2d4b7dd6b4ba19151fc2cd28e33c268cbb38511169a0b4a753facc",
    v3Router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    v4Router: "0xDc264714F68d84CF29BC605589405E78bDBE7C9f",
    permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
    aaveProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    aavePool: "0x5342C2c22B65A4cC0C06A34B085c72C4029F66c5"
  }),
  provenance: Object.freeze({
    method: "FORK_RECEIPT",
    measurementBlock: 94709817,
    source: "controlled historical Polygon fork receipt"
  })
});

function validateHistoricalExecutionGasEvidence(args) {
  const validated = validateForkReceiptGasEvidence(args);
  const expected = HISTORICAL_EXECUTION_GAS_EVIDENCE.executorContext;
  const actual = validated.executorContext;
  const fields = [
    "executorCodeHash",
    "v3Router",
    "v4Router",
    "permit2",
    "aaveProvider",
    "aavePool"
  ];

  for (const field of fields) {
    if (actual[field].toLowerCase() !== expected[field].toLowerCase()) {
      throw new Error("Historical executor identity mismatch");
    }
  }

  return validated;
}

module.exports = {
  HISTORICAL_EXECUTION_GAS_EVIDENCE,
  validateHistoricalExecutionGasEvidence
};
