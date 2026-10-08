"use strict";

const {
  acquireControlledLiveExecutionAuthorizationEvidence
} = require(
  "./polygonV4ControlledLiveExecutionAuthorizationEvidence"
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

async function buildControlledLiveExecutionAuthorizationCompositionEvidence({
  controlledBroadcastAuthorizationCompositionEvidence,
  authorizeControlledLiveExecution
} = {}) {
  const composition =
    requireObject(
      controlledBroadcastAuthorizationCompositionEvidence,
      "Controlled broadcast authorization composition evidence"
    );

  if (
    composition
      .controlledBroadcastAuthorizationCompositionReady !==
    true
  ) {
    throw new Error(
      "Controlled broadcast authorization composition evidence is not ready"
    );
  }

  const controlledBroadcastAuthorizationEvidence =
    requireObject(
      composition
        .controlledBroadcastAuthorizationEvidence,
      "Controlled broadcast authorization evidence"
    );

  if (
    controlledBroadcastAuthorizationEvidence
      .controlledBroadcastAuthorizationReady !==
    true
  ) {
    throw new Error(
      "Controlled broadcast authorization evidence is not ready"
    );
  }

  const controlledLiveExecutionAuthorizationEvidence =
    await acquireControlledLiveExecutionAuthorizationEvidence({
      controlledBroadcastAuthorizationEvidence,
      authorizeControlledLiveExecution
    });

  return Object.freeze({
    controlledBroadcastAuthorizationCompositionEvidence:
      composition,

    controlledLiveExecutionAuthorizationEvidence,

    controlledLiveExecutionAuthorizationCompositionReady:
      true
  });
}

module.exports = {
  buildControlledLiveExecutionAuthorizationCompositionEvidence
};
