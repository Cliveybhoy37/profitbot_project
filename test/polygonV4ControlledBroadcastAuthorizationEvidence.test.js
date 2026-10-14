"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  acquireControlledBroadcastAuthorizationEvidence
} = require(
  "../scripts/utils/polygonV4ControlledBroadcastAuthorizationEvidence"
);

const SIGNER =
  "0x1111111111111111111111111111111111111111";

const EXECUTOR =
  "0x2222222222222222222222222222222222222222";

const SIGNED_RAW_TRANSACTION =
  "0x1234";

const SIGNED_HASH =
  "0x" + "ab".repeat(32);

function makeEnvelope() {
  return Object.freeze({
    from: SIGNER,
    to: EXECUTOR,
    data: "0x12345678",
    value: "0",
    chainId: 137,
    nonce: 42,
    maxFeePerGas: "50000000000",
    maxPriorityFeePerGas: "30000000000",
    gasLimit: "123456"
  });
}

function makeFinalValidationEvidence() {
  const transactionEnvelope =
    makeEnvelope();

  const signerCapabilityBindingEvidence =
    Object.freeze({
      transactionEnvelope,

      signerAddress: SIGNER,
      signerCapabilityAddress: SIGNER,

      signerCapabilityBindingReady: true,

      signerAuthorized: true,
      signingAuthorized: true,

      liveExecutionAuthorized: false,
      broadcastAuthorized: false
    });

  const transactionSigningEvidence =
    Object.freeze({
      signerCapabilityBindingEvidence,

      transactionEnvelope,

      signerAddress: SIGNER,
      signerCapabilityAddress: SIGNER,

      signedRawTransaction:
        SIGNED_RAW_TRANSACTION,

      signedTransactionHash:
        SIGNED_HASH,

      transactionSigningReady: true,

      signerAuthorized: true,
      signingAuthorized: true,

      liveExecutionAuthorized: false,
      broadcastAuthorized: false
    });

  return Object.freeze({
    transactionSigningEvidence,

    transactionEnvelope,

    signedRawTransaction:
      SIGNED_RAW_TRANSACTION,

    signedTransactionHash:
      SIGNED_HASH,

    callRequest: Object.freeze({
      from: SIGNER,
      to: EXECUTOR,
      data: "0x12345678"
    }),

    simulationResult: "0x",

    finalSignedTransactionCurrentStateReady:
      true,

    signerAuthorized: true,
    signingAuthorized: true,

    liveExecutionAuthorized: false,
    broadcastAuthorized: false
  });
}

function authorizationArgs(evidence) {
  return {
    finalSignedTransactionCurrentStateEvidence:
      evidence,

    authorizeControlledBroadcast:
      async () => true
  };
}

test(
  "1S.41 explicitly authorizes controlled broadcast without authorizing live execution or submitting the transaction",
  async () => {
    const evidence =
      makeFinalValidationEvidence();

    const calls = [];

    const result =
      await acquireControlledBroadcastAuthorizationEvidence({
        finalSignedTransactionCurrentStateEvidence:
          evidence,

        authorizeControlledBroadcast:
          async request => {
            calls.push(request);
            return true;
          }
      });

    assert.equal(calls.length, 1);

    assert.equal(
      calls[0].transactionEnvelope,
      evidence.transactionEnvelope
    );

    assert.equal(
      calls[0].signedTransactionHash,
      SIGNED_HASH
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        calls[0],
        "signedRawTransaction"
      ),
      false
    );

    assert.equal(
      result.finalSignedTransactionCurrentStateEvidence,
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
      result.controlledBroadcastAuthorizationReady,
      true
    );

    assert.equal(result.signerAuthorized, true);
    assert.equal(result.signingAuthorized, true);

    assert.equal(
      result.liveExecutionAuthorized,
      false
    );

    assert.equal(
      result.broadcastAuthorized,
      true
    );

    assert.equal(Object.isFrozen(result), true);
  }
);

test(
  "1S.41 rejects final signed transaction current-state evidence that is not ready",
  async () => {
    const evidence = {
      ...makeFinalValidationEvidence(),
      finalSignedTransactionCurrentStateReady:
        false
    };

    await assert.rejects(
      acquireControlledBroadcastAuthorizationEvidence(
        authorizationArgs(evidence)
      ),
      /final signed transaction current-state evidence must be ready/
    );
  }
);

test(
  "1S.41 rejects missing signer or signing authorization",
  async () => {
    for (const field of [
      "signerAuthorized",
      "signingAuthorized"
    ]) {
      const evidence = {
        ...makeFinalValidationEvidence(),
        [field]: false
      };

      await assert.rejects(
        acquireControlledBroadcastAuthorizationEvidence(
          authorizationArgs(evidence)
        ),
        /signer and signing authorization must remain true/
      );
    }
  }
);

test(
  "1S.41 rejects premature live execution or broadcast authorization",
  async () => {
    for (const field of [
      "liveExecutionAuthorized",
      "broadcastAuthorized"
    ]) {
      const evidence = {
        ...makeFinalValidationEvidence(),
        [field]: true
      };

      await assert.rejects(
        acquireControlledBroadcastAuthorizationEvidence(
          authorizationArgs(evidence)
        ),
        /execution and broadcast authorization must remain false/
      );
    }
  }
);

