"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const SUBJECT_PATH = path.join(
  __dirname,
  "../scripts/utils/polygonV4ControlledLiveExecutionAuthorizationEvidence.js"
);

function loadSubject() {
  return require(SUBJECT_PATH);
}

function makeEvidence() {
  const transactionEnvelope = Object.freeze({
    from: "0x1111111111111111111111111111111111111111",
    to: "0x2222222222222222222222222222222222222222",
    data: "0x1234",
    value: "0",
    gasLimit: "100000",
    maxFeePerGas: "30000000000",
    maxPriorityFeePerGas: "3000000000",
    nonce: 7,
    chainId: 137
  });

  const finalSignedTransactionCurrentStateEvidence =
    Object.freeze({
      finalSignedTransactionCurrentStateReady: true,
      transactionEnvelope,
      signedRawTransaction: "0x1234",
      signedTransactionHash: "0xabcdef",
      signerAuthorized: true,
      signingAuthorized: true,
      liveExecutionAuthorized: false,
      broadcastAuthorized: false
    });

  const controlledBroadcastAuthorizationEvidence =
    Object.freeze({
      finalSignedTransactionCurrentStateEvidence,
      transactionEnvelope,
      signedRawTransaction: "0x1234",
      signedTransactionHash: "0xabcdef",
      controlledBroadcastAuthorizationReady: true,
      signerAuthorized: true,
      signingAuthorized: true,
      liveExecutionAuthorized: false,
      broadcastAuthorized: true
    });

  return {
    transactionEnvelope,
    finalSignedTransactionCurrentStateEvidence,
    controlledBroadcastAuthorizationEvidence
  };
}

function withBroadcastEvidence(h, changes) {
  return Object.freeze({
    ...h.controlledBroadcastAuthorizationEvidence,
    ...changes
  });
}

