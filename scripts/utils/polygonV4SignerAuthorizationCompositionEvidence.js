"use strict";

const {
  acquireSignerAuthorizationEvidence
} = require(
  "./polygonV4SignerAuthorizationEvidence"
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

async function buildSignerAuthorizationCompositionEvidence({
  prospectiveSignerIdentityAcquisitionCompositionEvidence,
  authorizeSignerIdentity
} = {}) {
  const composition =
    requireObject(
      prospectiveSignerIdentityAcquisitionCompositionEvidence,
      "Prospective signer identity acquisition composition evidence"
    );

  if (
    composition
      .prospectiveSignerIdentityAcquisitionCompositionReady !==
    true
  ) {
    throw new Error(
      "Prospective signer identity acquisition composition evidence is not ready"
    );
  }

  const prospectiveSignerIdentityEvidence =
    requireObject(
      composition.prospectiveSignerIdentityEvidence,
      "Prospective signer identity evidence"
    );

  if (
    prospectiveSignerIdentityEvidence
      .prospectiveSignerIdentityReady !==
    true
  ) {
    throw new Error(
      "Prospective signer identity evidence is not ready"
    );
  }

  const signerAuthorizationEvidence =
    await acquireSignerAuthorizationEvidence({
      prospectiveSignerIdentityEvidence,
      authorizeSignerIdentity
    });

  return Object.freeze({
    prospectiveSignerIdentityAcquisitionCompositionEvidence:
      composition,

    signerAuthorizationEvidence,

    signerAuthorizationCompositionReady:
      true
  });
}

module.exports = {
  buildSignerAuthorizationCompositionEvidence
};