test(
  "1S.41 requires an authorization function",
  async () => {
    await assert.rejects(
      acquireControlledBroadcastAuthorizationEvidence({
        finalSignedTransactionCurrentStateEvidence:
          makeFinalValidationEvidence()
      }),
      /authorizeControlledBroadcast must be a function/
    );
  }
);

test(
  "1S.41 requires controlled broadcast authorization to return exactly true",
  async () => {
    for (const value of [
      false,
      undefined,
      null,
      1,
      "true"
    ]) {
      await assert.rejects(
        acquireControlledBroadcastAuthorizationEvidence({
          finalSignedTransactionCurrentStateEvidence:
            makeFinalValidationEvidence(),

          authorizeControlledBroadcast:
            async () => value
        }),
        /controlled broadcast authorization must return exactly true/
      );
    }
  }
);

test(
  "1S.41 propagates authorization callback failure without producing authorization evidence",
  async () => {
    await assert.rejects(
      acquireControlledBroadcastAuthorizationEvidence({
        finalSignedTransactionCurrentStateEvidence:
          makeFinalValidationEvidence(),

        authorizeControlledBroadcast:
          async () => {
            throw new Error(
              "operator authorization unavailable"
            );
          }
      }),
      /operator authorization unavailable/
    );
  }
);

test(
  "1S.41 requires ready transaction signing evidence",
  async () => {
    const original =
      makeFinalValidationEvidence();

    const evidence = {
      ...original,
      transactionSigningEvidence: {
        ...original.transactionSigningEvidence,
        transactionSigningReady: false
      }
    };

    await assert.rejects(
      acquireControlledBroadcastAuthorizationEvidence(
        authorizationArgs(evidence)
      ),
      /transaction signing evidence must be ready/
    );
  }
);

test(
  "1S.41 rejects transaction envelope identity drift from transaction signing evidence",
  async () => {
    const original =
      makeFinalValidationEvidence();

    const evidence = {
      ...original,
      transactionEnvelope: {
        ...original.transactionEnvelope
      }
    };

    await assert.rejects(
      acquireControlledBroadcastAuthorizationEvidence(
        authorizationArgs(evidence)
      ),
      /transaction envelope identity mismatch with transaction signing evidence/
    );
  }
);

test(
  "1S.41 rejects signed raw transaction drift from transaction signing evidence",
  async () => {
    const original =
      makeFinalValidationEvidence();

    const evidence = {
      ...original,
      signedRawTransaction: "0x5678"
    };

    await assert.rejects(
      acquireControlledBroadcastAuthorizationEvidence(
        authorizationArgs(evidence)
      ),
      /signed raw transaction mismatch with transaction signing evidence/
    );
  }
);

test(
  "1S.41 rejects signed transaction hash drift from transaction signing evidence",
  async () => {
    const original =
      makeFinalValidationEvidence();

    const evidence = {
      ...original,
      signedTransactionHash:
        "0x" + "cd".repeat(32)
    };

    await assert.rejects(
      acquireControlledBroadcastAuthorizationEvidence(
        authorizationArgs(evidence)
      ),
      /signed transaction hash mismatch with transaction signing evidence/
    );
  }
);

test(
  "1S.41 rejects transaction signing authorization drift",
  async () => {
    const cases = [
      {
        field: "signerAuthorized",
        value: false
      },
      {
        field: "signingAuthorized",
        value: false
      },
      {
        field: "liveExecutionAuthorized",
        value: true
      },
      {
        field: "broadcastAuthorized",
        value: true
      }
    ];

    for (const {
      field,
      value
    } of cases) {
      const original =
        makeFinalValidationEvidence();

      const evidence = {
        ...original,
        transactionSigningEvidence: {
          ...original.transactionSigningEvidence,
          [field]: value
        }
      };

      await assert.rejects(
        acquireControlledBroadcastAuthorizationEvidence(
          authorizationArgs(evidence)
        ),
        /transaction signing authorization state invalid/
      );
    }
  }
);

test(
  "1S.41 rejects transaction lineage drift before invoking controlled broadcast authorization",
  async () => {
    const cases = [
      original => ({
        ...original,
        transactionSigningEvidence: {
          ...original.transactionSigningEvidence,
          transactionSigningReady: false
        }
      }),

      original => ({
        ...original,
        transactionEnvelope: {
          ...original.transactionEnvelope
        }
      }),

      original => ({
        ...original,
        signedRawTransaction: "0x5678"
      }),

      original => ({
        ...original,
        signedTransactionHash:
          "0x" + "cd".repeat(32)
      }),

      original => ({
        ...original,
        transactionSigningEvidence: {
          ...original.transactionSigningEvidence,
          broadcastAuthorized: true
        }
      })
    ];

    for (const mutate of cases) {
      const evidence =
        mutate(
          makeFinalValidationEvidence()
        );

      let authorizationCalls = 0;

      await assert.rejects(
        acquireControlledBroadcastAuthorizationEvidence({
          finalSignedTransactionCurrentStateEvidence:
            evidence,

          authorizeControlledBroadcast:
            async () => {
              authorizationCalls += 1;
              return true;
            }
        })
      );

      assert.equal(
        authorizationCalls,
        0
      );
    }
  }
);
