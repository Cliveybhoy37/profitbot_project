"use strict";

const { ethers } = require("ethers");

const WPOL =
  "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";

const {
  PROTECTED_QUALIFICATION_RUNTIME_POLICY
} = require("./polygonV4ProtectedQualificationRuntimePolicy");

function requireObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(`${label} must be an object`);
  }

  return value;
}

function requireBigNumber(value, label, allowZero = false) {
  if (
    !ethers.BigNumber.isBigNumber(value) ||
    (allowZero ? value.lt(0) : value.lte(0))
  ) {
    throw new Error(`${label} must be a valid nonnegative or positive BigNumber`);
  }

  return value;
}

function requireAuthorizationFalse(evidence, label) {
  if (
    evidence.liveExecutionAuthorized !== false ||
    evidence.signerAuthorized !== false ||
    evidence.broadcastAuthorized !== false
  ) {
    throw new Error(`${label} must remain unauthorized`);
  }
}

function validateFinalTransactionEconomicsEvidence({
  preSendSimulationEvidence
} = {}) {
  const simulation = requireObject(
    preSendSimulationEvidence,
    "Pre-send simulation evidence"
  );

  if (simulation.currentTransactionPreSendSimulationReady !== true) {
    throw new Error("Pre-send simulation must be ready");
  }

  requireAuthorizationFalse(simulation, "Pre-send simulation");

  const envelopeEvidence = requireObject(
    simulation.currentTransactionEnvelopeEvidence,
    "Transaction envelope evidence"
  );

  if (envelopeEvidence.currentTransactionEnvelopeReady !== true) {
    throw new Error("Transaction envelope must be ready");
  }

  requireAuthorizationFalse(envelopeEvidence, "Transaction envelope");

  const envelope = requireObject(
    simulation.transactionEnvelope,
    "Transaction envelope"
  );

  if (envelope !== envelopeEvidence.transactionEnvelope) {
    throw new Error("Transaction envelope identity mismatch");
  }

  if (envelope.chainId !== 137) {
    throw new Error("Polygon chain ID 137 required");
  }

  const gasLimit = requireBigNumber(
    envelope.gasLimit,
    "Transaction gas limit"
  );

  const maxFeePerGas = requireBigNumber(
    envelope.maxFeePerGas,
    "Transaction maxFeePerGas"
  );

  const priorityFee = requireBigNumber(
    envelope.maxPriorityFeePerGas,
    "Transaction maxPriorityFeePerGas",
    true
  );

  if (maxFeePerGas.lt(priorityFee)) {
    throw new Error("Maximum fee cannot be below priority fee");
  }

  const unsigned = requireObject(
    envelopeEvidence.unsignedTransactionIntentEvidence,
    "Unsigned transaction evidence"
  );

  if (unsigned.unsignedTransactionIntentReady !== true) {
    throw new Error("Unsigned transaction evidence must be ready");
  }

  requireAuthorizationFalse(unsigned, "Unsigned transaction");

  const selection = requireObject(
    envelopeEvidence.currentTransactionGasLimitSelectionEvidence,
    "Gas-limit selection evidence"
  );

  const estimation = requireObject(
    envelopeEvidence.currentTransactionGasEstimationEvidence,
    "Gas estimation evidence"
  );

  const parameters = requireObject(
    envelopeEvidence.currentTransactionParameterEvidence,
    "Transaction parameter evidence"
  );

  const intent = requireObject(
    envelopeEvidence.transactionIntent,
    "Preserved transaction intent"
  );

  for (const [label, evidence, flag] of [
    ["Gas-limit selection", selection, "currentTransactionGasLimitSelectionReady"],
    ["Gas estimation", estimation, "currentTransactionGasEstimationReady"],
    ["Transaction parameters", parameters, "currentTransactionParametersReady"]
  ]) {
    if (evidence[flag] !== true) {
      throw new Error(label + " evidence must be ready");
    }

    requireAuthorizationFalse(evidence, label);
  }

  if (
    selection.currentTransactionGasEstimationEvidence !== estimation ||
    selection.currentTransactionParameterEvidence !== parameters ||
    selection.unsignedTransactionIntentEvidence !== unsigned ||
    estimation.currentTransactionParameterEvidence !== parameters ||
    estimation.unsignedTransactionIntentEvidence !== unsigned ||
    parameters.unsignedTransactionIntentEvidence !== unsigned
  ) {
    throw new Error("Upstream transaction evidence identity mismatch");
  }

  if (
    selection.transactionIntent !== intent ||
    estimation.transactionIntent !== intent ||
    parameters.transactionIntent !== intent ||
    unsigned.transactionIntent !== intent
  ) {
    throw new Error("Transaction intent evidence identity mismatch");
  }

  if (
    envelope.gasLimit !== selection.selectedGasLimit ||
    selection.selectedGasLimit !== estimation.estimatedGasUnits
  ) {
    throw new Error("Exact gas-limit evidence identity mismatch");
  }

  if (
    envelope.chainId !== parameters.chainId ||
    envelope.nonce !== parameters.nonce ||
    envelope.maxFeePerGas !== parameters.maxFeePerGas ||
    envelope.maxPriorityFeePerGas !== parameters.maxPriorityFeePerGas
  ) {
    throw new Error("Exact transaction parameter identity mismatch");
  }

  if (
    envelope.from !== intent.from ||
    envelope.to !== intent.to ||
    envelope.data !== intent.data ||
    envelope.value !== intent.value
  ) {
    throw new Error("Exact unsigned transaction intent mismatch");
  }

  const account = requireObject(
    unsigned.accountCallerIdentityEvidence,
    "Account/caller identity evidence"
  );

  if (account.accountCallerIdentityReady !== true) {
    throw new Error("Account/caller identity evidence must be ready");
  }

  requireAuthorizationFalse(account, "Account/caller identity");

  const currentPreflight = requireObject(
    account.currentStatePreflightEvidence,
    "Current-state preflight evidence"
  );

  if (currentPreflight.currentStatePreflightReady !== true) {
    throw new Error("Current-state preflight must be ready");
  }

  requireAuthorizationFalse(currentPreflight, "Current-state preflight");

  const qualified = requireObject(
    currentPreflight.qualifiedContext,
    "Qualified execution context"
  );

  const qualification = requireObject(
    qualified.qualificationResult,
    "Qualification result"
  );

  if (
    qualification.qualified !== true ||
    qualification.stage !== "QUALIFIED"
  ) {
    throw new Error("Successful qualification required");
  }

  const preflight = requireObject(
    qualification.preflight,
    "Authoritative profitability preflight"
  );

  const policy = requireObject(
    qualified.policySnapshot,
    "Authoritative qualification policy"
  );

  if (
    !Number.isSafeInteger(policy.premiumBps) ||
    policy.premiumBps < 0 ||
    policy.premiumBps >= 10000 ||
    qualification.premiumBps !== policy.premiumBps
  ) {
    throw new Error("Qualification premium policy mismatch");
  }

  if (
    !ethers.BigNumber.isBigNumber(qualified.minimumNetProfitWei)
  ) {
    throw new Error("Qualified minimum profit missing");
  }

  const currentState = requireObject(
    currentPreflight.currentStateEvidence,
    "Current-state evidence"
  );

  if (currentState.preflightEvidence !== preflight) {
    throw new Error("Authoritative profitability preflight identity mismatch");
  }

  const candidate = requireObject(
    currentPreflight.candidate,
    "Preserved candidate"
  );

  if (
    candidate !== account.candidate ||
    candidate !== unsigned.candidate ||
    candidate !== qualified.candidate
  ) {
    throw new Error("Candidate identity mismatch");
  }

  const legs = currentPreflight.executionLegs;

  if (
    !Array.isArray(legs) ||
    legs.length !== 3 ||
    legs !== account.executionLegs ||
    legs !== unsigned.executionLegs ||
    legs !== qualified.executionLegs
  ) {
    throw new Error("Execution legs identity mismatch");
  }

  if (
    currentPreflight.executionPlan !== account.executionPlan ||
    currentPreflight.executionPlan !== unsigned.executionPlan ||
    currentPreflight.executionPlan !== qualified.executionPlan
  ) {
    throw new Error("Execution plan identity mismatch");
  }

  if (
    !legs[0] ||
    !legs[2] ||
    typeof legs[0].tokenIn !== "string" ||
    typeof legs[2].tokenOut !== "string" ||
    legs[0].tokenIn.toLowerCase() !== WPOL.toLowerCase() ||
    legs[2].tokenOut.toLowerCase() !== WPOL.toLowerCase()
  ) {
    throw new Error("Final economics require a WPOL-denominated route");
  }

  for (let i = 0; i < legs.length; i++) {
    const leg = requireObject(
      legs[i],
      "Execution leg " + i
    );

    if (
      typeof leg.tokenIn !== "string" ||
      typeof leg.tokenOut !== "string" ||
      !ethers.utils.isAddress(leg.tokenIn) ||
      !ethers.utils.isAddress(leg.tokenOut)
    ) {
      throw new Error("Execution leg token address invalid");
    }

    if (
      i > 0 &&
      legs[i - 1].tokenOut.toLowerCase() !==
        leg.tokenIn.toLowerCase()
    ) {
      throw new Error("Execution route token continuity mismatch");
    }
  }

  const principal = requireBigNumber(
    preflight.amountIn,
    "Flashloan principal"
  );

  const protectedOutput = requireBigNumber(
    preflight.protectedFinalOutput,
    "Protected final output"
  );

  const premium = requireBigNumber(
    preflight.expectedPremium,
    "Flashloan premium",
    true
  );

  const reserve = requireBigNumber(
    preflight.safetyReserve,
    "Safety reserve",
    true
  );

  const minimumProfit = requireBigNumber(
    preflight.minimumNetProfit,
    "Minimum required profit",
    true
  );

  if (!principal.eq(candidate.amountIn)) {
    throw new Error("Flashloan principal mismatch");
  }

  const expectedRoundedPremium = principal
    .mul(policy.premiumBps)
    .add(9999)
    .div(10000);

  if (!premium.eq(expectedRoundedPremium)) {
    throw new Error("Rounded flashloan premium mismatch");
  }

  if (!minimumProfit.eq(qualified.minimumNetProfitWei)) {
    throw new Error("Qualified minimum profit mismatch");
  }

  const protectedQualification =
    PROTECTED_QUALIFICATION_RUNTIME_POLICY.qualification;

  if (reserve.lt(protectedQualification.safetyReserveWei)) {
    throw new Error("Safety reserve below protected runtime policy");
  }

  if (minimumProfit.lt(protectedQualification.minimumNetProfitWei)) {
    throw new Error("Minimum profit below protected runtime policy");
  }

  if (
    !ethers.BigNumber.isBigNumber(legs[2].minAmountOut) ||
    !protectedOutput.eq(legs[2].minAmountOut)
  ) {
    throw new Error("Protected output mismatch");
  }

  const maximumGasExposure = gasLimit.mul(maxFeePerGas);

  const requiredOutput = principal
    .add(premium)
    .add(maximumGasExposure)
    .add(reserve)
    .add(minimumProfit);

  if (protectedOutput.lt(requiredOutput)) {
    throw new Error(
      "Final transaction maximum gas exposure violates protected minimum profit"
    );
  }

  const finalProtectedNetProfit = protectedOutput
    .sub(principal)
    .sub(premium)
    .sub(maximumGasExposure)
    .sub(reserve);

  return Object.freeze({
    preSendSimulationEvidence: simulation,
    transactionEnvelope: envelope,
    authoritativePreflight: preflight,
    maximumGasExposure,
    finalProtectedNetProfit,
    minimumNetProfit: minimumProfit,
    finalTransactionEconomicsReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  });
}

module.exports = {
  validateFinalTransactionEconomicsEvidence
};
