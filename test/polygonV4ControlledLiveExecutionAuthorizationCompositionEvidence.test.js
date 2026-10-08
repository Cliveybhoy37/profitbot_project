"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

function loadSubject() {
  return require(
    "../scripts/utils/" +
    "polygonV4ControlledLiveExecutionAuthorizationCompositionEvidence"
  );
}

function make1S72Composition() {
  const transactionEnvelope =
    Object.freeze({
      from:
        "0x1111111111111111111111111111111111111111"
    });

  const transactionSigningEvidence =
    Object.freeze({
      transactionEnvelope,
      signedRawTransaction: "0x1234",
      signedTransactionHash: "0x5678",
      transactionSigningReady: true,
      signerAuthorized: true,
      signingAuthorized: true,
      liveExecutionAuthorized: false,
      broadcastAuthorized: false
    });

  const finalSignedTransactionCurrentStateEvidence =
    Object.freeze({
      transactionSigningEvidence,
      transactionEnvelope,
      signedRawTransaction:
        transactionSigningEvidence
          .signedRawTransaction,
      signedTransactionHash:
        transactionSigningEvidence
          .signedTransactionHash,
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
      signedRawTransaction:
        transactionSigningEvidence
          .signedRawTransaction,
      signedTransactionHash:
        transactionSigningEvidence
          .signedTransactionHash,
      controlledBroadcastAuthorizationReady:
        true,
      signerAuthorized: true,
      signingAuthorized: true,
      liveExecutionAuthorized: false,
      broadcastAuthorized: true
    });

  return Object.freeze({
    controlledBroadcastAuthorizationEvidence,
    controlledBroadcastAuthorizationCompositionReady:
      true
  });
}

test(
  "1S.73 bridges controlled broadcast authorization composition into controlled live execution authorization without transaction submission",
  async () => {
    const {
      buildControlledLiveExecutionAuthorizationCompositionEvidence
    } = loadSubject();

    const composition =
      make1S72Composition();

    let authorizationCalls = 0;
    let receivedAuthorization;

    const result =
      await buildControlledLiveExecutionAuthorizationCompositionEvidence({
        controlledBroadcastAuthorizationCompositionEvidence:
          composition,

        authorizeControlledLiveExecution:
          async authorization => {
            authorizationCalls += 1;
            receivedAuthorization =
              authorization;
            return true;
          }
      });

    assert.equal(authorizationCalls, 1);

    assert.deepEqual(
      Object.keys(receivedAuthorization).sort(),
      [
        "signedTransactionHash",
        "transactionEnvelope"
      ]
    );

    assert.equal(
      receivedAuthorization.transactionEnvelope,
      composition
        .controlledBroadcastAuthorizationEvidence
        .transactionEnvelope
    );

    assert.equal(
      receivedAuthorization.signedTransactionHash,
      composition
        .controlledBroadcastAuthorizationEvidence
        .signedTransactionHash
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        receivedAuthorization,
        "signedRawTransaction"
      ),
      false
    );

    assert.equal(
      result
        .controlledBroadcastAuthorizationCompositionEvidence,
      composition
    );

    const liveEvidence =
      result
        .controlledLiveExecutionAuthorizationEvidence;

    assert.equal(
      liveEvidence
        .controlledBroadcastAuthorizationEvidence,
      composition
        .controlledBroadcastAuthorizationEvidence
    );

    assert.equal(
      liveEvidence
        .controlledLiveExecutionAuthorizationReady,
      true
    );

    assert.equal(
      liveEvidence.signerAuthorized,
      true
    );

    assert.equal(
      liveEvidence.signingAuthorized,
      true
    );

    assert.equal(
      liveEvidence.broadcastAuthorized,
      true
    );

    assert.equal(
      liveEvidence.liveExecutionAuthorized,
      true
    );

    assert.equal(
      result
        .controlledLiveExecutionAuthorizationCompositionReady,
      true
    );

    assert.equal(Object.isFrozen(result), true);
  }
);

