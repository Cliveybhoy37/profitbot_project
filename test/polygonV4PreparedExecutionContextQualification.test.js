"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  qualifyPreparedExecutionContext
} = require(
  "../scripts/utils/polygonV4PreparedExecutionContextQualification"
);

function harness() {
  const candidate = {
    blockTag: 94709817,
    amountIn:
      ethers.BigNumber.from(
        "125000000000000000"
      )
  };

  const executionLegs = [
    { id: "leg-1" },
    { id: "leg-2" },
    { id: "leg-3" }
  ];

  const executionPlan =
    ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint256"],
      [
        2000000000,
        ethers.utils.parseEther(
          "0.005"
        )
      ]
    );

  const minimumNetProfitWei =
    ethers.utils.parseEther(
      "0.005"
    );

  const preparedExecutionContext = {
    handoff: {
      id: "exact-handoff"
    },
    candidate,
    executionLegs,
    executionPlan,
    deadline: 2000000000,
    minimumNetProfitWei
  };

  const gasEvidence = {
    id: "exact-gas-evidence"
  };

  const validatedGasEvidence = {
    gasUnits:
      ethers.BigNumber.from(
        "652106"
      )
  };

  const policySnapshot = {
    currentBlock: 94709817,
    gasPriceWei:
      ethers.BigNumber.from(
        "30000000000"
      ),
    premiumBps: 9
  };

  return {
    preparedExecutionContext,
    candidate,
    executionLegs,
    executionPlan,
    minimumNetProfitWei,
    gasEvidence,
    validatedGasEvidence,
    policySnapshot,
    slippageBps: 50,
    maxSlippageBps: 100,
    maxAgeBlocks: 3,
    safetyReserveWei:
      ethers.utils.parseEther(
        "0.001"
      )
  };
}

test(
  "qualifies and preserves the exact prepared execution identity",
  () => {
    const h = harness();

    const preflight = {
      id: "exact-preflight"
    };

    let validationArgs = null;
    let preflightArgs = null;

    const result =
      qualifyPreparedExecutionContext({
        ...h,

        validateForkReceiptGasEvidenceFn:
          args => {
            validationArgs = args;
            return h.validatedGasEvidence;
          },

        preflightObservedV4CandidateFn:
          args => {
            preflightArgs = args;
            return preflight;
          }
      });

    assert.strictEqual(
      validationArgs.candidate,
      h.candidate
    );

    assert.strictEqual(
      validationArgs.executionLegs,
      h.executionLegs
    );

    assert.strictEqual(
      validationArgs.executionPlan,
      h.executionPlan
    );

    assert.strictEqual(
      validationArgs.evidence,
      h.gasEvidence
    );

    assert.strictEqual(
      preflightArgs.candidate,
      h.candidate
    );

    assert.strictEqual(
      preflightArgs.executionLegs,
      h.executionLegs
    );

    assert.strictEqual(
      preflightArgs.requestedAmount,
      h.candidate.amountIn
    );

    assert.strictEqual(
      preflightArgs.estimatedGas,
      h.validatedGasEvidence.gasUnits
    );

    assert.strictEqual(
      preflightArgs.minimumNetProfitWei,
      h.minimumNetProfitWei
    );

    assert.strictEqual(
      result.candidate,
      h.candidate
    );

    assert.strictEqual(
      result.executionLegs,
      h.executionLegs
    );

    assert.strictEqual(
      result.executionPlan,
      h.executionPlan
    );

    assert.strictEqual(
      result.handoff,
      h.preparedExecutionContext.handoff
    );

    assert.equal(
      result.deadline,
      h.preparedExecutionContext.deadline
    );

    assert.strictEqual(
      result.minimumNetProfitWei,
      h.minimumNetProfitWei
    );

    assert.strictEqual(
      result.policySnapshot,
      h.policySnapshot
    );

    assert.strictEqual(
      result.gasEvidence,
      h.gasEvidence
    );

    assert.equal(
      result.qualificationResult.qualified,
      true
    );

    assert.strictEqual(
      result.qualificationResult.preflight,
      preflight
    );
  }
);

