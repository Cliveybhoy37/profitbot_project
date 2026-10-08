"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const SUBJECT_PATH =
  "../scripts/utils/polygonV4ImmediatePreSubmissionValidationCompositionEvidence";

function loadSubject() {
  return require(SUBJECT_PATH);
}

function makeFixture() {
  const transactionEnvelope =
    Object.freeze({
      chainId: 137,
      type: 2,
      nonce: 17,
      from:
        "0x1111111111111111111111111111111111111111",
      to:
        "0x2222222222222222222222222222222222222222",
      data: "0x1234",
      value: 0,
      gasLimit: 500000,
      maxFeePerGas: 100,
      maxPriorityFeePerGas: 10
    });

  const signedRawTransaction = "0x1234";
  const signedTransactionHash = "0x5678";

  const finalSignedTransactionCurrentStateEvidence =
    Object.freeze({
      transactionEnvelope,
      signedRawTransaction,
      signedTransactionHash,
      finalSignedTransactionCurrentStateReady: true,
      signerAuthorized: true,
      signingAuthorized: true,
      broadcastAuthorized: false,
      liveExecutionAuthorized: false
    });

  const controlledBroadcastAuthorizationEvidence =
    Object.freeze({
      finalSignedTransactionCurrentStateEvidence,
      transactionEnvelope,
      signedRawTransaction,
      signedTransactionHash,
      controlledBroadcastAuthorizationReady: true,
      signerAuthorized: true,
      signingAuthorized: true,
      broadcastAuthorized: true,
      liveExecutionAuthorized: false
    });

  const controlledLiveExecutionAuthorizationEvidence =
    Object.freeze({
      controlledBroadcastAuthorizationEvidence,
      finalSignedTransactionCurrentStateEvidence,
      transactionEnvelope,
      signedRawTransaction,
      signedTransactionHash,
      controlledLiveExecutionAuthorizationReady: true,
      signerAuthorized: true,
      signingAuthorized: true,
      broadcastAuthorized: true,
      liveExecutionAuthorized: true
    });

  const controlledLiveExecutionAuthorizationCompositionEvidence =
    Object.freeze({
      controlledLiveExecutionAuthorizationEvidence,
      controlledLiveExecutionAuthorizationCompositionReady:
        true
    });

  return {
    transactionEnvelope,
    signedRawTransaction,
    signedTransactionHash,
    controlledLiveExecutionAuthorizationEvidence,
    controlledLiveExecutionAuthorizationCompositionEvidence
  };
}

test(
  "1S.74 bridges controlled live execution authorization composition into immediate pre-submission validation without transaction submission",
  async () => {
    const {
      buildImmediatePreSubmissionValidationCompositionEvidence
    } = loadSubject();

    const fixture = makeFixture();

    const calls = [];

    const provider = {
      async getNetwork() {
        calls.push(["getNetwork"]);
        return { chainId: 137 };
      },

      async getTransactionCount(address, blockTag) {
        calls.push([
          "getTransactionCount",
          address,
          blockTag
        ]);

        return fixture.transactionEnvelope.nonce;
      },

      async call(request) {
        calls.push(["call", request]);
        return "0x";
      }
    };

    const result =
      await buildImmediatePreSubmissionValidationCompositionEvidence({
        controlledLiveExecutionAuthorizationCompositionEvidence:
          fixture
            .controlledLiveExecutionAuthorizationCompositionEvidence,
        provider
      });

    assert.equal(
      result
        .controlledLiveExecutionAuthorizationCompositionEvidence,
      fixture
        .controlledLiveExecutionAuthorizationCompositionEvidence
    );

    assert.equal(
      result
        .immediatePreSubmissionValidationEvidence
        .controlledLiveExecutionAuthorizationEvidence,
      fixture
        .controlledLiveExecutionAuthorizationEvidence
    );

    assert.equal(
      result
        .immediatePreSubmissionValidationEvidence
        .transactionEnvelope,
      fixture.transactionEnvelope
    );

    assert.equal(
      result
        .immediatePreSubmissionValidationEvidence
        .signedRawTransaction,
      fixture.signedRawTransaction
    );

    assert.equal(
      result
        .immediatePreSubmissionValidationEvidence
        .signedTransactionHash,
      fixture.signedTransactionHash
    );

    assert.equal(
      result
        .immediatePreSubmissionValidationEvidence
        .immediatePreSubmissionValidationReady,
      true
    );

    assert.equal(
      result
        .immediatePreSubmissionValidationCompositionReady,
      true
    );

    assert.equal(
      Object.isFrozen(result),
      true
    );

    assert.deepEqual(
      calls.map(([method]) => method),
      [
        "getNetwork",
        "getTransactionCount",
        "call"
      ]
    );

    assert.deepEqual(
      calls[1],
      [
        "getTransactionCount",
        fixture.transactionEnvelope.from,
        "pending"
      ]
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        provider,
        "sendTransaction"
      ),
      false
    );
  }
);