test(
  "1S.42 grants controlled live execution authorization without submission capability",
  async () => {
    const {
      acquireControlledLiveExecutionAuthorizationEvidence
    } = loadSubject();

    const h = makeEvidence();

    let authorizationCalls = 0;

    const result =
      await acquireControlledLiveExecutionAuthorizationEvidence({
        controlledBroadcastAuthorizationEvidence:
          h.controlledBroadcastAuthorizationEvidence,

        authorizeControlledLiveExecution:
          async (request) => {
            authorizationCalls += 1;

            assert.deepEqual(
              Object.keys(request).sort(),
              [
                "signedTransactionHash",
                "transactionEnvelope"
              ]
            );

            assert.strictEqual(
              request.transactionEnvelope,
              h.transactionEnvelope
            );

            assert.equal(
              request.signedTransactionHash,
              "0xabcdef"
            );

            assert.equal(
              Object.prototype.hasOwnProperty.call(
                request,
                "signedRawTransaction"
              ),
              false
            );

            return true;
          }
      });

    assert.equal(authorizationCalls, 1);

    assert.strictEqual(
      result.controlledBroadcastAuthorizationEvidence,
      h.controlledBroadcastAuthorizationEvidence
    );

    assert.strictEqual(
      result.finalSignedTransactionCurrentStateEvidence,
      h.finalSignedTransactionCurrentStateEvidence
    );

    assert.strictEqual(
      result.transactionEnvelope,
      h.transactionEnvelope
    );

    assert.equal(result.signedRawTransaction, "0x1234");
    assert.equal(result.signedTransactionHash, "0xabcdef");

    assert.equal(
      result.controlledLiveExecutionAuthorizationReady,
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
  "1S.42 requires controlled broadcast authorization evidence",
  async () => {
    const {
      acquireControlledLiveExecutionAuthorizationEvidence
    } = loadSubject();

    for (const evidence of [
      undefined,
      null,
      [],
      "evidence"
    ]) {
      await assert.rejects(
        acquireControlledLiveExecutionAuthorizationEvidence({
          controlledBroadcastAuthorizationEvidence: evidence,
          authorizeControlledLiveExecution: async () => true
        }),
        /controlledBroadcastAuthorizationEvidence.*object/i
      );
    }
  }
);

test(
  "1S.42 requires controlled broadcast authorization readiness",
  async () => {
    const {
      acquireControlledLiveExecutionAuthorizationEvidence
    } = loadSubject();

    const h = makeEvidence();

    for (const value of [
      false,
      undefined,
      null,
      1,
      "true"
    ]) {
      await assert.rejects(
        acquireControlledLiveExecutionAuthorizationEvidence({
          controlledBroadcastAuthorizationEvidence:
            withBroadcastEvidence(h, {
              controlledBroadcastAuthorizationReady: value
            }),
          authorizeControlledLiveExecution: async () => true
        }),
        /controlled broadcast authorization evidence must be ready/i
      );
    }
  }
);

test(
  "1S.42 requires signer, signing, and broadcast authorization",
  async () => {
    const {
      acquireControlledLiveExecutionAuthorizationEvidence
    } = loadSubject();

    const h = makeEvidence();

    for (const field of [
      "signerAuthorized",
      "signingAuthorized",
      "broadcastAuthorized"
    ]) {
      await assert.rejects(
        acquireControlledLiveExecutionAuthorizationEvidence({
          controlledBroadcastAuthorizationEvidence:
            withBroadcastEvidence(h, {
              [field]: false
            }),
          authorizeControlledLiveExecution: async () => true
        }),
        /signer.*signing.*broadcast authorization must remain true/i
      );
    }
  }
);

test(
  "1S.42 rejects premature live execution authorization",
  async () => {
    const {
      acquireControlledLiveExecutionAuthorizationEvidence
    } = loadSubject();

    const h = makeEvidence();

    await assert.rejects(
      acquireControlledLiveExecutionAuthorizationEvidence({
        controlledBroadcastAuthorizationEvidence:
          withBroadcastEvidence(h, {
            liveExecutionAuthorized: true
          }),
        authorizeControlledLiveExecution: async () => true
      }),
      /live execution authorization must remain false/i
    );
  }
);

test(
  "1S.42 requires a live execution authorization function",
  async () => {
    const {
      acquireControlledLiveExecutionAuthorizationEvidence
    } = loadSubject();

    const h = makeEvidence();

    await assert.rejects(
      acquireControlledLiveExecutionAuthorizationEvidence({
        controlledBroadcastAuthorizationEvidence:
          h.controlledBroadcastAuthorizationEvidence
      }),
      /authorizeControlledLiveExecution.*function/i
    );
  }
);

test(
  "1S.42 requires live execution authorization to return exactly true",
  async () => {
    const {
      acquireControlledLiveExecutionAuthorizationEvidence
    } = loadSubject();

    const h = makeEvidence();

    for (const value of [
      false,
      undefined,
      null,
      1,
      "true",
      {}
    ]) {
      await assert.rejects(
        acquireControlledLiveExecutionAuthorizationEvidence({
          controlledBroadcastAuthorizationEvidence:
            h.controlledBroadcastAuthorizationEvidence,
          authorizeControlledLiveExecution:
            async () => value
        }),
        /controlled live execution authorization must return exactly true/i
      );
    }
  }
);

test(
  "1S.42 propagates live execution authorization failure",
  async () => {
    const {
      acquireControlledLiveExecutionAuthorizationEvidence
    } = loadSubject();

    const h = makeEvidence();

    await assert.rejects(
      acquireControlledLiveExecutionAuthorizationEvidence({
        controlledBroadcastAuthorizationEvidence:
          h.controlledBroadcastAuthorizationEvidence,
        authorizeControlledLiveExecution:
          async () => {
            throw new Error("authorization unavailable");
          }
      }),
      /authorization unavailable/
    );
  }
);

test(
  "1S.42 requires preserved 1S.40 current-state evidence",
  async () => {
    const {
      acquireControlledLiveExecutionAuthorizationEvidence
    } = loadSubject();

    const h = makeEvidence();

    await assert.rejects(
      acquireControlledLiveExecutionAuthorizationEvidence({
        controlledBroadcastAuthorizationEvidence:
          withBroadcastEvidence(h, {
            finalSignedTransactionCurrentStateEvidence: null
          }),
        authorizeControlledLiveExecution: async () => true
      }),
      /final signed transaction current-state evidence.*object/i
    );
  }
);

test(
  "1S.42 rejects transaction envelope identity drift",
  async () => {
    const {
      acquireControlledLiveExecutionAuthorizationEvidence
    } = loadSubject();

    const h = makeEvidence();

    await assert.rejects(
      acquireControlledLiveExecutionAuthorizationEvidence({
        controlledBroadcastAuthorizationEvidence:
          withBroadcastEvidence(h, {
            transactionEnvelope: Object.freeze({
              ...h.transactionEnvelope
            })
          }),
        authorizeControlledLiveExecution: async () => true
      }),
      /transaction envelope identity mismatch/i
    );
  }
);

test(
  "1S.42 rejects signed raw transaction drift",
  async () => {
    const {
      acquireControlledLiveExecutionAuthorizationEvidence
    } = loadSubject();

    const h = makeEvidence();

    await assert.rejects(
      acquireControlledLiveExecutionAuthorizationEvidence({
        controlledBroadcastAuthorizationEvidence:
          withBroadcastEvidence(h, {
            signedRawTransaction: "0x5678"
          }),
        authorizeControlledLiveExecution: async () => true
      }),
      /signed raw transaction mismatch/i
    );
  }
);

test(
  "1S.42 rejects signed transaction hash drift",
  async () => {
    const {
      acquireControlledLiveExecutionAuthorizationEvidence
    } = loadSubject();

    const h = makeEvidence();

    await assert.rejects(
      acquireControlledLiveExecutionAuthorizationEvidence({
        controlledBroadcastAuthorizationEvidence:
          withBroadcastEvidence(h, {
            signedTransactionHash: "0xdeadbeef"
          }),
        authorizeControlledLiveExecution: async () => true
      }),
      /signed transaction hash mismatch/i
    );
  }
);

test(
  "1S.42 validates lineage before requesting live execution authorization",
  async () => {
    const {
      acquireControlledLiveExecutionAuthorizationEvidence
    } = loadSubject();

    const h = makeEvidence();

    const cases = [
      {
        controlledBroadcastAuthorizationReady: false
      },
      {
        signerAuthorized: false
      },
      {
        signingAuthorized: false
      },
      {
        broadcastAuthorized: false
      },
      {
        liveExecutionAuthorized: true
      },
      {
        transactionEnvelope: Object.freeze({
          ...h.transactionEnvelope
        })
      },
      {
        signedRawTransaction: "0x5678"
      },
      {
        signedTransactionHash: "0xdeadbeef"
      }
    ];

    for (const changes of cases) {
      let authorizationCalls = 0;

      await assert.rejects(
        acquireControlledLiveExecutionAuthorizationEvidence({
          controlledBroadcastAuthorizationEvidence:
            withBroadcastEvidence(h, changes),
          authorizeControlledLiveExecution:
            async () => {
              authorizationCalls += 1;
              return true;
            }
        })
      );

      assert.equal(
        authorizationCalls,
        0,
        `authorization callback called for ${JSON.stringify(
          changes
        )}`
      );
    }
  }
);

test(
  "1S.42 production module contains no signing, RPC, or transaction submission primitive",
  () => {
    const source = fs.readFileSync(
      SUBJECT_PATH,
      "utf8"
    );

    for (const forbidden of [
      "signTransaction",
      "sendTransaction",
      "sendRawTransaction",
      "broadcastTransaction",
      "eth_sendRawTransaction",
      "privateKey",
      "mnemonic",
      "process.env"
    ]) {
      assert.equal(
        source.includes(forbidden),
        false,
        `forbidden capability present: ${forbidden}`
      );
    }
  }
);
