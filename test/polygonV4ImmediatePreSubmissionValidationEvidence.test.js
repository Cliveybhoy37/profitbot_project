"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { ethers } = require("ethers");

const SUBJECT_PATH = path.join(
  __dirname,
  "../scripts/utils/polygonV4ImmediatePreSubmissionValidationEvidence.js"
);

function loadSubject() {
  return require(SUBJECT_PATH);
}

const SIGNER =
  "0x1111111111111111111111111111111111111111";

const EXECUTOR =
  "0x2222222222222222222222222222222222222222";

function makeEnvelope() {
  return Object.freeze({
    from: SIGNER,
    to: EXECUTOR,
    data: "0x12345678",
    value: ethers.constants.Zero,
    chainId: 137,
    nonce: 42,
    maxFeePerGas:
      ethers.BigNumber.from("50000000000"),
    maxPriorityFeePerGas:
      ethers.BigNumber.from("30000000000"),
    gasLimit:
      ethers.BigNumber.from("123456")
  });
}

function makeEvidence() {
  const transactionEnvelope =
    makeEnvelope();

  const finalSignedTransactionCurrentStateEvidence =
    Object.freeze({
      transactionEnvelope,
      signedRawTransaction: "0x1234",
      signedTransactionHash:
        "0x" + "ab".repeat(32),

      finalSignedTransactionCurrentStateReady:
        true,

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
      signedTransactionHash:
        "0x" + "ab".repeat(32),

      controlledBroadcastAuthorizationReady:
        true,

      signerAuthorized: true,
      signingAuthorized: true,
      liveExecutionAuthorized: false,
      broadcastAuthorized: true
    });

  const controlledLiveExecutionAuthorizationEvidence =
    Object.freeze({
      controlledBroadcastAuthorizationEvidence,
      finalSignedTransactionCurrentStateEvidence,
      transactionEnvelope,
      signedRawTransaction: "0x1234",
      signedTransactionHash:
        "0x" + "ab".repeat(32),

      controlledLiveExecutionAuthorizationReady:
        true,

      signerAuthorized: true,
      signingAuthorized: true,
      liveExecutionAuthorized: true,
      broadcastAuthorized: true
    });

  return {
    transactionEnvelope,
    finalSignedTransactionCurrentStateEvidence,
    controlledBroadcastAuthorizationEvidence,
    controlledLiveExecutionAuthorizationEvidence
  };
}

function makeProvider({
  chainId = 137,
  pendingNonce = 42,
  callResult = "0x"
} = {}) {
  const observations = {
    networkCalls: 0,
    nonceCalls: [],
    callRequests: []
  };

  return {
    observations,

    async getNetwork() {
      observations.networkCalls += 1;
      return { chainId };
    },

    async getTransactionCount(
      address,
      blockTag
    ) {
      observations.nonceCalls.push({
        address,
        blockTag
      });

      return pendingNonce;
    },

    async call(request) {
      observations.callRequests.push(
        request
      );

      return callResult;
    }
  };
}

function withLiveEvidence(h, changes) {
  return Object.freeze({
    ...h.controlledLiveExecutionAuthorizationEvidence,
    ...changes
  });
}

