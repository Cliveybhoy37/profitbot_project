"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { ethers } = require("ethers");

const {
  buildControlledTransactionReceiptCompositionEvidence
} = require(
  "../scripts/utils/polygonV4ControlledTransactionReceiptCompositionEvidence"
);

const {
  observeReadOnlyTransactionReceiptEvidence
} = require(
  "../scripts/utils/polygonV4ReadOnlyTransactionReceiptObservationEvidence"
);

const HASH = "0x" + "ab".repeat(32);
const BLOCK_HASH = "0x" + "cd".repeat(32);
const OTHER_HASH = "0x" + "ef".repeat(32);
const GAS_USED = ethers.BigNumber.from("423817");

function makeFixture(overrides = {}) {
  const calls = [];

  const receipt = {
    transactionHash: HASH,
    status: 1,
    blockNumber: 100,
    blockHash: BLOCK_HASH,
    gasUsed: GAS_USED,
    ...overrides.receipt
  };

  const block = {
    number: 100,
    hash: BLOCK_HASH,
    ...overrides.block
  };

  const controlledSubmission =
    Object.freeze({
      transactionEnvelope: Object.freeze({
        chainId: 137
      }),
      signedRawTransaction: "0x1234",
      signedTransactionHash: HASH,
      submissionResponse: Object.freeze({
        hash: HASH
      }),
      controlledExactSignedTransactionSubmissionReady: true,
      signerAuthorized: true,
      signingAuthorized: true,
      broadcastAuthorized: true,
      liveExecutionAuthorized: true
    });

  const controlledSubmissionComposition =
    Object.freeze({
      controlledExactSignedTransactionSubmissionEvidence:
        controlledSubmission,
      controlledExactSignedTransactionSubmissionCompositionReady: true
    });

  const provider = {
    async getNetwork() {
      calls.push("getNetwork");
      return {
        chainId: overrides.chainId ?? 137
      };
    },

    async getTransactionReceipt(hash) {
      calls.push(["getTransactionReceipt", hash]);
      return overrides.missingReceipt ? null : receipt;
    },

    async getBlock(number) {
      calls.push(["getBlock", number]);
      return overrides.missingBlock ? null : block;
    },

    async getBlockNumber() {
      calls.push("getBlockNumber");
      return overrides.head ?? 105;
    }
  };

  return {
    calls,
    receipt,
    provider,
    controlledSubmissionComposition
  };
}

async function validateControlledThenConfirmed(
  fixture,
  minimumConfirmations = 3
) {
  const controlled =
    await buildControlledTransactionReceiptCompositionEvidence({
      controlledExactSignedTransactionSubmissionCompositionEvidence:
        fixture.controlledSubmissionComposition,

      acquireTransactionReceipt: async transactionHash => {
        fixture.calls.push([
          "acquireTransactionReceipt",
          transactionHash
        ]);

        return fixture.receipt;
      }
    });

  const submissionEvidence =
    controlled.controlledTransactionReceiptEvidence;

  assert.equal(
    submissionEvidence.controlledTransactionReceiptReady,
    true
  );

  // Submission evidence alone does not establish confirmation.
  const observed =
    await observeReadOnlyTransactionReceiptEvidence({
      provider: fixture.provider,
      signedTransactionHash:
        submissionEvidence.signedTransactionHash,
      minimumConfirmations
    });

  assert.equal(
    observed.signedTransactionHash,
    submissionEvidence.signedTransactionHash
  );

  assert.equal(
    observed.receipt.transactionHash,
    submissionEvidence.receipt.transactionHash
  );

  assert.equal(
    observed.gasUsed.eq(submissionEvidence.gasUsed),
    true
  );

  return Object.freeze({
    controlled,
    observed,
    confirmed: true
  });
}

test(
  "controlled receipt requires separate Polygon confirmation observation",
  async () => {
    const fixture = makeFixture();

    const result =
      await validateControlledThenConfirmed(fixture);

    assert.equal(result.confirmed, true);
    assert.equal(
      result.controlled.controlledTransactionReceiptCompositionReady,
      true
    );
    assert.equal(
      result.observed.readOnlyTransactionReceiptObservationReady,
      true
    );
    assert.equal(result.observed.chainId, 137);
    assert.equal(result.observed.confirmations, 6);
    assert.equal(result.observed.minimumConfirmations, 3);

    assert.deepEqual(fixture.calls, [
      ["acquireTransactionReceipt", HASH],
      "getNetwork",
      ["getTransactionReceipt", HASH],
      ["getBlock", 100],
      "getBlockNumber"
    ]);
  }
);

test(
  "wrong Polygon chain prevents confirmed result",
  async () => {
    const fixture = makeFixture({
      chainId: 1
    });

    await assert.rejects(
      validateControlledThenConfirmed(fixture),
      /Polygon chain ID 137 required/i
    );

    assert.equal(
      fixture.calls.some(
        call => Array.isArray(call) &&
          call[0] === "getTransactionReceipt"
      ),
      false
    );
  }
);

test(
  "substituted receipt transaction hash fails closed",
  async () => {
    const fixture = makeFixture({
      receipt: {
        transactionHash: OTHER_HASH
      }
    });

    await assert.rejects(
      validateControlledThenConfirmed(fixture),
      /receipt transaction hash/i
    );
  }
);

test(
  "reverted receipt cannot become confirmed",
  async () => {
    const fixture = makeFixture({
      receipt: {
        status: 0
      }
    });

    await assert.rejects(
      validateControlledThenConfirmed(fixture),
      /successful transaction receipt status required/i
    );
  }
);

test(
  "missing observed receipt cannot become confirmed",
  async () => {
    const fixture = makeFixture({
      missingReceipt: true
    });

    await assert.rejects(
      validateControlledThenConfirmed(fixture),
      /transaction receipt object required/i
    );
  }
);

test(
  "noncanonical block hash cannot become confirmed",
  async () => {
    const fixture = makeFixture({
      block: {
        hash: OTHER_HASH
      }
    });

    await assert.rejects(
      validateControlledThenConfirmed(fixture),
      /canonical block hash mismatch/i
    );
  }
);

test(
  "insufficient confirmations cannot become confirmed",
  async () => {
    const fixture = makeFixture({
      head: 101
    });

    await assert.rejects(
      validateControlledThenConfirmed(fixture),
      /insufficient confirmation depth/i
    );
  }
);

test(
  "confirmation policy cannot be zero",
  async () => {
    const fixture = makeFixture();

    await assert.rejects(
      validateControlledThenConfirmed(fixture, 0),
      /minimum confirmations/i
    );
  }
);
