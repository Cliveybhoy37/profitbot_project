"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { ethers } = require("ethers");

const SUBJECT_PATH =
  "../scripts/utils/polygonV4ControlledTransactionReceiptCompositionEvidence";

const HASH = "0x" + "ab".repeat(32);

test(
  "composes exact 1S.75 submission evidence into established 1S.45 receipt evidence",
  async () => {
    const {
      buildControlledTransactionReceiptCompositionEvidence
    } = require(SUBJECT_PATH);

    const transactionEnvelope = Object.freeze({
      chainId: 137
    });

    const submissionResponse = Object.freeze({
      hash: HASH
    });

    const controlledExactSignedTransactionSubmissionEvidence =
      Object.freeze({
        transactionEnvelope,
        signedRawTransaction: "0x1234",
        signedTransactionHash: HASH,
        submissionResponse,
        controlledExactSignedTransactionSubmissionReady: true,
        signerAuthorized: true,
        signingAuthorized: true,
        broadcastAuthorized: true,
        liveExecutionAuthorized: true
      });

    const controlledExactSignedTransactionSubmissionCompositionEvidence =
      Object.freeze({
        controlledExactSignedTransactionSubmissionEvidence,
        controlledExactSignedTransactionSubmissionCompositionReady: true
      });

    const receipt = Object.freeze({
      transactionHash: HASH,
      status: 1,
      blockNumber: 12345678,
      gasUsed: ethers.BigNumber.from("423817")
    });

    const calls = [];

    const result =
      await buildControlledTransactionReceiptCompositionEvidence({
        controlledExactSignedTransactionSubmissionCompositionEvidence,
        acquireTransactionReceipt: async transactionHash => {
          calls.push(transactionHash);
          return receipt;
        }
      });

    assert.deepEqual(calls, [HASH]);

    assert.equal(
      result.controlledExactSignedTransactionSubmissionCompositionEvidence,
      controlledExactSignedTransactionSubmissionCompositionEvidence
    );

    assert.equal(
      result.controlledTransactionReceiptEvidence
        .controlledExactSignedTransactionSubmissionEvidence,
      controlledExactSignedTransactionSubmissionEvidence
    );

    assert.equal(
      result.controlledTransactionReceiptEvidence.receipt,
      receipt
    );

    assert.equal(
      result.controlledTransactionReceiptEvidence.gasUsed,
      receipt.gasUsed
    );

    assert.equal(
      result.controlledTransactionReceiptEvidence
        .controlledTransactionReceiptReady,
      true
    );

    assert.equal(
      result.controlledTransactionReceiptCompositionReady,
      true
    );

    assert.equal(Object.isFrozen(result), true);
  }
);

function makeReceiptCompositionFixture({
  outerOverrides = {},
  submissionOverrides = {},
  receiptOverrides = {}
} = {}) {
  const signedTransactionHash = HASH;

  const submissionEvidence = Object.freeze({
    transactionEnvelope: Object.freeze({ chainId: 137 }),
    signedRawTransaction: "0x1234",
    signedTransactionHash,
    submissionResponse: Object.freeze({
      hash: signedTransactionHash
    }),
    controlledExactSignedTransactionSubmissionReady: true,
    signerAuthorized: true,
    signingAuthorized: true,
    broadcastAuthorized: true,
    liveExecutionAuthorized: true,
    ...submissionOverrides
  });

  const submissionComposition = Object.freeze({
    controlledExactSignedTransactionSubmissionEvidence:
      submissionEvidence,
    controlledExactSignedTransactionSubmissionCompositionReady:
      true,
    ...outerOverrides
  });

  const receipt = Object.freeze({
    transactionHash: signedTransactionHash,
    status: 1,
    blockNumber: 12345678,
    gasUsed: ethers.BigNumber.from("423817"),
    ...receiptOverrides
  });

  return {
    submissionEvidence,
    submissionComposition,
    receipt
  };
}

test(
  "rejects missing submission composition before receipt acquisition",
  async () => {
    const {
      buildControlledTransactionReceiptCompositionEvidence
    } = require(SUBJECT_PATH);

    let calls = 0;

    await assert.rejects(
      buildControlledTransactionReceiptCompositionEvidence({
        controlledExactSignedTransactionSubmissionCompositionEvidence:
          null,
        acquireTransactionReceipt: async () => {
          calls += 1;
          throw new Error("must not acquire");
        }
      }),
      /composition evidence must be an object/i
    );

    assert.equal(calls, 0);
  }
);

test(
  "rejects incomplete outer composition readiness before receipt acquisition",
  async () => {
    const {
      buildControlledTransactionReceiptCompositionEvidence
    } = require(SUBJECT_PATH);

    const fixture = makeReceiptCompositionFixture({
      outerOverrides: {
        controlledExactSignedTransactionSubmissionCompositionReady:
          false
      }
    });

    let calls = 0;

    await assert.rejects(
      buildControlledTransactionReceiptCompositionEvidence({
        controlledExactSignedTransactionSubmissionCompositionEvidence:
          fixture.submissionComposition,
        acquireTransactionReceipt: async () => {
          calls += 1;
          return fixture.receipt;
        }
      }),
      /composition evidence is not ready/i
    );

    assert.equal(calls, 0);
  }
);

