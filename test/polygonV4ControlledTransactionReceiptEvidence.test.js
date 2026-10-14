"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const MODULE_PATH =
  "../scripts/utils/polygonV4ControlledTransactionReceiptEvidence";

function loadModule() {
  return require(MODULE_PATH);
}

const HASH =
  "0xabababababababababababababababababababababababababababababababab";

function makeControlledSubmissionEvidence(
  overrides = {}
) {
  const transactionEnvelope = Object.freeze({
    from:
      "0x1111111111111111111111111111111111111111",
    to:
      "0x2222222222222222222222222222222222222222",
    data: "0x12345678",
    value: 0,
    chainId: 137,
    nonce: 42,
    maxFeePerGas: "50000000000",
    maxPriorityFeePerGas: "3000000000",
    gasLimit: "123456"
  });

  const submissionResponse = Object.freeze({
    hash: HASH
  });

  return Object.freeze({
    transactionEnvelope,
    signedRawTransaction: "0x1234",
    signedTransactionHash: HASH,
    submissionResponse,

    controlledExactSignedTransactionSubmissionReady:
      true,

    signerAuthorized: true,
    signingAuthorized: true,
    broadcastAuthorized: true,
    liveExecutionAuthorized: true,

    ...overrides
  });
}

function makeReceipt(overrides = {}) {
  return Object.freeze({
    transactionHash: HASH,
    blockNumber: 12345678,
    status: 1,
    gasUsed: ethers.BigNumber.from("423817"),
    ...overrides
  });
}

test(
  "acquires the exact submitted transaction receipt once and preserves empirical gasUsed",
  async () => {
    const {
      produceControlledTransactionReceiptEvidence
    } = loadModule();

    const evidence =
      makeControlledSubmissionEvidence();

    const receipt = makeReceipt();
    const calls = [];

    const result =
      await produceControlledTransactionReceiptEvidence({
        controlledExactSignedTransactionSubmissionEvidence:
          evidence,

        acquireTransactionReceipt:
          async transactionHash => {
            calls.push(transactionHash);
            return receipt;
          }
      });

    assert.deepEqual(calls, [HASH]);

    assert.equal(
      result
        .controlledExactSignedTransactionSubmissionEvidence,
      evidence
    );

    assert.equal(
      result.transactionEnvelope,
      evidence.transactionEnvelope
    );

    assert.equal(
      result.signedRawTransaction,
      evidence.signedRawTransaction
    );

    assert.equal(
      result.signedTransactionHash,
      evidence.signedTransactionHash
    );

    assert.equal(
      result.submissionResponse,
      evidence.submissionResponse
    );

    assert.equal(result.receipt, receipt);
    assert.equal(result.gasUsed, receipt.gasUsed);

    assert.equal(
      result.controlledTransactionReceiptReady,
      true
    );

    assert.equal(result.signerAuthorized, true);
    assert.equal(result.signingAuthorized, true);
    assert.equal(result.broadcastAuthorized, true);
    assert.equal(result.liveExecutionAuthorized, true);

    assert.equal(Object.isFrozen(result), true);
  }
);

test(
  "rejects incomplete 1S.44 submission readiness before receipt acquisition",
  async () => {
    const {
      produceControlledTransactionReceiptEvidence
    } = loadModule();

    let calls = 0;

    await assert.rejects(
      produceControlledTransactionReceiptEvidence({
        controlledExactSignedTransactionSubmissionEvidence:
          makeControlledSubmissionEvidence({
            controlledExactSignedTransactionSubmissionReady:
              false
          }),

        acquireTransactionReceipt: async () => {
          calls += 1;
          return makeReceipt();
        }
      }),
      /submission|ready/i
    );

    assert.equal(calls, 0);
  }
);

test(
  "requires all immediate authorization state before receipt acquisition",
  async () => {
    const {
      produceControlledTransactionReceiptEvidence
    } = loadModule();

    for (const field of [
      "signerAuthorized",
      "signingAuthorized",
      "broadcastAuthorized",
      "liveExecutionAuthorized"
    ]) {
      let calls = 0;

      await assert.rejects(
        produceControlledTransactionReceiptEvidence({
          controlledExactSignedTransactionSubmissionEvidence:
            makeControlledSubmissionEvidence({
              [field]: false
            }),

          acquireTransactionReceipt: async () => {
            calls += 1;
            return makeReceipt();
          }
        }),
        /authorized|authorization/i
      );

      assert.equal(calls, 0);
    }
  }
);

