"use strict";

const { ethers } = require("ethers");

const POLYGON_CHAIN_ID = 137;

function requireObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new TypeError(
      `${label} must be an object`
    );
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
    throw new TypeError(
      `provider.${method} must be a function`
    );
  }
}

function requireSigningState(evidence) {
  if (
    evidence.transactionSigningReady !== true
  ) {
    throw new Error(
      "transaction signing evidence must be ready"
    );
  }

  if (
    evidence.signerAuthorized !== true ||
    evidence.signingAuthorized !== true
  ) {
    throw new Error(
      "signer and signing authorization must remain true"
    );
  }

  if (
    evidence.liveExecutionAuthorized !== false ||
    evidence.broadcastAuthorized !== false
  ) {
    throw new Error(
      "execution and broadcast authorization must remain false"
    );
  }
}

function requireEnvelope(envelope) {
  requireObject(
    envelope,
    "transactionEnvelope"
  );

  if (
    !ethers.utils.isAddress(envelope.from) ||
    envelope.from ===
      ethers.constants.AddressZero
  ) {
    throw new Error(
      "transaction envelope from address invalid"
    );
  }

  if (
    !ethers.utils.isAddress(envelope.to) ||
    envelope.to ===
      ethers.constants.AddressZero
  ) {
    throw new Error(
      "transaction envelope to address invalid"
    );
  }

  if (
    typeof envelope.data !== "string" ||
    !ethers.utils.isHexString(envelope.data) ||
    envelope.data === "0x"
  ) {
    throw new Error(
      "transaction envelope data invalid"
    );
  }

  if (
    !ethers.BigNumber.isBigNumber(
      envelope.value
    ) ||
    !envelope.value.isZero()
  ) {
    throw new Error(
      "transaction envelope value must remain zero"
    );
  }

  if (
    envelope.chainId !==
    POLYGON_CHAIN_ID
  ) {
    throw new Error(
      "transaction envelope chain ID 137 required"
    );
  }

  if (
    !Number.isSafeInteger(envelope.nonce) ||
    envelope.nonce < 0
  ) {
    throw new Error(
      "transaction envelope nonce invalid"
    );
  }

  for (const [
    field,
    label
  ] of [
    ["gasLimit", "gasLimit"],
    ["maxFeePerGas", "maxFeePerGas"],
    [
      "maxPriorityFeePerGas",
      "maxPriorityFeePerGas"
    ]
  ]) {
    if (
      !ethers.BigNumber.isBigNumber(
        envelope[field]
      ) ||
      envelope[field].lte(0)
    ) {
      throw new Error(
        `transaction envelope ${label} must be positive BigNumber`
      );
    }
  }

  if (
    envelope.maxFeePerGas.lt(
      envelope.maxPriorityFeePerGas
    )
  ) {
    throw new Error(
      "transaction envelope maxFeePerGas must be at least maxPriorityFeePerGas"
    );
  }

  return envelope;
}

async function validateFinalSignedTransactionCurrentStateEvidence({
  transactionSigningEvidence,
  provider
} = {}) {
  const evidence =
    requireObject(
      transactionSigningEvidence,
      "transactionSigningEvidence"
    );

  requireSigningState(evidence);

  const signerCapabilityBindingEvidence =
    requireObject(
      evidence.signerCapabilityBindingEvidence,
      "signer capability binding evidence"
    );

  if (
    signerCapabilityBindingEvidence
      .signerCapabilityBindingReady !== true
  ) {
    throw new Error(
      "signer capability binding evidence must be ready"
    );
  }

  if (
    signerCapabilityBindingEvidence
      .signerAuthorized !== true ||
    signerCapabilityBindingEvidence
      .signingAuthorized !== true
  ) {
    throw new Error(
      "signer capability binding authorization must remain true"
    );
  }

  if (
    signerCapabilityBindingEvidence
      .liveExecutionAuthorized !== false ||
    signerCapabilityBindingEvidence
      .broadcastAuthorized !== false
  ) {
    throw new Error(
      "signer capability binding execution and broadcast authorization must remain false"
    );
  }

  const transactionEnvelope =
    requireEnvelope(
      evidence.transactionEnvelope
    );

  if (
    signerCapabilityBindingEvidence
      .transactionEnvelope !==
    transactionEnvelope
  ) {
    throw new Error(
      "transaction envelope identity mismatch with signer capability binding evidence"
    );
  }

  const signerAddress =
    ethers.utils.getAddress(
      evidence.signerAddress
    );

  const signerCapabilityAddress =
    ethers.utils.getAddress(
      evidence.signerCapabilityAddress
    );

  const bindingSignerAddress =
    ethers.utils.getAddress(
      signerCapabilityBindingEvidence
        .signerAddress
    );

  const bindingSignerCapabilityAddress =
    ethers.utils.getAddress(
      signerCapabilityBindingEvidence
        .signerCapabilityAddress
    );

  const envelopeFrom =
    ethers.utils.getAddress(
      transactionEnvelope.from
    );

  if (
    signerAddress !== bindingSignerAddress ||
    signerCapabilityAddress !==
      bindingSignerCapabilityAddress ||
    signerAddress !== signerCapabilityAddress ||
    signerAddress !== envelopeFrom
  ) {
    throw new Error(
      "signer identity mismatch with signer capability binding evidence"
    );
  }

  requireObject(
    provider,
    "provider"
  );

  requireProviderMethod(
    provider,
    "getNetwork"
  );

  requireProviderMethod(
    provider,
    "getTransactionCount"
  );

  requireProviderMethod(
    provider,
    "call"
  );

  const network =
    requireObject(
      await provider.getNetwork(),
      "provider network"
    );

  if (
    network.chainId !==
    POLYGON_CHAIN_ID
  ) {
    throw new Error(
      "current Polygon chain ID 137 required"
    );
  }

  const pendingNonce =
    await provider.getTransactionCount(
      transactionEnvelope.from,
      "pending"
    );

  if (
    !Number.isSafeInteger(pendingNonce) ||
    pendingNonce < 0
  ) {
    throw new Error(
      "current pending nonce invalid"
    );
  }

  if (
    pendingNonce !==
    transactionEnvelope.nonce
  ) {
    throw new Error(
      "current pending nonce does not match signed transaction nonce"
    );
  }

  /*
   * As in 1S.34, ethers v5 provider.call()
   * does not preserve chainId or nonce through
   * its public transaction-request normalization.
   *
   * Those fields are therefore validated
   * independently above. The exact immutable
   * envelope supplies every executable field
   * supported by the call projection.
   */
  const callRequest =
    Object.freeze({
      from: transactionEnvelope.from,
      to: transactionEnvelope.to,
      data: transactionEnvelope.data,
      value: transactionEnvelope.value,
      gasLimit:
        transactionEnvelope.gasLimit,
      maxFeePerGas:
        transactionEnvelope.maxFeePerGas,
      maxPriorityFeePerGas:
        transactionEnvelope.maxPriorityFeePerGas
    });

  const simulationResult =
    await provider.call(
      callRequest
    );

  return Object.freeze({
    transactionSigningEvidence:
      evidence,

    transactionEnvelope,

    signedRawTransaction:
      evidence.signedRawTransaction,

    signedTransactionHash:
      evidence.signedTransactionHash,

    callRequest,
    simulationResult,

    finalSignedTransactionCurrentStateReady:
      true,

    signerAuthorized: true,
    signingAuthorized: true,

    liveExecutionAuthorized: false,
    broadcastAuthorized: false
  });
}

module.exports = {
  validateFinalSignedTransactionCurrentStateEvidence
};
