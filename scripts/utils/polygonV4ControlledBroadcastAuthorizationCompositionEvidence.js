"use strict";

const {
  acquireControlledBroadcastAuthorizationEvidence
} = require(
  "./polygonV4ControlledBroadcastAuthorizationEvidence"
);

function requireObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      `${label} must be an object`
    );
  }

  return value;
}

async function buildControlledBroadcastAuthorizationCompositionEvidence({
  finalSignedTransactionCurrentStateValidationCompositionEvidence,
  authorizeControlledBroadcast
} = {}) {
  const composition =
    requireObject(
      finalSignedTransactionCurrentStateValidationCompositionEvidence,
      "Final signed transaction current-state validation composition evidence"
    );

  if (
    composition
      .finalSignedTransactionCurrentStateValidationCompositionReady !==
    true
  ) {
    throw new Error(
      "Final signed transaction current-state validation composition evidence is not ready"
    );
  }

  const finalSignedTransactionCurrentStateEvidence =
    requireObject(
      composition
        .finalSignedTransactionCurrentStateEvidence,
      "Final signed transaction current-state evidence"
    );

  if (
    finalSignedTransactionCurrentStateEvidence
      .finalSignedTransactionCurrentStateReady !==
    true
  ) {
    throw new Error(
      "Final signed transaction current-state evidence is not ready"
    );
  }

  const controlledBroadcastAuthorizationEvidence =
    await acquireControlledBroadcastAuthorizationEvidence({
      finalSignedTransactionCurrentStateEvidence,
      authorizeControlledBroadcast
    });

  return Object.freeze({
    finalSignedTransactionCurrentStateValidationCompositionEvidence:
      composition,

    controlledBroadcastAuthorizationEvidence,

    controlledBroadcastAuthorizationCompositionReady:
      true
  });
}

module.exports = {
  buildControlledBroadcastAuthorizationCompositionEvidence
};