test(
  "rejects missing contained submission evidence before receipt acquisition",
  async () => {
    const {
      buildControlledTransactionReceiptCompositionEvidence
    } = require(SUBJECT_PATH);

    const fixture = makeReceiptCompositionFixture({
      outerOverrides: {
        controlledExactSignedTransactionSubmissionEvidence:
          null
      }
    });

    let calls = 0;

    await assert.rejects(
      buildControlledTransactionReceiptCompositionEvidence({
        controlledExactSignedTransactionSubmissionCompositionEvidence:
          fixture.submissionComposition,
        acquireTransactionReceipt: async () => {
          calls += 1;
          return fixture.receipt;
        }
      }),
      /submission evidence must be an object/i
    );

    assert.equal(calls, 0);
  }
);

test(
  "rejects incomplete contained submission readiness before receipt acquisition",
  async () => {
    const {
      buildControlledTransactionReceiptCompositionEvidence
    } = require(SUBJECT_PATH);

    const fixture = makeReceiptCompositionFixture({
      submissionOverrides: {
        controlledExactSignedTransactionSubmissionReady: false
      }
    });

    let calls = 0;

    await assert.rejects(
      buildControlledTransactionReceiptCompositionEvidence({
        controlledExactSignedTransactionSubmissionCompositionEvidence:
          fixture.submissionComposition,
        acquireTransactionReceipt: async () => {
          calls += 1;
          return fixture.receipt;
        }
      }),
      /submission evidence is not ready/i
    );

    assert.equal(calls, 0);
  }
);

test(
  "rejects missing receipt acquisition capability",
  async () => {
    const {
      buildControlledTransactionReceiptCompositionEvidence
    } = require(SUBJECT_PATH);

    const fixture = makeReceiptCompositionFixture();

    await assert.rejects(
      buildControlledTransactionReceiptCompositionEvidence({
        controlledExactSignedTransactionSubmissionCompositionEvidence:
          fixture.submissionComposition,
        acquireTransactionReceipt: null
      }),
      /acquireTransactionReceipt function required/i
    );
  }
);

test(
  "propagates receipt acquisition failure after exactly one invocation",
  async () => {
    const {
      buildControlledTransactionReceiptCompositionEvidence
    } = require(SUBJECT_PATH);

    const fixture = makeReceiptCompositionFixture();
    let calls = 0;

    await assert.rejects(
      buildControlledTransactionReceiptCompositionEvidence({
        controlledExactSignedTransactionSubmissionCompositionEvidence:
          fixture.submissionComposition,
        acquireTransactionReceipt: async transactionHash => {
          calls += 1;
          assert.equal(transactionHash, HASH);
          throw new Error("synthetic receipt acquisition failure");
        }
      }),
      /synthetic receipt acquisition failure/
    );

    assert.equal(calls, 1);
  }
);

test(
  "rejects mismatched receipt hash without producing composition readiness",
  async () => {
    const {
      buildControlledTransactionReceiptCompositionEvidence
    } = require(SUBJECT_PATH);

    const fixture = makeReceiptCompositionFixture({
      receiptOverrides: {
        transactionHash: "0x" + "cd".repeat(32)
      }
    });

    let calls = 0;

    await assert.rejects(
      buildControlledTransactionReceiptCompositionEvidence({
        controlledExactSignedTransactionSubmissionCompositionEvidence:
          fixture.submissionComposition,
        acquireTransactionReceipt: async transactionHash => {
          calls += 1;
          assert.equal(transactionHash, HASH);
          return fixture.receipt;
        }
      }),
      /receipt transaction hash must match signedTransactionHash/i
    );

    assert.equal(calls, 1);
  }
);

test(
  "rejects reverted receipt without producing composition readiness",
  async () => {
    const {
      buildControlledTransactionReceiptCompositionEvidence
    } = require(SUBJECT_PATH);

    const fixture = makeReceiptCompositionFixture({
      receiptOverrides: { status: 0 }
    });

    let calls = 0;

    await assert.rejects(
      buildControlledTransactionReceiptCompositionEvidence({
        controlledExactSignedTransactionSubmissionCompositionEvidence:
          fixture.submissionComposition,
        acquireTransactionReceipt: async () => {
          calls += 1;
          return fixture.receipt;
        }
      }),
      /successful transaction receipt status required/i
    );

    assert.equal(calls, 1);
  }
);

test(
  "preserves exact receipt gasUsed and invokes acquisition only once",
  async () => {
    const {
      buildControlledTransactionReceiptCompositionEvidence
    } = require(SUBJECT_PATH);

    const fixture = makeReceiptCompositionFixture();
    const calls = [];

    const result =
      await buildControlledTransactionReceiptCompositionEvidence({
        controlledExactSignedTransactionSubmissionCompositionEvidence:
          fixture.submissionComposition,
        acquireTransactionReceipt: async transactionHash => {
          calls.push(transactionHash);
          return fixture.receipt;
        }
      });

    assert.deepEqual(calls, [HASH]);

    assert.equal(
      result.controlledTransactionReceiptEvidence.gasUsed,
      fixture.receipt.gasUsed
    );

    assert.equal(
      result.controlledTransactionReceiptEvidence.receipt,
      fixture.receipt
    );

    assert.equal(
      result.controlledTransactionReceiptEvidence
        .controlledExactSignedTransactionSubmissionEvidence,
      fixture.submissionEvidence
    );

    assert.equal(
      result.controlledTransactionReceiptCompositionReady,
      true
    );

    assert.equal(Object.isFrozen(result), true);
  }
);
