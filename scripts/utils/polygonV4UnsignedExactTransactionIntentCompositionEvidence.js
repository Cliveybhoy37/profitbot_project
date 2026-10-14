"use strict";

const {
  buildUnsignedExactTransactionIntentEvidence
} = require(
  "./polygonV4UnsignedExactTransactionIntentEvidence"
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

function buildUnsignedExactTransactionIntentCompositionEvidence({
  accountCallerIdentityCompositionEvidence
} = {}) {
  const composition =
    requireObject(
      accountCallerIdentityCompositionEvidence,
      "Account/caller identity composition evidence"
    );

  if (
    composition
      .accountCallerIdentityCompositionReady !==
    true
  ) {
    throw new Error(
      "Account/caller identity composition evidence is not ready"
    );
  }

  const accountCallerIdentityEvidence =
    requireObject(
      composition.accountCallerIdentityEvidence,
      "Account/caller identity evidence"
    );

  if (
    accountCallerIdentityEvidence
      .accountCallerIdentityReady !==
    true
  ) {
    throw new Error(
      "Account/caller identity evidence is not ready"
    );
  }

  const unsignedTransactionIntentEvidence =
    buildUnsignedExactTransactionIntentEvidence({
      accountCallerIdentityEvidence
    });

  return Object.freeze({
    accountCallerIdentityCompositionEvidence:
      composition,

    unsignedTransactionIntentEvidence,

    unsignedExactTransactionIntentCompositionReady:
      true
  });
}

module.exports = {
  buildUnsignedExactTransactionIntentCompositionEvidence
};
