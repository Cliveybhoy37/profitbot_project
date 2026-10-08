"use strict";

const {
  acquireExactTransactionSigningEvidence
} = require(
  "./polygonV4ExactTransactionSigningEvidence"
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

async function buildExactTransactionSigningCompositionEvidence({
  signerCapabilityBindingCompositionEvidence,
  signTransaction
} = {}) {
  const composition =
    requireObject(
      signerCapabilityBindingCompositionEvidence,
      "Signer capability binding composition evidence"
    );

  if (
    composition.signerCapabilityBindingCompositionReady !==
    true
  ) {
    throw new Error(
      "Signer capability binding composition evidence is not ready"
    );
  }

  const signerCapabilityBindingEvidence =
    requireObject(
      composition.signerCapabilityBindingEvidence,
      "Signer capability binding evidence"
    );

  if (
    signerCapabilityBindingEvidence.signerCapabilityBindingReady !==
    true
  ) {
    throw new Error(
      "Signer capability binding evidence is not ready"
    );
  }

  const exactTransactionSigningEvidence =
    await acquireExactTransactionSigningEvidence({
      signerCapabilityBindingEvidence,
      signTransaction
    });

  return Object.freeze({
    signerCapabilityBindingCompositionEvidence:
      composition,

    exactTransactionSigningEvidence,

    exactTransactionSigningCompositionReady:
      true
  });
}

module.exports = {
  buildExactTransactionSigningCompositionEvidence
};
