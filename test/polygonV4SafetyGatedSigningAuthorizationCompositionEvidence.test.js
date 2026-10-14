"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildSafetyGatedSigningAuthorizationCompositionEvidence
} = require(
  "../scripts/utils/polygonV4SafetyGatedSigningAuthorizationCompositionEvidence"
);

const SIGNER = "0x1B786608D3F073e44910bB975413f97A11Dd7bcA";

function makeFixture() {
  const envelope = Object.freeze({
    from: SIGNER,
    to: "0x1111111111111111111111111111111111111111",
    data: "0x1234",
    value: "0",
    chainId: 137,
    nonce: 7,
    maxFeePerGas: "100",
    maxPriorityFeePerGas: "30",
    gasLimit: "500000"
  });

  const simulation = Object.freeze({
    transactionEnvelope: envelope,
    currentTransactionPreSendSimulationReady: true,
    signerAuthorized: false,
    broadcastAuthorized: false,
    liveExecutionAuthorized: false
  });

  const simulationComposition = Object.freeze({
    currentTransactionPreSendSimulationEvidence: simulation,
    currentTransactionPreSendSimulationAcquisitionCompositionReady: true
  });

  const economics = Object.freeze({
    preSendSimulationEvidence: simulation,
    transactionEnvelope: envelope,
    signerAuthorized: false,
    broadcastAuthorized: false,
    liveExecutionAuthorized: false
  });

  const affordability = Object.freeze({
    finalTransactionEconomicsEvidence: economics,
    transactionEnvelope: envelope,
    nativeGasAffordabilityReady: true,
    signerAuthorized: false,
    broadcastAuthorized: false,
    liveExecutionAuthorized: false
  });

  const balance = Object.freeze({
    finalTransactionEconomicsEvidence: economics,
    nativeGasAffordabilityEvidence: affordability,
    nativeGasBalanceAcquisitionReady: true,
    signerAuthorized: false,
    broadcastAuthorized: false,
    liveExecutionAuthorized: false
  });

  const safety = Object.freeze({
    currentTransactionPreSendSimulationAcquisitionCompositionEvidence:
      simulationComposition,
    currentTransactionPreSendSimulationEvidence: simulation,
    finalTransactionEconomicsEvidence: economics,
    nativeGasBalanceAcquisitionEvidence: balance,
    nativeGasAffordabilityEvidence: affordability,
    transactionEnvelope: envelope,
    preSignerSafetyCompositionReady: true,
    signerAuthorized: false,
    broadcastAuthorized: false,
    liveExecutionAuthorized: false
  });

  const identity = Object.freeze({
    currentTransactionPreSendSimulationEvidence: simulation,
    signerAddress: SIGNER,
    transactionEnvelope: envelope,
    prospectiveSignerIdentityReady: true,
    signerAuthorized: false,
    broadcastAuthorized: false,
    liveExecutionAuthorized: false
  });

  const identityComposition = Object.freeze({
    currentTransactionPreSendSimulationAcquisitionCompositionEvidence:
      simulationComposition,
    prospectiveSignerIdentityEvidence: identity,
    prospectiveSignerIdentityAcquisitionCompositionReady: true
  });

  const gate = Object.freeze({
    currentTransactionPreSendSimulationAcquisitionCompositionEvidence:
      simulationComposition,
    preSignerSafetyCompositionEvidence: safety,
    prospectiveSignerIdentityAcquisitionCompositionEvidence:
      identityComposition,
    prospectiveSignerIdentityEvidence: identity,
    transactionEnvelope: envelope,
    preAuthorizationSafetyGateCompositionReady: true,
    signerAuthorized: false,
    broadcastAuthorized: false,
    liveExecutionAuthorized: false
  });

  const signerEvidence = Object.freeze({
    prospectiveSignerIdentityEvidence: identity,
    transactionEnvelope: envelope,
    signerAddress: SIGNER,
    signerAuthorizationReady: true,
    signerAuthorized: true,
    broadcastAuthorized: false,
    liveExecutionAuthorized: false
  });

  const signerComposition = Object.freeze({
    prospectiveSignerIdentityAcquisitionCompositionEvidence:
      identityComposition,
    signerAuthorizationEvidence: signerEvidence,
    signerAuthorizationCompositionReady: true
  });

  const gated = Object.freeze({
    preAuthorizationSafetyGateCompositionEvidence: gate,
    signerAuthorizationCompositionEvidence: signerComposition,
    signerAuthorizationEvidence: signerEvidence,
    transactionEnvelope: envelope,
    safetyGatedSignerAuthorizationCompositionReady: true,
    signerAuthorized: true,
    broadcastAuthorized: false,
    liveExecutionAuthorized: false
  });

  return {
    envelope,
    identity,
    gate,
    signerEvidence,
    signerComposition,
    gated
  };
}

function invoke(gated, callback) {
  return buildSafetyGatedSigningAuthorizationCompositionEvidence({
    safetyGatedSignerAuthorizationCompositionEvidence: gated,
    authorizeTransactionSigning: callback
  });
}

test("valid gated signing handoff preserves lineage without signing", async () => {
  const f = makeFixture();
  let calls = 0;

  const result = await invoke(f.gated, async ({
    signerAddress,
    transactionEnvelope
  }) => {
    calls++;
    assert.equal(signerAddress, SIGNER);
    assert.equal(transactionEnvelope, f.envelope);
    return true;
  });

  assert.equal(calls, 1);
  assert.equal(result.safetyGatedSigningAuthorizationCompositionReady, true);
  assert.equal(result.safetyGatedSignerAuthorizationCompositionEvidence, f.gated);
  assert.equal(result.preAuthorizationSafetyGateCompositionEvidence, f.gate);
  assert.equal(result.signerAuthorizationCompositionEvidence, f.signerComposition);
  assert.equal(result.signingAuthorizationEvidence.signerAuthorizationEvidence, f.signerEvidence);
  assert.equal(result.transactionEnvelope, f.envelope);
  assert.equal(result.signerAuthorized, true);
  assert.equal(result.signingAuthorized, true);
  assert.equal(result.broadcastAuthorized, false);
  assert.equal(result.liveExecutionAuthorized, false);
  assert.equal(Object.isFrozen(result), true);
});

