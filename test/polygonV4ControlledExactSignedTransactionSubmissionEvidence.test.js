"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const MODULE_PATH =
  "../scripts/utils/polygonV4ControlledExactSignedTransactionSubmissionEvidence";

function loadModule() {
  return require(MODULE_PATH);
}

function makeImmediatePreSubmissionEvidence(overrides = {}) {
  const transactionEnvelope = Object.freeze({
    from: "0x1111111111111111111111111111111111111111",
    to: "0x2222222222222222222222222222222222222222",
    data: "0x12345678",
    value: 0,
    chainId: 137,
    nonce: 42,
    maxFeePerGas: "50000000000",
    maxPriorityFeePerGas: "3000000000",
    gasLimit: "123456"
  });

  return Object.freeze({
    transactionEnvelope,
    signedRawTransaction: "0x1234",
    signedTransactionHash:
      "0xabababababababababababababababababababababababababababababababab",

    immediatePreSubmissionValidationReady: true,

    signerAuthorized: true,
    signingAuthorized: true,
    broadcastAuthorized: true,
    liveExecutionAuthorized: true,

    ...overrides
  });
}

test(
  "submits the exact 1S.43 signed raw transaction exactly once and preserves submission evidence",
  async () => {
    const {
      submitControlledExactSignedTransaction
    } = loadModule();

    const evidence =
      makeImmediatePreSubmissionEvidence();

    const calls = [];

    const result =
      await submitControlledExactSignedTransaction({
        immediatePreSubmissionValidationEvidence:
          evidence,

        submitSignedTransaction:
          async signedRawTransaction => {
            calls.push(signedRawTransaction);

            return Object.freeze({
              hash: evidence.signedTransactionHash
            });
          }
      });

    assert.equal(calls.length, 1);
    assert.equal(
      calls[0],
      evidence.signedRawTransaction
    );

    assert.equal(
      result
        .immediatePreSubmissionValidationEvidence,
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
      result.submissionResponse.hash,
      evidence.signedTransactionHash
    );

    assert.equal(
      result.controlledExactSignedTransactionSubmissionReady,
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
  "requires immediate pre-submission validation evidence",
  async () => {
    const {
      submitControlledExactSignedTransaction
    } = loadModule();

    await assert.rejects(
      submitControlledExactSignedTransaction({
        submitSignedTransaction: async () => ({
          hash:
            "0xabababababababababababababababababababababababababababababababab"
        })
      }),
      /immediate.*pre.*submission|evidence/i
    );
  }
);

test(
  "requires 1S.43 readiness before exposing the signed transaction to submission capability",
  async () => {
    const {
      submitControlledExactSignedTransaction
    } = loadModule();

    let calls = 0;

    await assert.rejects(
      submitControlledExactSignedTransaction({
        immediatePreSubmissionValidationEvidence:
          makeImmediatePreSubmissionEvidence({
            immediatePreSubmissionValidationReady:
              false
          }),

        submitSignedTransaction: async () => {
          calls += 1;
          return {};
        }
      }),
      /ready|validation/i
    );

    assert.equal(calls, 0);
  }
);

for (const flag of [
  "signerAuthorized",
  "signingAuthorized",
  "broadcastAuthorized",
  "liveExecutionAuthorized"
]) {
  test(
    `requires ${flag} before submission`,
    async () => {
      const {
        submitControlledExactSignedTransaction
      } = loadModule();

      let calls = 0;

      await assert.rejects(
        submitControlledExactSignedTransaction({
          immediatePreSubmissionValidationEvidence:
            makeImmediatePreSubmissionEvidence({
              [flag]: false
            }),

          submitSignedTransaction:
            async () => {
              calls += 1;
              return {};
            }
        }),
        new RegExp(flag, "i")
      );

      assert.equal(calls, 0);
    }
  );
}

test(
  "requires a non-empty signed raw transaction before submission",
  async () => {
    const {
      submitControlledExactSignedTransaction
    } = loadModule();

    let calls = 0;

    await assert.rejects(
      submitControlledExactSignedTransaction({
        immediatePreSubmissionValidationEvidence:
          makeImmediatePreSubmissionEvidence({
            signedRawTransaction: ""
          }),

        submitSignedTransaction:
          async () => {
            calls += 1;
            return {};
          }
      }),
      /signedRawTransaction|raw/i
    );

    assert.equal(calls, 0);
  }
);

test(
  "requires a non-empty expected signed transaction hash before submission",
  async () => {
    const {
      submitControlledExactSignedTransaction
    } = loadModule();

    let calls = 0;

    await assert.rejects(
      submitControlledExactSignedTransaction({
        immediatePreSubmissionValidationEvidence:
          makeImmediatePreSubmissionEvidence({
            signedTransactionHash: ""
          }),

        submitSignedTransaction:
          async () => {
            calls += 1;
            return {};
          }
      }),
      /signedTransactionHash|hash/i
    );

    assert.equal(calls, 0);
  }
);

test(
  "requires an injected submission capability",
  async () => {
    const {
      submitControlledExactSignedTransaction
    } = loadModule();

    await assert.rejects(
      submitControlledExactSignedTransaction({
        immediatePreSubmissionValidationEvidence:
          makeImmediatePreSubmissionEvidence()
      }),
      /submitSignedTransaction|function|capability/i
    );
  }
);

test(
  "propagates submission failure and does not retry",
  async () => {
    const {
      submitControlledExactSignedTransaction
    } = loadModule();

    let calls = 0;

    await assert.rejects(
      submitControlledExactSignedTransaction({
        immediatePreSubmissionValidationEvidence:
          makeImmediatePreSubmissionEvidence(),

        submitSignedTransaction:
          async () => {
            calls += 1;
            throw new Error(
              "synthetic submission failure"
            );
          }
      }),
      /synthetic submission failure/
    );

    assert.equal(calls, 1);
  }
);

test(
  "requires a submission response object",
  async () => {
    const {
      submitControlledExactSignedTransaction
    } = loadModule();

    await assert.rejects(
      submitControlledExactSignedTransaction({
        immediatePreSubmissionValidationEvidence:
          makeImmediatePreSubmissionEvidence(),

        submitSignedTransaction:
          async () => null
      }),
      /response|object/i
    );
  }
);

test(
  "requires returned submission hash to match the already signed transaction hash",
  async () => {
    const {
      submitControlledExactSignedTransaction
    } = loadModule();

    let calls = 0;

    await assert.rejects(
      submitControlledExactSignedTransaction({
        immediatePreSubmissionValidationEvidence:
          makeImmediatePreSubmissionEvidence(),

        submitSignedTransaction:
          async () => {
            calls += 1;

            return {
              hash:
                "0xcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd"
            };
          }
      }),
      /hash|match/i
    );

    assert.equal(calls, 1);
  }
);

test(
  "does not wait for a receipt or claim on-chain success",
  async () => {
    const {
      submitControlledExactSignedTransaction
    } = loadModule();

    const evidence =
      makeImmediatePreSubmissionEvidence();

    const submissionResponse = {
      hash: evidence.signedTransactionHash,

      wait() {
        throw new Error(
          "1S.44 must not wait for receipt"
        );
      }
    };

    const result =
      await submitControlledExactSignedTransaction({
        immediatePreSubmissionValidationEvidence:
          evidence,

        submitSignedTransaction:
          async () => submissionResponse
      });

    assert.equal(
      result.submissionResponse,
      submissionResponse
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        result,
        "receipt"
      ),
      false
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        result,
        "gasUsed"
      ),
      false
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        result,
        "transactionSucceeded"
      ),
      false
    );
  }
);
