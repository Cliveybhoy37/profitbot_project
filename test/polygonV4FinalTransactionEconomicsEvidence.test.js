"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  validateFinalTransactionEconomicsEvidence
} = require(
  "../scripts/utils/polygonV4FinalTransactionEconomicsEvidence"
);

const {
  PROTECTED_QUALIFICATION_RUNTIME_POLICY
} = require(
  "../scripts/utils/polygonV4ProtectedQualificationRuntimePolicy"
);

const BN = (value) => ethers.BigNumber.from(value);
const ETH = (value) => ethers.utils.parseEther(value);

const WPOL =
  "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";

const DAI =
  "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";

const APEPE =
  "0xA3f751662e282E83EC3cBc387d225Ca56dD63D3A";

function fixture({
  gasLimit = BN(100),
  maxFeePerGas = BN(2),
  protectedOutput = ETH("0.117"),
  minimumProfit = ETH("0.005"),
  routeToken = WPOL
} = {}) {
  const candidate = {
    amountIn: ETH("0.1")
  };

  const legs = [
    { tokenIn: routeToken, tokenOut: DAI },
    { tokenIn: DAI, tokenOut: APEPE },
    {
      tokenIn: APEPE,
      tokenOut: WPOL,
      minAmountOut: protectedOutput
    }
  ];

  const executionPlan = "0x1234";

  const preflight = {
    amountIn: candidate.amountIn,
    protectedFinalOutput: protectedOutput,
    expectedPremium: ETH("0.001"),
    safetyReserve: ETH("0.001"),
    minimumNetProfit: minimumProfit
  };

  const qualified = {
    candidate,
    executionLegs: legs,
    executionPlan,
    qualificationResult: {
      qualified: true,
      stage: "QUALIFIED",
      premiumBps: 100,
      preflight
    },
    policySnapshot: {
      premiumBps: 100
    },
    minimumNetProfitWei: minimumProfit
  };

  const currentState = {
    preflightEvidence: preflight
  };

  const currentPreflight = {
    candidate,
    executionLegs: legs,
    executionPlan,
    qualifiedContext: qualified,
    currentStateEvidence: currentState,
    currentStatePreflightReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  };

  const account = {
    candidate,
    executionLegs: legs,
    executionPlan,
    currentStatePreflightEvidence: currentPreflight,
    accountCallerIdentityReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  };

  const unsigned = {
    candidate,
    executionLegs: legs,
    executionPlan,
    accountCallerIdentityEvidence: account,
    unsignedTransactionIntentReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  };

  const transactionIntent = {
    from: "0x1111111111111111111111111111111111111111",
    to: "0x2222222222222222222222222222222222222",
    data: "0x12345678",
    value: BN(0)
  };

  unsigned.transactionIntent = transactionIntent;

  const parameters = {
    unsignedTransactionIntentEvidence: unsigned,
    transactionIntent,
    chainId: 137,
    nonce: 7,
    maxFeePerGas,
    maxPriorityFeePerGas: BN(1),
    currentTransactionParametersReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  };

  const estimation = {
    currentTransactionParameterEvidence: parameters,
    unsignedTransactionIntentEvidence: unsigned,
    transactionIntent,
    estimatedGasUnits: gasLimit,
    currentTransactionGasEstimationReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  };

  const selection = {
    currentTransactionGasEstimationEvidence: estimation,
    currentTransactionParameterEvidence: parameters,
    unsignedTransactionIntentEvidence: unsigned,
    transactionIntent,
    selectedGasLimit: gasLimit,
    currentTransactionGasLimitSelectionReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  };

  const envelope = {
    from: transactionIntent.from,
    to: transactionIntent.to,
    data: transactionIntent.data,
    value: transactionIntent.value,
    chainId: parameters.chainId,
    nonce: parameters.nonce,
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas: parameters.maxPriorityFeePerGas
  };

  const envelopeEvidence = {
    currentTransactionGasLimitSelectionEvidence: selection,
    currentTransactionGasEstimationEvidence: estimation,
    currentTransactionParameterEvidence: parameters,
    unsignedTransactionIntentEvidence: unsigned,
    transactionIntent,
    transactionEnvelope: envelope,
    currentTransactionEnvelopeReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  };

  const simulation = {
    currentTransactionEnvelopeEvidence: envelopeEvidence,
    transactionEnvelope: envelope,
    currentTransactionPreSendSimulationReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  };

  return {
    simulation,
    envelope,
    envelopeEvidence,
    selection,
    estimation,
    parameters,
    transactionIntent,
    unsigned,
    account,
    currentPreflight,
    currentState,
    qualified,
    candidate,
    legs,
    preflight
  };
}

