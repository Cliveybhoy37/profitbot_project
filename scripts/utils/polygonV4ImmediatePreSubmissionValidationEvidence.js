"use strict";

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

function requireLiveExecutionAuthorization(
  evidence
) {
  if (
    evidence
      .controlledLiveExecutionAuthorizationReady !==
    true
  ) {
    throw new Error(
      "controlled live execution authorization evidence must be ready"
    );
  }

  if (
    evidence.signerAuthorized !== true ||
    evidence.signingAuthorized !== true ||
    evidence.broadcastAuthorized !== true ||
    evidence.liveExecutionAuthorized !== true
  ) {
    throw new Error(
      "signer, signing, broadcast, and live execution authorization must remain true"
    );
  }
}

function requireTransactionArtifacts(
  evidence,
  upstreamEvidence,
  upstreamLabel
) {
  const transactionEnvelope =
    requireObject(
      evidence.transactionEnvelope,
      "transactionEnvelope"
    );

  if (
    upstreamEvidence.transactionEnvelope !==
    transactionEnvelope
  ) {
    throw new Error(
      `transaction envelope mismatch with ${upstreamLabel}`
    );
  }

  const signedRawTransaction =
    evidence.signedRawTransaction;

  if (
    typeof signedRawTransaction !== "string" ||
    signedRawTransaction.length === 0
  ) {
    throw new TypeError(
      "signedRawTransaction must be a non-empty string"
    );
  }

  if (
    upstreamEvidence.signedRawTransaction !==
    signedRawTransaction
  ) {
    throw new Error(
      `signed raw transaction mismatch with ${upstreamLabel}`
    );
  }

  const signedTransactionHash =
    evidence.signedTransactionHash;

  if (
    typeof signedTransactionHash !== "string" ||
    signedTransactionHash.length === 0
  ) {
    throw new TypeError(
      "signedTransactionHash must be a non-empty string"
    );
  }

  if (
    upstreamEvidence.signedTransactionHash !==
    signedTransactionHash
  ) {
    throw new Error(
      `signed transaction hash mismatch with ${upstreamLabel}`
    );
  }

  return {
    transactionEnvelope,
    signedRawTransaction,
    signedTransactionHash
  };
}

async function validateImmediatePreSubmissionEvidence({
  controlledLiveExecutionAuthorizationEvidence,
  provider
} = {}) {
  const liveEvidence =
    requireObject(
      controlledLiveExecutionAuthorizationEvidence,
      "controlledLiveExecutionAuthorizationEvidence"
    );

  requireLiveExecutionAuthorization(
    liveEvidence
  );

  const broadcastEvidence =
    requireObject(
      liveEvidence
        .controlledBroadcastAuthorizationEvidence,
      "controlled broadcast authorization evidence"
    );

  const {
    transactionEnvelope,
    signedRawTransaction,
    signedTransactionHash
  } = requireTransactionArtifacts(
    liveEvidence,
    broadcastEvidence,
    "controlled broadcast authorization evidence"
  );

  const finalEvidence =
    requireObject(
      broadcastEvidence
        .finalSignedTransactionCurrentStateEvidence,
      "final signed transaction current-state evidence"
    );

  requireTransactionArtifacts(
    broadcastEvidence,
    finalEvidence,
    "final signed transaction current-state evidence"
  );

  /*
   * 1S.43 intentionally validates the immediate
   * 1S.42 authorization state rather than
   * reinterpreting the historical false
   * authorization flags preserved by 1S.40.
   *
   * The transaction artifacts themselves must
   * remain identical across 1S.42 -> 1S.41 ->
   * 1S.40.
   */

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
   * Preserve the same seven-field ethers v5
   * provider.call projection established by
   * 1S.34 and repeated by 1S.40.
   *
   * chainId and nonce are validated separately
   * because provider.call does not preserve them
   * through its public transaction-request
   * normalization.
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
    controlledLiveExecutionAuthorizationEvidence:
      liveEvidence,

    controlledBroadcastAuthorizationEvidence:
      broadcastEvidence,

    finalSignedTransactionCurrentStateEvidence:
      finalEvidence,

    transactionEnvelope,

    signedRawTransaction,
    signedTransactionHash,

    callRequest,
    simulationResult,

    immediatePreSubmissionValidationReady:
      true,

    signerAuthorized: true,
    signingAuthorized: true,
    broadcastAuthorized: true,
    liveExecutionAuthorized: true
  });
}

module.exports = {
  validateImmediatePreSubmissionEvidence
};
