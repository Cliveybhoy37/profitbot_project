"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

function loadSubject() {
  return require(
    "../scripts/utils/" +
    "polygonV4ControlledBroadcastAuthorizationCompositionEvidence"
  );
}

function make1S71Composition() {
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

  return Object.freeze({
    finalSignedTransactionCurrentStateEvidence,
    finalSignedTransactionCurrentStateValidationCompositionReady:
      true
  });
}

test(
  "1S.72 bridges final signed transaction current-state validation composition into controlled broadcast authorization without submission or live execution",
  async () => {
    const {
      buildControlledBroadcastAuthorizationCompositionEvidence
    } = loadSubject();

    const composition =
      make1S71Composition();

    let authorizationCalls = 0;
    let receivedAuthorization;

    const result =
      await buildControlledBroadcastAuthorizationCompositionEvidence({
        finalSignedTransactionCurrentStateValidationCompositionEvidence:
          composition,

        authorizeControlledBroadcast:
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
        .finalSignedTransactionCurrentStateEvidence
        .transactionEnvelope
    );

    assert.equal(
      receivedAuthorization.signedTransactionHash,
      composition
        .finalSignedTransactionCurrentStateEvidence
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
        .finalSignedTransactionCurrentStateValidationCompositionEvidence,
      composition
    );

    const authorizationEvidence =
      result.controlledBroadcastAuthorizationEvidence;

    assert.equal(
      authorizationEvidence
        .finalSignedTransactionCurrentStateEvidence,
      composition
        .finalSignedTransactionCurrentStateEvidence
    );

    assert.equal(
      authorizationEvidence
        .controlledBroadcastAuthorizationReady,
      true
    );

    assert.equal(
      authorizationEvidence.signerAuthorized,
      true
    );

    assert.equal(
      authorizationEvidence.signingAuthorized,
      true
    );

    assert.equal(
      authorizationEvidence.liveExecutionAuthorized,
      false
    );

    assert.equal(
      authorizationEvidence.broadcastAuthorized,
      true
    );

    assert.equal(
      result
        .controlledBroadcastAuthorizationCompositionReady,
      true
    );

    assert.equal(Object.isFrozen(result), true);
  }
);

test(
  "1S.72 requires final signed transaction current-state validation composition evidence object",
  async () => {
    const {
      buildControlledBroadcastAuthorizationCompositionEvidence
    } = loadSubject();

    await assert.rejects(
      () =>
        buildControlledBroadcastAuthorizationCompositionEvidence({
          finalSignedTransactionCurrentStateValidationCompositionEvidence:
            null,
          authorizeControlledBroadcast:
            async () => true
        }),
      /Final signed transaction current-state validation composition evidence must be an object/
    );
  }
);

test(
  "1S.72 requires final signed transaction current-state validation composition readiness",
  async () => {
    const {
      buildControlledBroadcastAuthorizationCompositionEvidence
    } = loadSubject();

    const base =
      make1S71Composition();

    const composition = {
      ...base,
      finalSignedTransactionCurrentStateValidationCompositionReady:
        false
    };

    await assert.rejects(
      () =>
        buildControlledBroadcastAuthorizationCompositionEvidence({
          finalSignedTransactionCurrentStateValidationCompositionEvidence:
            composition,
          authorizeControlledBroadcast:
            async () => true
        }),
      /Final signed transaction current-state validation composition evidence is not ready/
    );
  }
);

test(
  "1S.72 requires contained final signed transaction current-state evidence object",
  async () => {
    const {
      buildControlledBroadcastAuthorizationCompositionEvidence
    } = loadSubject();

    const base =
      make1S71Composition();

    const composition = {
      ...base,
      finalSignedTransactionCurrentStateEvidence:
        null
    };

    await assert.rejects(
      () =>
        buildControlledBroadcastAuthorizationCompositionEvidence({
          finalSignedTransactionCurrentStateValidationCompositionEvidence:
            composition,
          authorizeControlledBroadcast:
            async () => true
        }),
      /Final signed transaction current-state evidence must be an object/
    );
  }
);

test(
  "1S.72 requires contained final signed transaction current-state readiness",
  async () => {
    const {
      buildControlledBroadcastAuthorizationCompositionEvidence
    } = loadSubject();

    const base =
      make1S71Composition();

    const composition = {
      ...base,
      finalSignedTransactionCurrentStateEvidence: {
        ...base
          .finalSignedTransactionCurrentStateEvidence,
        finalSignedTransactionCurrentStateReady:
          false
      }
    };

    await assert.rejects(
      () =>
        buildControlledBroadcastAuthorizationCompositionEvidence({
          finalSignedTransactionCurrentStateValidationCompositionEvidence:
            composition,
          authorizeControlledBroadcast:
            async () => true
        }),
      /Final signed transaction current-state evidence is not ready/
    );
  }
);

test(
  "1S.72 rejects controlled broadcast authorization that does not return exactly true",
  async () => {
    const {
      buildControlledBroadcastAuthorizationCompositionEvidence
    } = loadSubject();

    const composition =
      make1S71Composition();

    let authorizationCalls = 0;

    await assert.rejects(
      () =>
        buildControlledBroadcastAuthorizationCompositionEvidence({
          finalSignedTransactionCurrentStateValidationCompositionEvidence:
            composition,

          authorizeControlledBroadcast:
            async () => {
              authorizationCalls += 1;
              return false;
            }
        }),
      /controlled broadcast authorization must return exactly true/
    );

    assert.equal(authorizationCalls, 1);
  }
);

test(
  "1S.72 propagates controlled broadcast authorization callback failure after exactly one invocation",
  async () => {
    const {
      buildControlledBroadcastAuthorizationCompositionEvidence
    } = loadSubject();

    const composition =
      make1S71Composition();

    let authorizationCalls = 0;

    await assert.rejects(
      () =>
        buildControlledBroadcastAuthorizationCompositionEvidence({
          finalSignedTransactionCurrentStateValidationCompositionEvidence:
            composition,

          authorizeControlledBroadcast:
            async () => {
              authorizationCalls += 1;
              throw new Error(
                "synthetic authorization rejection"
              );
            }
        }),
      /synthetic authorization rejection/
    );

    assert.equal(authorizationCalls, 1);
  }
);
