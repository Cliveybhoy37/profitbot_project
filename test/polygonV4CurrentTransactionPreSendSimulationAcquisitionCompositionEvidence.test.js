"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  buildCurrentTransactionPreSendSimulationAcquisitionCompositionEvidence
} = require(
  "../scripts/utils/" +
  "polygonV4CurrentTransactionPreSendSimulationAcquisitionCompositionEvidence"
);

function authorizationFalse() {
  return {
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  };
}

function fixture() {
  const transactionIntent =
    Object.freeze({
      from:
        "0x1111111111111111111111111111111111111111",
      to:
        "0x2222222222222222222222222222222222222222",
      data: "0x12345678",
      value: ethers.constants.Zero
    });

  const unsigned =
    Object.freeze({
      transactionIntent,
      unsignedTransactionIntentReady: true,
      ...authorizationFalse()
    });

  const parameters =
    Object.freeze({
      unsignedTransactionIntentEvidence:
        unsigned,
      transactionIntent,
      chainId: 137,
      nonce: 7,
      maxFeePerGas:
        ethers.BigNumber.from("50000000000"),
      maxPriorityFeePerGas:
        ethers.BigNumber.from("30000000000"),
      currentTransactionParametersReady: true,
      ...authorizationFalse()
    });

  const estimatedGasUnits =
    ethers.BigNumber.from("827233");

  const estimation =
    Object.freeze({
      currentTransactionParameterEvidence:
        parameters,
      unsignedTransactionIntentEvidence:
        unsigned,
      transactionIntent,
      estimatedGasUnits,
      currentTransactionGasEstimationReady:
        true,
      ...authorizationFalse()
    });

  const selection =
    Object.freeze({
      currentTransactionGasEstimationEvidence:
        estimation,
      currentTransactionParameterEvidence:
        parameters,
      unsignedTransactionIntentEvidence:
        unsigned,
      transactionIntent,
      selectedGasLimit:
        estimatedGasUnits,
      currentTransactionGasLimitSelectionReady:
        true,
      ...authorizationFalse()
    });

  const transactionEnvelope =
    Object.freeze({
      from: transactionIntent.from,
      to: transactionIntent.to,
      data: transactionIntent.data,
      value: transactionIntent.value,
      chainId: parameters.chainId,
      nonce: parameters.nonce,
      maxFeePerGas:
        parameters.maxFeePerGas,
      maxPriorityFeePerGas:
        parameters.maxPriorityFeePerGas,
      gasLimit:
        selection.selectedGasLimit
    });

  const currentTransactionEnvelopeEvidence =
    Object.freeze({
      currentTransactionGasLimitSelectionEvidence:
        selection,
      currentTransactionGasEstimationEvidence:
        estimation,
      currentTransactionParameterEvidence:
        parameters,
      unsignedTransactionIntentEvidence:
        unsigned,
      transactionIntent,
      transactionEnvelope,
      currentTransactionEnvelopeReady:
        true,
      ...authorizationFalse()
    });

  const currentTransactionEnvelopeCompositionEvidence =
    Object.freeze({
      currentTransactionEnvelopeEvidence,
      currentTransactionEnvelopeCompositionReady:
        true
    });

  return {
    transactionEnvelope,
    currentTransactionEnvelopeEvidence,
    currentTransactionEnvelopeCompositionEvidence
  };
}

test(
  "bridges exact envelope composition into pre-send simulation acquisition",
  async () => {
    const f = fixture();
    const calls = [];

    const provider = {
      async call(request) {
        calls.push(request);
        return "0x";
      }
    };

    const result =
      await buildCurrentTransactionPreSendSimulationAcquisitionCompositionEvidence({
        currentTransactionEnvelopeCompositionEvidence:
          f.currentTransactionEnvelopeCompositionEvidence,
        provider
      });

    assert.equal(calls.length, 1);

    assert.strictEqual(
      result.currentTransactionEnvelopeCompositionEvidence,
      f.currentTransactionEnvelopeCompositionEvidence
    );

    assert.strictEqual(
      result.currentTransactionPreSendSimulationEvidence
        .currentTransactionEnvelopeEvidence,
      f.currentTransactionEnvelopeEvidence
    );

    assert.strictEqual(
      result.currentTransactionPreSendSimulationEvidence
        .transactionEnvelope,
      f.transactionEnvelope
    );

    assert.equal(
      result.currentTransactionPreSendSimulationEvidence
        .simulationResult,
      "0x"
    );

    assert.equal(
      result
        .currentTransactionPreSendSimulationAcquisitionCompositionReady,
      true
    );

    assert.equal(
      Object.isFrozen(result),
      true
    );
  }
);