test("accepts profitable final transaction economics", () => {
  const f = fixture();

  const result = validateFinalTransactionEconomicsEvidence({
    preSendSimulationEvidence: f.simulation
  });

  assert.equal(result.finalTransactionEconomicsReady, true);
  assert.equal(result.maximumGasExposure.toString(), "200");
  assert.equal(result.finalProtectedNetProfit.toString(), ETH("0.015").sub(BN(200)).toString());
  assert.equal(result.signerAuthorized, false);
  assert.equal(result.broadcastAuthorized, false);
  assert.equal(Object.isFrozen(result), true);
  assert.strictEqual(result.authoritativePreflight, f.preflight);
  assert.strictEqual(result.transactionEnvelope, f.envelope);
});

test("accepts exact minimum profit equality", () => {
  const f = fixture({
    protectedOutput: ETH("0.107").add(BN(200))
  });

  const result = validateFinalTransactionEconomicsEvidence({
    preSendSimulationEvidence: f.simulation
  });

  assert.equal(result.finalProtectedNetProfit.toString(), ETH("0.005").toString());
});

test("rejects gas fee that erases protected profit", () => {
  const f = fixture({
    maxFeePerGas: ETH("0.0002")
  });

  assert.throws(
    () => validateFinalTransactionEconomicsEvidence({
      preSendSimulationEvidence: f.simulation
    }),
    /maximum gas exposure violates protected minimum profit/
  );
});

test("rejects missing qualification evidence", () => {
  const f = fixture();

  delete f.qualified.qualificationResult;

  assert.throws(
    () => validateFinalTransactionEconomicsEvidence({
      preSendSimulationEvidence: f.simulation
    }),
    /Qualification result must be an object/
  );
});

test("rejects mismatched authoritative preflight identity", () => {
  const f = fixture();

  f.currentState.preflightEvidence = {
    ...f.preflight
  };

  assert.throws(
    () => validateFinalTransactionEconomicsEvidence({
      preSendSimulationEvidence: f.simulation
    }),
    /preflight identity mismatch/
  );
});

test("rejects non-WPOL route", () => {
  const f = fixture({
    routeToken: DAI
  });

  assert.throws(
    () => validateFinalTransactionEconomicsEvidence({
      preSendSimulationEvidence: f.simulation
    }),
    /WPOL-denominated route/
  );
});

test("rejects unauthorized upstream evidence", () => {
  const f = fixture();

  f.simulation.signerAuthorized = true;

  assert.throws(
    () => validateFinalTransactionEconomicsEvidence({
      preSendSimulationEvidence: f.simulation
    }),
    /must remain unauthorized/
  );
});

test("rejects invalid fee ordering", () => {
  const f = fixture();

  f.envelope.maxPriorityFeePerGas = BN(3);

  assert.throws(
    () => validateFinalTransactionEconomicsEvidence({
      preSendSimulationEvidence: f.simulation
    }),
    /Maximum fee cannot be below priority fee/
  );
});

test("rejects mismatched principal", () => {
  const f = fixture();

  f.preflight.amountIn = ETH("0.099");

  assert.throws(
    () => validateFinalTransactionEconomicsEvidence({
      preSendSimulationEvidence: f.simulation
    }),
    /Flashloan principal mismatch/
  );
});

test("rejects mismatched protected output", () => {
  const f = fixture();

  f.legs[2].minAmountOut = ETH("0.116");

  assert.throws(
    () => validateFinalTransactionEconomicsEvidence({
      preSendSimulationEvidence: f.simulation
    }),
    /Protected output mismatch/
  );
});


test("rejects a premium below upward-rounded requirement", () => {
  const f = fixture();
  f.preflight.expectedPremium = ETH("0.001").sub(1);

  assert.throws(
    () => validateFinalTransactionEconomicsEvidence({
      preSendSimulationEvidence: f.simulation
    }),
    /Rounded flashloan premium mismatch/
  );
});

test("rejects a premium above authoritative calculation", () => {
  const f = fixture();
  f.preflight.expectedPremium = ETH("0.001").add(1);

  assert.throws(
    () => validateFinalTransactionEconomicsEvidence({
      preSendSimulationEvidence: f.simulation
    }),
    /Rounded flashloan premium mismatch/
  );
});

test("rejects inconsistent qualification premium policy", () => {
  const f = fixture();
  f.qualified.qualificationResult.premiumBps = 50;

  assert.throws(
    () => validateFinalTransactionEconomicsEvidence({
      preSendSimulationEvidence: f.simulation
    }),
    /Qualification premium policy mismatch/
  );
});

