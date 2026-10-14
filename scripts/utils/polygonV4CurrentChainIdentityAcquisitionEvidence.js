"use strict";

const POLYGON_CHAIN_ID = 137;

function requireObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(`${label} required`);
  }

  return value;
}

function requireProviderMethod(
  provider,
  method
) {
  if (
    typeof provider[method] !== "function"
  ) {
    throw new Error(
      `Provider ${method} required`
    );
  }
}

async function acquireCurrentChainIdentityEvidence({
  provider
} = {}) {
  requireObject(
    provider,
    "Provider"
  );

  requireProviderMethod(
    provider,
    "getNetwork"
  );

  const network =
    await provider.getNetwork();

  requireObject(
    network,
    "Provider network"
  );

  if (
    network.chainId !==
      POLYGON_CHAIN_ID
  ) {
    throw new Error(
      "Polygon chain ID 137 required"
    );
  }

  const chainEvidence =
    Object.freeze({
      chainId: POLYGON_CHAIN_ID
    });

  return Object.freeze({
    chainEvidence,

    currentChainIdentityAcquisitionReady:
      true
  });
}

module.exports = {
  acquireCurrentChainIdentityEvidence
};