test(
  "1S.74 requires controlled live execution authorization composition evidence object",
  async () => {
    const {
      buildImmediatePreSubmissionValidationCompositionEvidence
    } = loadSubject();

    await assert.rejects(
      () =>
        buildImmediatePreSubmissionValidationCompositionEvidence({
          controlledLiveExecutionAuthorizationCompositionEvidence:
            null,
          provider: {}
        }),
      /Controlled live execution authorization composition evidence must be an object/
    );
  }
);

test(
  "1S.74 requires controlled live execution authorization composition readiness",
  async () => {
    const {
      buildImmediatePreSubmissionValidationCompositionEvidence
    } = loadSubject();

    const fixture = makeFixture();

    const composition = {
      ...fixture
        .controlledLiveExecutionAuthorizationCompositionEvidence,
      controlledLiveExecutionAuthorizationCompositionReady:
        false
    };

    await assert.rejects(
      () =>
        buildImmediatePreSubmissionValidationCompositionEvidence({
          controlledLiveExecutionAuthorizationCompositionEvidence:
            composition,
          provider: {}
        }),
      /Controlled live execution authorization composition evidence is not ready/
    );
  }
);

test(
  "1S.74 requires contained controlled live execution authorization evidence object",
  async () => {
    const {
      buildImmediatePreSubmissionValidationCompositionEvidence
    } = loadSubject();

    const fixture = makeFixture();

    const composition = {
      ...fixture
        .controlledLiveExecutionAuthorizationCompositionEvidence,
      controlledLiveExecutionAuthorizationEvidence:
        null
    };

    await assert.rejects(
      () =>
        buildImmediatePreSubmissionValidationCompositionEvidence({
          controlledLiveExecutionAuthorizationCompositionEvidence:
            composition,
          provider: {}
        }),
      /Controlled live execution authorization evidence must be an object/
    );
  }
);

test(
  "1S.74 requires contained controlled live execution authorization readiness",
  async () => {
    const {
      buildImmediatePreSubmissionValidationCompositionEvidence
    } = loadSubject();

    const fixture = makeFixture();

    const composition = {
      ...fixture
        .controlledLiveExecutionAuthorizationCompositionEvidence,

      controlledLiveExecutionAuthorizationEvidence: {
        ...fixture
          .controlledLiveExecutionAuthorizationEvidence,

        controlledLiveExecutionAuthorizationReady:
          false
      }
    };

    await assert.rejects(
      () =>
        buildImmediatePreSubmissionValidationCompositionEvidence({
          controlledLiveExecutionAuthorizationCompositionEvidence:
            composition,
          provider: {}
        }),
      /Controlled live execution authorization evidence is not ready/
    );
  }
);

test(
  "1S.74 delegates provider validation failure to established immediate pre-submission validation",
  async () => {
    const {
      buildImmediatePreSubmissionValidationCompositionEvidence
    } = loadSubject();

    const fixture = makeFixture();

    await assert.rejects(
      () =>
        buildImmediatePreSubmissionValidationCompositionEvidence({
          controlledLiveExecutionAuthorizationCompositionEvidence:
            fixture
              .controlledLiveExecutionAuthorizationCompositionEvidence,
          provider: {}
        }),
      /provider\.getNetwork must be a function/
    );
  }
);

test(
  "1S.74 propagates established immediate pre-submission provider failure without submission",
  async () => {
    const {
      buildImmediatePreSubmissionValidationCompositionEvidence
    } = loadSubject();

    const fixture = makeFixture();

    let networkCalls = 0;

    const provider = {
      async getNetwork() {
        networkCalls += 1;
        throw new Error(
          "synthetic immediate validation RPC failure"
        );
      },

      async getTransactionCount() {
        throw new Error(
          "unexpected nonce acquisition"
        );
      },

      async call() {
        throw new Error(
          "unexpected simulation"
        );
      }
    };

    await assert.rejects(
      () =>
        buildImmediatePreSubmissionValidationCompositionEvidence({
          controlledLiveExecutionAuthorizationCompositionEvidence:
            fixture
              .controlledLiveExecutionAuthorizationCompositionEvidence,
          provider
        }),
      /synthetic immediate validation RPC failure/
    );

    assert.equal(networkCalls, 1);
  }
);
