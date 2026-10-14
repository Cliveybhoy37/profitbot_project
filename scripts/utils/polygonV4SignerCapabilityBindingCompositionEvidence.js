"use strict";

const {
  acquireSignerCapabilityBindingEvidence
} = require(
  "./polygonV4SignerCapabilityBindingEvidence"
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

async function buildSignerCapabilityBindingCompositionEvidence({
  signingAuthorizationCompositionEvidence,
  getSignerCapabilityAddress
} = {}) {
  const composition =
    requireObject(
      signingAuthorizationCompositionEvidence,
      "Signing authorization composition evidence"
    );

  if (
    composition.signingAuthorizationCompositionReady !==
    true
  ) {
    throw new Error(
      "Signing authorization composition evidence is not ready"
    );
  }

  const signingAuthorizationEvidence =
    requireObject(
      composition.signingAuthorizationEvidence,
      "Signing authorization evidence"
    );

  if (
    signingAuthorizationEvidence.signingAuthorizationReady !==
    true
  ) {
    throw new Error(
      "Signing authorization evidence is not ready"
    );
  }

  const signerCapabilityBindingEvidence =
    await acquireSignerCapabilityBindingEvidence({
      signingAuthorizationEvidence,
      getSignerCapabilityAddress
    });

  return Object.freeze({
    signingAuthorizationCompositionEvidence:
      composition,

    signerCapabilityBindingEvidence,

    signerCapabilityBindingCompositionReady:
      true
  });
}

module.exports = {
  buildSignerCapabilityBindingCompositionEvidence
};
