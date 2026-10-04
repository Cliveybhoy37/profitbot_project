"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");
const fs = require("node:fs");
const path = require("node:path");

const {
  HISTORICAL_EXECUTION_GAS_EVIDENCE,
  validateHistoricalExecutionGasEvidence
} = require("../scripts/utils/polygonV4HistoricalExecutionGasEvidence");

const { encodeV4ExecutionPlan } = require("../scripts/utils/polygonV4ExecutionRoute");
const { validateForkReceiptGasEvidence } = require("../scripts/utils/polygonV4ForkReceiptGasEvidence");

test("exports exact closed 1S.8 historical evidence identity", () => {
  const evidence = HISTORICAL_EXECUTION_GAS_EVIDENCE;

  assert.ok(evidence);
  assert.equal(evidence.observationBlock, 94709817);
  assert.equal(evidence.provenance.measurementBlock, 94709817);
  assert.equal(evidence.provenance.method, "FORK_RECEIPT");
  assert.equal(evidence.loanAmount.toString(), "125000000000000000");
  assert.equal(evidence.gasUnits.toString(), "652106");
  assert.equal(evidence.executionPlanHash, "0xf3dddb908db797d2732935ea25dfb48215c98ef85587ac012c2ba1093b94e009");
  assert.equal(evidence.executorContext.executorCodeHash, "0x347dca910e2d4b7dd6b4ba19151fc2cd28e33c268cbb38511169a0b4a753facc");
});


test("contains complete historical executor and loan identity", () => {
  const e = HISTORICAL_EXECUTION_GAS_EVIDENCE;
  assert.equal(e.loanToken, "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270");
  assert.equal(e.executorContext.v3Router, "0xE592427A0AEce92De3Edee1F18E0157C05861564");
  assert.equal(e.executorContext.v4Router, "0xDc264714F68d84CF29BC605589405E78bDBE7C9f");
  assert.equal(e.executorContext.permit2, "0x000000000022D473030F116dDEE9F6B43aC78BA3");
  assert.equal(e.executorContext.aaveProvider, "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb");
  assert.equal(e.executorContext.aavePool, "0x5342C2c22B65A4cC0C06A34B085c72C4029F66c5");
  assert.ok(Array.isArray(e.executionLegs));
  assert.equal(e.executionLegs.length, 3);
});


test("contains exact independently reconstructed historical execution-plan identity", () => {
  const e = HISTORICAL_EXECUTION_GAS_EVIDENCE;

  assert.equal(e.executionDeadline, 1790770167);
  assert.equal(
    e.minimumProfit.toString(),
    "5000000000000000"
  );
});


test("reconstructs the closed 1S.8 plan and passes the real fork-receipt validator", () => {
  const e = HISTORICAL_EXECUTION_GAS_EVIDENCE;

  const executionPlan = encodeV4ExecutionPlan({
    legs: e.executionLegs,
    deadline: e.executionDeadline,
    minimumProfit: e.minimumProfit
  });

  assert.equal(
    ethers.utils.keccak256(executionPlan),
    e.executionPlanHash
  );

  const validated = validateForkReceiptGasEvidence({
    candidate: {
      blockTag: e.observationBlock,
      amountIn: e.loanAmount
    },
    executionLegs: e.executionLegs,
    executionPlan,
    evidence: e
  });

  assert.equal(validated.observationBlock, 94709817);
  assert.equal(validated.gasUnits.toString(), "652106");
  assert.equal(validated.executionPlanHash, e.executionPlanHash);
});


test("exports structurally immutable historical evidence", () => {
  const e = HISTORICAL_EXECUTION_GAS_EVIDENCE;

  assert.equal(Object.isFrozen(e), true);
  assert.equal(Object.isFrozen(e.executionLegs), true);
  assert.equal(
    e.executionLegs.every(Object.isFrozen),
    true
  );
  assert.equal(Object.isFrozen(e.executorContext), true);
  assert.equal(Object.isFrozen(e.provenance), true);

  assert.throws(
    () => {
      e.observationBlock = 1;
    },
    TypeError
  );

  assert.throws(
    () => {
      e.executionLegs[0].tokenIn =
        ethers.constants.AddressZero;
    },
    TypeError
  );
});