test(
  "1S.43 immediately revalidates the exact authorized signed transaction without submission capability",
  async () => {
    const {
      validateImmediatePreSubmissionEvidence
    } = loadSubject();

    const h = makeEvidence();
    const provider = makeProvider();

    const result =
      await validateImmediatePreSubmissionEvidence({
        controlledLiveExecutionAuthorizationEvidence:
          h.controlledLiveExecutionAuthorizationEvidence,
        provider
      });

    assert.strictEqual(
      result.controlledLiveExecutionAuthorizationEvidence,
      h.controlledLiveExecutionAuthorizationEvidence
    );

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

    assert.equal(
      result.signedRawTransaction,
      "0x1234"
    );

    assert.equal(
      result.signedTransactionHash,
      "0x" + "ab".repeat(32)
    );

    assert.equal(
      provider.observations.networkCalls,
      1
    );

    assert.deepEqual(
      provider.observations.nonceCalls,
      [{
        address: SIGNER,
        blockTag: "pending"
      }]
    );

    assert.deepEqual(
      provider.observations.callRequests,
      [{
        from: SIGNER,
        to: EXECUTOR,
        data: "0x12345678",
        value: ethers.constants.Zero,
        gasLimit:
          h.transactionEnvelope.gasLimit,
        maxFeePerGas:
          h.transactionEnvelope.maxFeePerGas,
        maxPriorityFeePerGas:
          h.transactionEnvelope.maxPriorityFeePerGas
      }]
    );

    assert.equal(
      result.simulationResult,
      "0x"
    );

    assert.equal(
      result.immediatePreSubmissionValidationReady,
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
  "1S.43 requires controlled live execution authorization evidence",
  async () => {
    const {
      validateImmediatePreSubmissionEvidence
    } = loadSubject();

    for (const evidence of [
      undefined,
      null,
      [],
      "evidence"
    ]) {
      await assert.rejects(
        validateImmediatePreSubmissionEvidence({
          controlledLiveExecutionAuthorizationEvidence:
            evidence,
          provider: makeProvider()
        }),
        /controlledLiveExecutionAuthorizationEvidence.*object/i
      );
    }
  }
);

test(
  "1S.43 requires controlled live execution authorization readiness",
  async () => {
    const {
      validateImmediatePreSubmissionEvidence
    } = loadSubject();

    const h = makeEvidence();

    await assert.rejects(
      validateImmediatePreSubmissionEvidence({
        controlledLiveExecutionAuthorizationEvidence:
          withLiveEvidence(h, {
            controlledLiveExecutionAuthorizationReady:
              false
          }),
        provider: makeProvider()
      }),
      /controlled live execution authorization evidence must be ready/i
    );
  }
);

test(
  "1S.43 requires signer, signing, broadcast, and live execution authorization",
  async () => {
    const {
      validateImmediatePreSubmissionEvidence
    } = loadSubject();

    const h = makeEvidence();

    for (const field of [
      "signerAuthorized",
      "signingAuthorized",
      "broadcastAuthorized",
      "liveExecutionAuthorized"
    ]) {
      await assert.rejects(
        validateImmediatePreSubmissionEvidence({
          controlledLiveExecutionAuthorizationEvidence:
            withLiveEvidence(h, {
              [field]: false
            }),
          provider: makeProvider()
        }),
        /authorization.*remain true/i
      );
    }
  }
);

test(
  "1S.43 requires preserved controlled broadcast authorization evidence",
  async () => {
    const {
      validateImmediatePreSubmissionEvidence
    } = loadSubject();

    const h = makeEvidence();

    await assert.rejects(
      validateImmediatePreSubmissionEvidence({
        controlledLiveExecutionAuthorizationEvidence:
          withLiveEvidence(h, {
            controlledBroadcastAuthorizationEvidence:
              null
          }),
        provider: makeProvider()
      }),
      /controlled broadcast authorization evidence.*object/i
    );
  }
);

test(
  "1S.43 rejects transaction lineage drift between 1S.42 and 1S.41",
  async () => {
    const {
      validateImmediatePreSubmissionEvidence
    } = loadSubject();

    const h = makeEvidence();

    const cases = [
      {
        transactionEnvelope:
          makeEnvelope()
      },
      {
        signedRawTransaction:
          "0x5678"
      },
      {
        signedTransactionHash:
          "0x" + "cd".repeat(32)
      }
    ];

    for (const changes of cases) {
      await assert.rejects(
        validateImmediatePreSubmissionEvidence({
          controlledLiveExecutionAuthorizationEvidence:
            withLiveEvidence(h, changes),
          provider: makeProvider()
        }),
        /mismatch/i
      );
    }
  }
);

test(
  "1S.43 requires preserved final signed transaction current-state evidence",
  async () => {
    const {
      validateImmediatePreSubmissionEvidence
    } = loadSubject();

    const h = makeEvidence();

    const broadcastEvidence =
      Object.freeze({
        ...h.controlledBroadcastAuthorizationEvidence,
        finalSignedTransactionCurrentStateEvidence:
          null
      });

    await assert.rejects(
      validateImmediatePreSubmissionEvidence({
        controlledLiveExecutionAuthorizationEvidence:
          withLiveEvidence(h, {
            controlledBroadcastAuthorizationEvidence:
              broadcastEvidence
          }),
        provider: makeProvider()
      }),
      /final signed transaction current-state evidence.*object/i
    );
  }
);

test(
  "1S.43 rejects transaction lineage drift between 1S.41 and 1S.40",
  async () => {
    const {
      validateImmediatePreSubmissionEvidence
    } = loadSubject();

    const cases = [
      {
        transactionEnvelope:
          makeEnvelope()
      },
      {
        signedRawTransaction:
          "0x5678"
      },
      {
        signedTransactionHash:
          "0x" + "cd".repeat(32)
      }
    ];

    for (const changes of cases) {
      const h = makeEvidence();

      const broadcastEvidence =
        Object.freeze({
          ...h.controlledBroadcastAuthorizationEvidence,
          ...changes
        });

      await assert.rejects(
        validateImmediatePreSubmissionEvidence({
          controlledLiveExecutionAuthorizationEvidence:
            withLiveEvidence(h, {
              controlledBroadcastAuthorizationEvidence:
                broadcastEvidence
            }),
          provider: makeProvider()
        }),
        /mismatch/i
      );
    }
  }
);

test(
  "1S.43 requires provider current-state methods",
  async () => {
    const {
      validateImmediatePreSubmissionEvidence
    } = loadSubject();

    const h = makeEvidence();

    for (const provider of [
      undefined,
      null,
      [],
      {},
      {
        getNetwork: async () => ({
          chainId: 137
        })
      },
      {
        getNetwork: async () => ({
          chainId: 137
        }),
        getTransactionCount:
          async () => 42
      }
    ]) {
      await assert.rejects(
        validateImmediatePreSubmissionEvidence({
          controlledLiveExecutionAuthorizationEvidence:
            h.controlledLiveExecutionAuthorizationEvidence,
          provider
        }),
        /provider/i
      );
    }
  }
);

test(
  "1S.43 rejects non-Polygon current chain before nonce or simulation",
  async () => {
    const {
      validateImmediatePreSubmissionEvidence
    } = loadSubject();

    const h = makeEvidence();
    const provider =
      makeProvider({
        chainId: 1
      });

    await assert.rejects(
      validateImmediatePreSubmissionEvidence({
        controlledLiveExecutionAuthorizationEvidence:
          h.controlledLiveExecutionAuthorizationEvidence,
        provider
      }),
      /chain ID 137/i
    );

    assert.deepEqual(
      provider.observations.nonceCalls,
      []
    );

    assert.deepEqual(
      provider.observations.callRequests,
      []
    );
  }
);

test(
  "1S.43 rejects invalid current pending nonce before simulation",
  async () => {
    const {
      validateImmediatePreSubmissionEvidence
    } = loadSubject();

    const h = makeEvidence();

    for (const pendingNonce of [
      -1,
      1.5,
      Number.MAX_SAFE_INTEGER + 1
    ]) {
      const provider =
        makeProvider({
          pendingNonce
        });

      await assert.rejects(
        validateImmediatePreSubmissionEvidence({
          controlledLiveExecutionAuthorizationEvidence:
            h.controlledLiveExecutionAuthorizationEvidence,
          provider
        }),
        /pending nonce invalid/i
      );

      assert.deepEqual(
        provider.observations.callRequests,
        []
      );
    }
  }
);

test(
  "1S.43 rejects current pending nonce drift before simulation",
  async () => {
    const {
      validateImmediatePreSubmissionEvidence
    } = loadSubject();

    const h = makeEvidence();

    for (const pendingNonce of [41, 43]) {
      const provider =
        makeProvider({
          pendingNonce
        });

      await assert.rejects(
        validateImmediatePreSubmissionEvidence({
          controlledLiveExecutionAuthorizationEvidence:
            h.controlledLiveExecutionAuthorizationEvidence,
          provider
        }),
        /pending nonce.*does not match/i
      );

      assert.deepEqual(
        provider.observations.callRequests,
        []
      );
    }
  }
);

test(
  "1S.43 fails closed when immediate provider call rejects",
  async () => {
    const {
      validateImmediatePreSubmissionEvidence
    } = loadSubject();

    const h = makeEvidence();
    const provider = makeProvider();

    provider.call =
      async (request) => {
        provider.observations.callRequests.push(
          request
        );

        throw new Error(
          "immediate simulation reverted"
        );
      };

    await assert.rejects(
      validateImmediatePreSubmissionEvidence({
        controlledLiveExecutionAuthorizationEvidence:
          h.controlledLiveExecutionAuthorizationEvidence,
        provider
      }),
      /immediate simulation reverted/i
    );
  }
);

test(
  "1S.43 production module contains current-state validation but no signing or transaction submission primitive",
  () => {
    const source =
      fs.readFileSync(
        SUBJECT_PATH,
        "utf8"
      );

    assert.match(
      source,
      /getNetwork/
    );

    assert.match(
      source,
      /getTransactionCount/
    );

    assert.match(
      source,
      /provider\.call/
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
        `unexpected capability in 1S.43 production source: ${forbidden}`
      );
    }
  }
);