test("rejects inconsistent qualified minimum profit", () => {
  const f = fixture();
  f.qualified.minimumNetProfitWei = ETH("0.005").add(1);

  assert.throws(
    () => validateFinalTransactionEconomicsEvidence({
      preSendSimulationEvidence: f.simulation
    }),
    /Qualified minimum profit mismatch/
  );
});


test("rejects altered final gas limit identity", () => {
  const f = fixture();
  f.envelope.gasLimit = BN(101);

  assert.throws(
    () => validateFinalTransactionEconomicsEvidence({
      preSendSimulationEvidence: f.simulation
    }),
    /Exact gas-limit evidence identity mismatch/
  );
});

test("rejects altered final maximum fee identity", () => {
  const f = fixture();
  f.envelope.maxFeePerGas = BN(3);

  assert.throws(
    () => validateFinalTransactionEconomicsEvidence({
      preSendSimulationEvidence: f.simulation
    }),
    /Exact transaction parameter identity mismatch/
  );
});

test("rejects altered transaction nonce", () => {
  const f = fixture();
  f.envelope.nonce = 8;

  assert.throws(
    () => validateFinalTransactionEconomicsEvidence({
      preSendSimulationEvidence: f.simulation
    }),
    /Exact transaction parameter identity mismatch/
  );
});

test("rejects altered unsigned transaction calldata", () => {
  const f = fixture();
  f.envelope.data = "0xdeadbeef";

  assert.throws(
    () => validateFinalTransactionEconomicsEvidence({
      preSendSimulationEvidence: f.simulation
    }),
    /Exact unsigned transaction intent mismatch/
  );
});

test("rejects mismatched gas estimation evidence", () => {
  const f = fixture();
  f.selection.currentTransactionGasEstimationEvidence = {
    ...f.estimation
  };

  assert.throws(
    () => validateFinalTransactionEconomicsEvidence({
      preSendSimulationEvidence: f.simulation
    }),
    /Upstream transaction evidence identity mismatch/
  );
});


test("rejects broken first route connection", () => {
  const f = fixture();
  f.legs[1].tokenIn = WPOL;

  assert.throws(
    () => validateFinalTransactionEconomicsEvidence({
      preSendSimulationEvidence: f.simulation
    }),
    /Execution route token continuity mismatch/
  );
});

test("rejects broken second route connection", () => {
  const f = fixture();
  f.legs[2].tokenIn = DAI;

  assert.throws(
    () => validateFinalTransactionEconomicsEvidence({
      preSendSimulationEvidence: f.simulation
    }),
    /Execution route token continuity mismatch/
  );
});

test("rejects malformed intermediate token address", () => {
  const f = fixture();
  f.legs[1].tokenOut = "not-an-address";

  assert.throws(
    () => validateFinalTransactionEconomicsEvidence({
      preSendSimulationEvidence: f.simulation
    }),
    /Execution leg token address invalid/
  );
});


test("rejects reserve below protected runtime policy", () => {
  const f = fixture();

  f.preflight.safetyReserve =
    PROTECTED_QUALIFICATION_RUNTIME_POLICY
      .qualification.safetyReserveWei.sub(1);

  assert.throws(
    () => validateFinalTransactionEconomicsEvidence({
      preSendSimulationEvidence: f.simulation
    }),
    /Safety reserve below protected runtime policy/
  );
});

test("rejects minimum profit below protected runtime policy", () => {
  const f = fixture();
  const policy =
    PROTECTED_QUALIFICATION_RUNTIME_POLICY.qualification;

  f.preflight.safetyReserve = policy.safetyReserveWei;
  f.preflight.minimumNetProfit =
    policy.minimumNetProfitWei.sub(1);
  f.qualified.minimumNetProfitWei =
    f.preflight.minimumNetProfit;

  assert.throws(
    () => validateFinalTransactionEconomicsEvidence({
      preSendSimulationEvidence: f.simulation
    }),
    /Minimum profit below protected runtime policy/
  );
});

test("cannot bypass protected floors with an obsolete false flag", () => {
  const f = fixture();

  f.preflight.safetyReserve =
    PROTECTED_QUALIFICATION_RUNTIME_POLICY
      .qualification.safetyReserveWei.sub(1);

  assert.throws(
    () => validateFinalTransactionEconomicsEvidence({
      preSendSimulationEvidence: f.simulation,
      enforceProtectedPolicy: false
    }),
    /Safety reserve below protected runtime policy/
  );
});