test(
  "requires the preserved signed transaction hash and matching submission response",
  async () => {
    const {
      produceControlledTransactionReceiptEvidence
    } = loadModule();

    await assert.rejects(
      produceControlledTransactionReceiptEvidence({
        controlledExactSignedTransactionSubmissionEvidence:
          makeControlledSubmissionEvidence({
            signedTransactionHash: ""
          }),

        acquireTransactionReceipt:
          async () => makeReceipt()
      }),
      /signedTransactionHash|hash/i
    );

    await assert.rejects(
      produceControlledTransactionReceiptEvidence({
        controlledExactSignedTransactionSubmissionEvidence:
          makeControlledSubmissionEvidence({
            submissionResponse: {
              hash:
                "0xcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd"
            }
          }),

        acquireTransactionReceipt:
          async () => makeReceipt()
      }),
      /submission|hash|match/i
    );
  }
);

test(
  "requires a receipt acquisition capability",
  async () => {
    const {
      produceControlledTransactionReceiptEvidence
    } = loadModule();

    await assert.rejects(
      produceControlledTransactionReceiptEvidence({
        controlledExactSignedTransactionSubmissionEvidence:
          makeControlledSubmissionEvidence(),

        acquireTransactionReceipt: null
      }),
      /acquireTransactionReceipt|function|capability/i
    );
  }
);

test(
  "rejects missing receipt evidence",
  async () => {
    const {
      produceControlledTransactionReceiptEvidence
    } = loadModule();

    await assert.rejects(
      produceControlledTransactionReceiptEvidence({
        controlledExactSignedTransactionSubmissionEvidence:
          makeControlledSubmissionEvidence(),

        acquireTransactionReceipt:
          async () => null
      }),
      /receipt/i
    );
  }
);

test(
  "rejects a receipt for a different transaction hash",
  async () => {
    const {
      produceControlledTransactionReceiptEvidence
    } = loadModule();

    await assert.rejects(
      produceControlledTransactionReceiptEvidence({
        controlledExactSignedTransactionSubmissionEvidence:
          makeControlledSubmissionEvidence(),

        acquireTransactionReceipt:
          async () =>
            makeReceipt({
              transactionHash:
                "0xefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefef"
            })
      }),
      /transaction|hash|match/i
    );
  }
);

test(
  "rejects an unsuccessful transaction receipt",
  async () => {
    const {
      produceControlledTransactionReceiptEvidence
    } = loadModule();

    await assert.rejects(
      produceControlledTransactionReceiptEvidence({
        controlledExactSignedTransactionSubmissionEvidence:
          makeControlledSubmissionEvidence(),

        acquireTransactionReceipt:
          async () =>
            makeReceipt({ status: 0 })
      }),
      /status|successful|receipt/i
    );
  }
);

test(
  "requires a positive safe mined block number",
  async () => {
    const {
      produceControlledTransactionReceiptEvidence
    } = loadModule();

    for (const blockNumber of [
      0,
      -1,
      1.5,
      Number.MAX_SAFE_INTEGER + 1
    ]) {
      await assert.rejects(
        produceControlledTransactionReceiptEvidence({
          controlledExactSignedTransactionSubmissionEvidence:
            makeControlledSubmissionEvidence(),

          acquireTransactionReceipt:
            async () =>
              makeReceipt({ blockNumber })
        }),
        /block/i
      );
    }
  }
);

test(
  "requires positive BigNumber receipt gasUsed",
  async () => {
    const {
      produceControlledTransactionReceiptEvidence
    } = loadModule();

    for (const gasUsed of [
      1,
      "423817",
      ethers.BigNumber.from(0)
    ]) {
      await assert.rejects(
        produceControlledTransactionReceiptEvidence({
          controlledExactSignedTransactionSubmissionEvidence:
            makeControlledSubmissionEvidence(),

          acquireTransactionReceipt:
            async () =>
              makeReceipt({ gasUsed })
        }),
        /gasUsed|gas/i
      );
    }
  }
);

test(
  "does not expose submission, signing, nonce, fee, or gas-limit controls to receipt acquisition",
  async () => {
    const {
      produceControlledTransactionReceiptEvidence
    } = loadModule();

    const evidence =
      makeControlledSubmissionEvidence();

    let argumentCount = null;
    let received = null;

    await produceControlledTransactionReceiptEvidence({
      controlledExactSignedTransactionSubmissionEvidence:
        evidence,

      acquireTransactionReceipt:
        async function () {
          argumentCount = arguments.length;
          received = arguments[0];

          return makeReceipt();
        }
    });

    assert.equal(argumentCount, 1);
    assert.equal(received, HASH);
    assert.equal(typeof received, "string");
  }
);