test(
  "returns preflight rejection without promoting it to a qualified context",
  () => {
    const h = harness();

    const result =
      qualifyPreparedExecutionContext({
        ...h,

        validateForkReceiptGasEvidenceFn:
          () =>
            h.validatedGasEvidence,

        preflightObservedV4CandidateFn:
          () => {
            throw new Error(
              "Candidate observation is stale"
            );
          }
      });

    assert.equal(
      result.qualified,
      false
    );

    assert.equal(
      result.stage,
      "PREFLIGHT"
    );

    assert.match(
      result.reason,
      /stale/
    );

    assert.equal(
      result.qualificationResult,
      undefined
    );
  }
);

test(
  "propagates exact gas-evidence validation failure without running preflight",
  () => {
    const h = harness();

    const failure =
      new Error(
        "Gas evidence execution plan mismatch"
      );

    let preflightCalls = 0;

    assert.throws(
      () =>
        qualifyPreparedExecutionContext({
          ...h,

          validateForkReceiptGasEvidenceFn:
            () => {
              throw failure;
            },

          preflightObservedV4CandidateFn:
            () => {
              preflightCalls += 1;
            }
        }),
      error => error === failure
    );

    assert.equal(
      preflightCalls,
      0
    );
  }
);

test(
  "rejects invalid authoritative inputs before evidence validation",
  () => {
    const h = harness();

    for (const policySnapshot of [
      null,
      undefined,
      "snapshot"
    ]) {
      let validationCalls = 0;

      assert.throws(
        () =>
          qualifyPreparedExecutionContext({
            ...h,
            policySnapshot,

            validateForkReceiptGasEvidenceFn:
              () => {
                validationCalls += 1;
              }
          }),
        /policySnapshot|Policy snapshot/
      );

      assert.equal(
        validationCalls,
        0
      );
    }
  }
);

test(
  "contains no reconstruction, provider, RPC, fork, signer, transaction, broadcast, or historical-evidence ownership",
  () => {
    const fs = require("node:fs");

    const source =
      fs.readFileSync(
        require.resolve(
          "../scripts/utils/polygonV4PreparedExecutionContextQualification"
        ),
        "utf8"
      );

    const forbidden = [
      /selectProtectedPeakHandoff/,
      /buildObservedV4Candidate/,
      /buildV4ExecutionLegs/,
      /encodeV4ExecutionPlan/,
      /JsonRpcProvider/,
      /getBlock\s*\(/,
      /getBlockNumber\s*\(/,
      /getGasPrice\s*\(/,
      /hardhat_reset/,
      /HISTORICAL_EXECUTION_GAS_EVIDENCE/,
      /getSigners\s*\(/,
      /new\s+ethers\.Wallet/,
      /sendTransaction\s*\(/,
      /\.initiateFlashloan\s*\(/,
      /\.wait\s*\(/,
      /policyGasUnits/
    ];

    for (const pattern of forbidden) {
      assert.equal(
        pattern.test(source),
        false,
        `forbidden production surface: ${pattern}`
      );
    }
  }
);

test(
  "does not accept independent deadline or minimum-profit inputs",
  () => {
    const fs = require("node:fs");

    const source =
      fs.readFileSync(
        require.resolve(
          "../scripts/utils/polygonV4PreparedExecutionContextQualification"
        ),
        "utf8"
      );

    const signature =
      source.slice(
        source.indexOf(
          "function qualifyPreparedExecutionContext"
        ),
        source.indexOf(
          "}) {",
          source.indexOf(
            "function qualifyPreparedExecutionContext"
          )
        ) + 4
      );

    assert.equal(
      /^\s*deadline\s*,/m.test(
        signature
      ),
      false
    );

    assert.equal(
      /^\s*minimumNetProfitWei\s*,/m.test(
        signature
      ),
      false
    );
  }
);