test("fails closed for altered historical candidate amount or block", () => {
  const e = HISTORICAL_EXECUTION_GAS_EVIDENCE;

  const executionPlan = encodeV4ExecutionPlan({
    legs: e.executionLegs,
    deadline: e.executionDeadline,
    minimumProfit: e.minimumProfit
  });

  const validateCandidate = candidate =>
    validateForkReceiptGasEvidence({
      candidate,
      executionLegs: e.executionLegs,
      executionPlan,
      evidence: e
    });

  assert.throws(
    () =>
      validateCandidate({
        blockTag: e.observationBlock,
        amountIn: e.loanAmount.add(1)
      })
  );

  assert.throws(
    () =>
      validateCandidate({
        blockTag: e.observationBlock + 1,
        amountIn: e.loanAmount
      })
  );
});


test("fails closed for altered leg or execution plan while generic validation alone does not bind executor identity", () => {
  const e = HISTORICAL_EXECUTION_GAS_EVIDENCE;

  const executionPlan = encodeV4ExecutionPlan({
    legs: e.executionLegs,
    deadline: e.executionDeadline,
    minimumProfit: e.minimumProfit
  });

  const candidate = {
    blockTag: e.observationBlock,
    amountIn: e.loanAmount
  };

  const alteredLegs = e.executionLegs.map(
    (leg, index) =>
      index === 0
        ? {
            ...leg,
            minAmountOut:
              leg.minAmountOut.add(1)
          }
        : leg
  );

  assert.throws(
    () =>
      validateForkReceiptGasEvidence({
        candidate,
        executionLegs: alteredLegs,
        executionPlan,
        evidence: e
      })
  );

  const alteredPlan = encodeV4ExecutionPlan({
    legs: e.executionLegs,
    deadline: e.executionDeadline + 1,
    minimumProfit: e.minimumProfit
  });

  assert.throws(
    () =>
      validateForkReceiptGasEvidence({
        candidate,
        executionLegs: e.executionLegs,
        executionPlan: alteredPlan,
        evidence: e
      }),
    /execution plan mismatch/i
  );

  const alteredEvidence = {
    ...e,
    executorContext: {
      ...e.executorContext,
      executorCodeHash:
        "0x" + "11".repeat(32)
    }
  };

  const validatedAlteredContext =
    validateForkReceiptGasEvidence({
      candidate,
      executionLegs: e.executionLegs,
      executionPlan,
      evidence: alteredEvidence
    });

  assert.notEqual(
    validatedAlteredContext.executorContext.executorCodeHash,
    e.executorContext.executorCodeHash
  );
});


test("historical binding rejects every altered canonical executor identity field", () => {
  const e = HISTORICAL_EXECUTION_GAS_EVIDENCE;

  const executionPlan = encodeV4ExecutionPlan({
    legs: e.executionLegs,
    deadline: e.executionDeadline,
    minimumProfit: e.minimumProfit
  });

  const candidate = {
    blockTag: e.observationBlock,
    amountIn: e.loanAmount
  };

  const replacements = {
    executorCodeHash: "0x" + "11".repeat(32),
    v3Router: "0x0000000000000000000000000000000000000011",
    v4Router: "0x0000000000000000000000000000000000000012",
    permit2: "0x0000000000000000000000000000000000000013",
    aaveProvider: "0x0000000000000000000000000000000000000014",
    aavePool: "0x0000000000000000000000000000000000000015"
  };

  for (const [field, replacement] of Object.entries(replacements)) {
    const alteredEvidence = {
      ...e,
      executorContext: {
        ...e.executorContext,
        [field]: replacement
      }
    };

    assert.throws(
      () =>
        validateHistoricalExecutionGasEvidence({
          candidate,
          executionLegs: e.executionLegs,
          executionPlan,
          evidence: alteredEvidence
        }),
      /historical executor identity mismatch/i,
      field
    );
  }
});


test("historical artifact has no runtime acquisition, broadcast, or 700000 policy contamination", () => {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "../scripts/utils/polygonV4HistoricalExecutionGasEvidence.js"
    ),
    "utf8"
  );

  const forbidden = [
    "700000",
    "JsonRpcProvider",
    "WebSocketProvider",
    "hardhat_reset",
    "getBlock(",
    "getBlockNumber(",
    "getGasPrice(",
    "getSigners(",
    "new ethers.Wallet",
    "sendTransaction(",
    "initiateFlashloan("
  ];

  for (const token of forbidden) {
    assert.equal(
      source.includes(token),
      false,
      token
    );
  }
});