test(
  "1S.73 requires controlled broadcast authorization composition evidence object",
  async () => {
    const {
      buildControlledLiveExecutionAuthorizationCompositionEvidence
    } = loadSubject();

    await assert.rejects(
      () =>
        buildControlledLiveExecutionAuthorizationCompositionEvidence({
          controlledBroadcastAuthorizationCompositionEvidence:
            null,
          authorizeControlledLiveExecution:
            async () => true
        }),
      /Controlled broadcast authorization composition evidence must be an object/
    );
  }
);

test(
  "1S.73 requires controlled broadcast authorization composition readiness",
  async () => {
    const {
      buildControlledLiveExecutionAuthorizationCompositionEvidence
    } = loadSubject();

    const base =
      make1S72Composition();

    const composition = {
      ...base,
      controlledBroadcastAuthorizationCompositionReady:
        false
    };

    await assert.rejects(
      () =>
        buildControlledLiveExecutionAuthorizationCompositionEvidence({
          controlledBroadcastAuthorizationCompositionEvidence:
            composition,
          authorizeControlledLiveExecution:
            async () => true
        }),
      /Controlled broadcast authorization composition evidence is not ready/
    );
  }
);

test(
  "1S.73 requires contained controlled broadcast authorization evidence object",
  async () => {
    const {
      buildControlledLiveExecutionAuthorizationCompositionEvidence
    } = loadSubject();

    const base =
      make1S72Composition();

    const composition = {
      ...base,
      controlledBroadcastAuthorizationEvidence:
        null
    };

    await assert.rejects(
      () =>
        buildControlledLiveExecutionAuthorizationCompositionEvidence({
          controlledBroadcastAuthorizationCompositionEvidence:
            composition,
          authorizeControlledLiveExecution:
            async () => true
        }),
      /Controlled broadcast authorization evidence must be an object/
    );
  }
);

test(
  "1S.73 requires contained controlled broadcast authorization readiness",
  async () => {
    const {
      buildControlledLiveExecutionAuthorizationCompositionEvidence
    } = loadSubject();

    const base =
      make1S72Composition();

    const composition = {
      ...base,
      controlledBroadcastAuthorizationEvidence: {
        ...base
          .controlledBroadcastAuthorizationEvidence,
        controlledBroadcastAuthorizationReady:
          false
      }
    };

    await assert.rejects(
      () =>
        buildControlledLiveExecutionAuthorizationCompositionEvidence({
          controlledBroadcastAuthorizationCompositionEvidence:
            composition,
          authorizeControlledLiveExecution:
            async () => true
        }),
      /Controlled broadcast authorization evidence is not ready/
    );
  }
);

test(
  "1S.73 rejects controlled live execution authorization that does not return exactly true",
  async () => {
    const {
      buildControlledLiveExecutionAuthorizationCompositionEvidence
    } = loadSubject();

    const composition =
      make1S72Composition();

    let authorizationCalls = 0;

    await assert.rejects(
      () =>
        buildControlledLiveExecutionAuthorizationCompositionEvidence({
          controlledBroadcastAuthorizationCompositionEvidence:
            composition,

          authorizeControlledLiveExecution:
            async () => {
              authorizationCalls += 1;
              return false;
            }
        }),
      /controlled live execution authorization must return exactly true/
    );

    assert.equal(authorizationCalls, 1);
  }
);

test(
  "1S.73 propagates controlled live execution authorization callback failure after exactly one invocation",
  async () => {
    const {
      buildControlledLiveExecutionAuthorizationCompositionEvidence
    } = loadSubject();

    const composition =
      make1S72Composition();

    let authorizationCalls = 0;

    await assert.rejects(
      () =>
        buildControlledLiveExecutionAuthorizationCompositionEvidence({
          controlledBroadcastAuthorizationCompositionEvidence:
            composition,

          authorizeControlledLiveExecution:
            async () => {
              authorizationCalls += 1;
              throw new Error(
                "synthetic live execution authorization rejection"
              );
            }
        }),
      /synthetic live execution authorization rejection/
    );

    assert.equal(authorizationCalls, 1);
  }
);
