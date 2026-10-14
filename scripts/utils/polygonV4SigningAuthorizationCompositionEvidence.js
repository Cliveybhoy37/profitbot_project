"use strict";

const {
  acquireSigningAuthorizationEvidence
} = require(
  "./polygonV4SigningAuthorizationEvidence"
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

async function buildSigningAuthorizationCompositionEvidence({
  signerAuthorizationCompositionEvidence,
  authorizeTransactionSigning
} = {}) {
  const composition =
    requireObject(
      signerAuthorizationCompositionEvidence,
      "Signer authorization composition evidence"
    );

  if (
    composition.signerAuthorizationCompositionReady !==
    true
  ) {
    throw new Error(
      "Signer authorization composition evidence is not ready"
    );
  }

  const signerAuthorizationEvidence =
    requireObject(
      composition.signerAuthorizationEvidence,
      "Signer authorization evidence"
    );

  if (
    signerAuthorizationEvidence.signerAuthorizationReady !==
    true
  ) {
    throw new Error(
      "Signer authorization evidence is not ready"
    );
  }

  const signingAuthorizationEvidence =
    await acquireSigningAuthorizationEvidence({
      signerAuthorizationEvidence,
      authorizeTransactionSigning
    });

  return Object.freeze({
    signerAuthorizationCompositionEvidence:
      composition,

    signingAuthorizationEvidence,

    signingAuthorizationCompositionReady:
      true
  });
}

module.exports = {
  buildSigningAuthorizationCompositionEvidence
};