test(
  "requires envelope composition evidence to be an object",
  async () => {
    await assert.rejects(
      buildCurrentTransactionPreSendSimulationAcquisitionCompositionEvidence({
        currentTransactionEnvelopeCompositionEvidence:
          null,
        provider: {
          call: async () => "0x"
        }
      }),
      /composition evidence.*object/i
    );
  }
);

test(
  "requires envelope composition evidence to be ready",
  async () => {
    const f = fixture();

    const invalid =
      Object.freeze({
        ...f.currentTransactionEnvelopeCompositionEvidence,
        currentTransactionEnvelopeCompositionReady:
          false
      });

    await assert.rejects(
      buildCurrentTransactionPreSendSimulationAcquisitionCompositionEvidence({
        currentTransactionEnvelopeCompositionEvidence:
          invalid,
        provider: {
          call: async () => "0x"
        }
      }),
      /composition evidence.*not ready/i
    );
  }
);

test(
  "requires contained envelope evidence to be an object",
  async () => {
    const f = fixture();

    const invalid =
      Object.freeze({
        ...f.currentTransactionEnvelopeCompositionEvidence,
        currentTransactionEnvelopeEvidence:
          null
      });

    await assert.rejects(
      buildCurrentTransactionPreSendSimulationAcquisitionCompositionEvidence({
        currentTransactionEnvelopeCompositionEvidence:
          invalid,
        provider: {
          call: async () => "0x"
        }
      }),
      /envelope evidence.*object/i
    );
  }
);

test(
  "requires contained envelope evidence to be ready",
  async () => {
    const f = fixture();

    const invalidEnvelope =
      Object.freeze({
        ...f.currentTransactionEnvelopeEvidence,
        currentTransactionEnvelopeReady:
          false
      });

    const invalidComposition =
      Object.freeze({
        ...f.currentTransactionEnvelopeCompositionEvidence,
        currentTransactionEnvelopeEvidence:
          invalidEnvelope
      });

    await assert.rejects(
      buildCurrentTransactionPreSendSimulationAcquisitionCompositionEvidence({
        currentTransactionEnvelopeCompositionEvidence:
          invalidComposition,
        provider: {
          call: async () => "0x"
        }
      }),
      /envelope evidence.*not ready/i
    );
  }
);

test(
  "delegates exact seven-field call projection once",
  async () => {
    const f = fixture();
    const calls = [];

    const result =
      await buildCurrentTransactionPreSendSimulationAcquisitionCompositionEvidence({
        currentTransactionEnvelopeCompositionEvidence:
          f.currentTransactionEnvelopeCompositionEvidence,
        provider: {
          async call(request) {
            calls.push(request);
            return "0xabcdef";
          }
        }
      });

    assert.equal(calls.length, 1);

    assert.deepEqual(
      Object.keys(calls[0]).sort(),
      [
        "from",
        "to",
        "data",
        "value",
        "gasLimit",
        "maxFeePerGas",
        "maxPriorityFeePerGas"
      ].sort()
    );

    assert.strictEqual(
      calls[0].from,
      f.transactionEnvelope.from
    );
    assert.strictEqual(
      calls[0].to,
      f.transactionEnvelope.to
    );
    assert.strictEqual(
      calls[0].data,
      f.transactionEnvelope.data
    );
    assert.strictEqual(
      calls[0].value,
      f.transactionEnvelope.value
    );
    assert.strictEqual(
      calls[0].gasLimit,
      f.transactionEnvelope.gasLimit
    );
    assert.strictEqual(
      calls[0].maxFeePerGas,
      f.transactionEnvelope.maxFeePerGas
    );
    assert.strictEqual(
      calls[0].maxPriorityFeePerGas,
      f.transactionEnvelope.maxPriorityFeePerGas
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        calls[0],
        "chainId"
      ),
      false
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(
        calls[0],
        "nonce"
      ),
      false
    );

    assert.equal(
      result.currentTransactionPreSendSimulationEvidence
        .simulationResult,
      "0xabcdef"
    );
  }
);

test(
  "propagates simulation failure without advancing authorization",
  async () => {
    const f = fixture();
    let calls = 0;

    await assert.rejects(
      buildCurrentTransactionPreSendSimulationAcquisitionCompositionEvidence({
        currentTransactionEnvelopeCompositionEvidence:
          f.currentTransactionEnvelopeCompositionEvidence,
        provider: {
          async call() {
            calls += 1;
            throw new Error(
              "synthetic simulation failure"
            );
          }
        }
      }),
      /synthetic simulation failure/
    );

    assert.equal(calls, 1);

    assert.equal(
      f.currentTransactionEnvelopeEvidence
        .liveExecutionAuthorized,
      false
    );
    assert.equal(
      f.currentTransactionEnvelopeEvidence
        .signerAuthorized,
      false
    );
    assert.equal(
      f.currentTransactionEnvelopeEvidence
        .broadcastAuthorized,
      false
    );
  }
);
