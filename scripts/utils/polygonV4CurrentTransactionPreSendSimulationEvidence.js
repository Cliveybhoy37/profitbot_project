"use strict";

function requireObject(
  value,
  label
) {
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

function requireAuthorizationFalse(
  evidence,
  label
) {
  if (
    evidence.liveExecutionAuthorized !== false ||
    evidence.signerAuthorized !== false ||
    evidence.broadcastAuthorized !== false
  ) {
    throw new Error(
      `${label} authorization must remain false`
    );
  }
}

async function acquireCurrentTransactionPreSendSimulationEvidence({
  currentTransactionEnvelopeEvidence,
  provider
}) {
  const evidence =
    requireObject(
      currentTransactionEnvelopeEvidence,
      "currentTransactionEnvelopeEvidence"
    );

  if (
    evidence.currentTransactionEnvelopeReady !==
    true
  ) {
    throw new Error(
      "Current transaction envelope must be ready"
    );
  }

  requireAuthorizationFalse(
    evidence,
    "Current transaction envelope evidence"
  );

  const selection =
    requireObject(
      evidence.currentTransactionGasLimitSelectionEvidence,
      "Current transaction gas-limit selection evidence"
    );

  const estimation =
    requireObject(
      evidence.currentTransactionGasEstimationEvidence,
      "Current transaction gas estimation evidence"
    );

  const parameters =
    requireObject(
      evidence.currentTransactionParameterEvidence,
      "Current transaction parameter evidence"
    );

  const unsigned =
    requireObject(
      evidence.unsignedTransactionIntentEvidence,
      "Unsigned transaction intent evidence"
    );

  const transactionIntent =
    requireObject(
      evidence.transactionIntent,
      "Transaction intent"
    );

  /*
   * 1S.34 does not rebuild or reacquire 1S.33 evidence.
   * It only proves that the already-composed envelope has
   * not drifted from the exact upstream evidence identities.
   */
  if (
    selection.currentTransactionGasEstimationEvidence !==
      estimation ||
    selection.currentTransactionParameterEvidence !==
      parameters ||
    selection.unsignedTransactionIntentEvidence !==
      unsigned ||
    selection.transactionIntent !==
      transactionIntent
  ) {
    throw new Error(
      "Current transaction envelope upstream evidence identity mismatch"
    );
  }

  if (
    estimation.currentTransactionParameterEvidence !==
      parameters ||
    estimation.unsignedTransactionIntentEvidence !==
      unsigned ||
    estimation.transactionIntent !==
      transactionIntent ||
    parameters.unsignedTransactionIntentEvidence !==
      unsigned ||
    parameters.transactionIntent !==
      transactionIntent ||
    unsigned.transactionIntent !==
      transactionIntent
  ) {
    throw new Error(
      "Current transaction envelope upstream evidence identity mismatch"
    );
  }

  if (
    selection.currentTransactionGasLimitSelectionReady !==
    true
  ) {
    throw new Error(
      "Current transaction gas-limit selection evidence must be ready"
    );
  }

  requireAuthorizationFalse(
    selection,
    "Current transaction gas-limit selection evidence"
  );

  if (
    estimation.currentTransactionGasEstimationReady !==
    true
  ) {
    throw new Error(
      "Current transaction gas estimation evidence must be ready"
    );
  }

  requireAuthorizationFalse(
    estimation,
    "Current transaction gas estimation evidence"
  );

  if (
    parameters.currentTransactionParametersReady !==
    true
  ) {
    throw new Error(
      "Current transaction parameter evidence must be ready"
    );
  }

  requireAuthorizationFalse(
    parameters,
    "Current transaction parameter evidence"
  );

  if (
    unsigned.unsignedTransactionIntentReady !==
    true
  ) {
    throw new Error(
      "Unsigned transaction intent evidence must be ready"
    );
  }

  requireAuthorizationFalse(
    unsigned,
    "Unsigned transaction intent evidence"
  );

  const transactionEnvelope =
    requireObject(
      evidence.transactionEnvelope,
      "transactionEnvelope"
    );

  if (
    transactionEnvelope.from !==
      transactionIntent.from ||
    transactionEnvelope.to !==
      transactionIntent.to ||
    transactionEnvelope.data !==
      transactionIntent.data ||
    transactionEnvelope.value !==
      transactionIntent.value
  ) {
    throw new Error(
      "Current transaction envelope transaction intent mismatch"
    );
  }

  if (
    transactionEnvelope.chainId !==
      parameters.chainId ||
    transactionEnvelope.nonce !==
      parameters.nonce ||
    transactionEnvelope.maxFeePerGas !==
      parameters.maxFeePerGas ||
    transactionEnvelope.maxPriorityFeePerGas !==
      parameters.maxPriorityFeePerGas
  ) {
    throw new Error(
      "Current transaction envelope parameter identity mismatch"
    );
  }

  if (
    transactionEnvelope.gasLimit !==
    selection.selectedGasLimit
  ) {
    throw new Error(
      "Current transaction envelope gas-limit identity mismatch"
    );
  }

  if (
    !provider ||
    typeof provider.call !== "function"
  ) {
    throw new Error(
      "Simulation provider with call capability required"
    );
  }

  /*
   * ethers v5 BaseProvider.call() normalizes transaction
   * requests through _getTransactionRequest(), which does
   * not preserve chainId or nonce.
   *
   * Keep the complete nine-field 1S.33 envelope above as
   * authoritative evidence and explicitly project only the
   * seven fields preserved by the public call path.
   */
  const callRequest = Object.freeze({
    from:
      transactionEnvelope.from,

    to:
      transactionEnvelope.to,

    data:
      transactionEnvelope.data,

    value:
      transactionEnvelope.value,

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
    currentTransactionEnvelopeEvidence:
      evidence,

    transactionEnvelope,

    callRequest,

    simulationResult,

    currentTransactionPreSendSimulationReady:
      true,

    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  });
}

module.exports = {
  acquireCurrentTransactionPreSendSimulationEvidence
};