for (const scenario of [
  ["missing gated composition", null, /object/i],
  ["unready gated composition", { safetyGatedSignerAuthorizationCompositionReady: false }, /ready/i],
  ["missing gate", { preAuthorizationSafetyGateCompositionEvidence: null }, /object/i],
  ["unready gate", { gate: { preAuthorizationSafetyGateCompositionReady: false } }, /ready/i],
  ["premature signer authorization in gate", { gate: { signerAuthorized: true } }, /signerAuthorized/i],
  ["substituted envelope", { transactionEnvelope: {} }, /identity mismatch/i],
  ["substituted signer evidence", { signerAuthorizationEvidence: {} }, /identity mismatch/i],
  ["unready signer composition", { signerComposition: { signerAuthorizationCompositionReady: false } }, /ready/i],
  ["mismatched identity", { signerEvidence: { prospectiveSignerIdentityEvidence: {} } }, /identity mismatch/i]
]) {
  test(`${scenario[0]} blocks signing callback`, async () => {
    const f = makeFixture();
    const changes = scenario[1];
    let gated;

    if (changes === null) {
      gated = null;
    } else {
      gated = { ...f.gated, ...changes };

      if (changes.gate) {
        gated.preAuthorizationSafetyGateCompositionEvidence = {
          ...f.gate,
          ...changes.gate
        };
        delete gated.gate;
      }

      if (changes.signerComposition) {
        gated.signerAuthorizationCompositionEvidence = {
          ...f.signerComposition,
          ...changes.signerComposition
        };
        delete gated.signerComposition;
      }

      if (changes.signerEvidence) {
        gated.signerAuthorizationCompositionEvidence = {
          ...f.signerComposition,
          signerAuthorizationEvidence: {
            ...f.signerEvidence,
            ...changes.signerEvidence
          }
        };
        delete gated.signerEvidence;
      }
    }

    let calls = 0;
    await assert.rejects(
      invoke(gated, async () => {
        calls++;
        return true;
      }),
      scenario[2]
    );
    assert.equal(calls, 0);
  });
}

test("missing simulation evidence blocks signing callback", async () => {
  const f = makeFixture();
  const gate = {
    ...f.gate,
    currentTransactionPreSendSimulationAcquisitionCompositionEvidence: null
  };
  let calls = 0;

  await assert.rejects(
    invoke({ ...f.gated, preAuthorizationSafetyGateCompositionEvidence: gate },
      async () => {
        calls++;
        return true;
      }),
    /Simulation composition.*object/i
  );

  assert.equal(calls, 0);
});

test("missing affordability evidence blocks signing callback", async () => {
  const f = makeFixture();
  const gate = {
    ...f.gate,
    preSignerSafetyCompositionEvidence: {
      ...f.gate.preSignerSafetyCompositionEvidence,
      nativeGasAffordabilityEvidence: null
    }
  };
  let calls = 0;

  await assert.rejects(
    invoke({ ...f.gated, preAuthorizationSafetyGateCompositionEvidence: gate },
      async () => {
        calls++;
        return true;
      }),
    /Native gas affordability evidence.*object/i
  );

  assert.equal(calls, 0);
});

test("unready affordability evidence blocks signing callback", async () => {
  const f = makeFixture();
  const safety = f.gate.preSignerSafetyCompositionEvidence;
  const gate = {
    ...f.gate,
    preSignerSafetyCompositionEvidence: {
      ...safety,
      nativeGasAffordabilityEvidence: {
        ...safety.nativeGasAffordabilityEvidence,
        nativeGasAffordabilityReady: false
      }
    }
  };
  let calls = 0;

  await assert.rejects(
    invoke({ ...f.gated, preAuthorizationSafetyGateCompositionEvidence: gate },
      async () => {
        calls++;
        return true;
      }),
    /Native gas affordability.*ready/i
  );

  assert.equal(calls, 0);
});

test("mismatched economics simulation blocks signing callback", async () => {
  const f = makeFixture();
  const safety = f.gate.preSignerSafetyCompositionEvidence;
  const gate = {
    ...f.gate,
    preSignerSafetyCompositionEvidence: {
      ...safety,
      finalTransactionEconomicsEvidence: {
        ...safety.finalTransactionEconomicsEvidence,
        preSendSimulationEvidence: {}
      }
    }
  };
  let calls = 0;

  await assert.rejects(
    invoke({ ...f.gated, preAuthorizationSafetyGateCompositionEvidence: gate },
      async () => {
        calls++;
        return true;
      }),
    /Economics simulation evidence identity mismatch/i
  );

  assert.equal(calls, 0);
});

test("explicit signing denial propagates after one callback", async () => {
  const f = makeFixture();
  let calls = 0;

  await assert.rejects(
    invoke(f.gated, async () => {
      calls++;
      return false;
    }),
    /authorization.*true/i
  );

  assert.equal(calls, 1);
});

test("missing signing authorization callback is rejected", async () => {
  const f = makeFixture();

  await assert.rejects(
    invoke(f.gated, undefined),
    /authorizeTransactionSigning.*function/i
  );
});
