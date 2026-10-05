"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  buildCurrentTransactionEnvelopeEvidence
} = require(
  "../scripts/utils/polygonV4CurrentTransactionEnvelopeEvidence"
);

const CALLER =
  "0x1111111111111111111111111111111111111111";
const EXECUTOR =
  "0x2222222222222222222222222222222222222222";

function authorizationFalse() {
  return {
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  };
}

function buildHarness() {
  const preflight =
    Object.freeze({
      currentStatePreflightReady: true,
      ...authorizationFalse()
    });

  const account =
    Object.freeze({
      currentStatePreflightEvidence:
        preflight,
      accountCallerIdentityReady: true,
      ...authorizationFalse()
    });

  const transactionIntent =
    Object.freeze({
      from: CALLER,
      to: EXECUTOR,
      data: "0x12345678",
      value: ethers.constants.Zero
    });

  const unsigned =
    Object.freeze({
      accountCallerIdentityEvidence:
        account,
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
      nonce: 42,
      maxFeePerGas:
        ethers.BigNumber.from("50000000000"),
      maxPriorityFeePerGas:
        ethers.BigNumber.from("30000000000"),
      currentTransactionParametersReady:
        true,
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

  return {
    preflight,
    account,
    transactionIntent,
    unsigned,
    parameters,
    estimation,
    selection,
    estimatedGasUnits
  };
}

test(
  "builds the exact current transaction envelope from preserved 1S.32 evidence",
  () => {
    const h = buildHarness();

    const result =
      buildCurrentTransactionEnvelopeEvidence({
        currentTransactionGasLimitSelectionEvidence:
          h.selection
      });

    assert.equal(
      result.currentTransactionGasLimitSelectionEvidence,
      h.selection
    );

    assert.equal(
      result.currentTransactionGasEstimationEvidence,
      h.estimation
    );

    assert.equal(
      result.currentTransactionParameterEvidence,
      h.parameters
    );

    assert.equal(
      result.unsignedTransactionIntentEvidence,
      h.unsigned
    );

    assert.equal(
      result.transactionIntent,
      h.transactionIntent
    );

    assert.deepEqual(
      result.transactionEnvelope,
      {
        from: CALLER,
        to: EXECUTOR,
        data: "0x12345678",
        value: ethers.constants.Zero,
        chainId: 137,
        nonce: 42,
        maxFeePerGas:
          h.parameters.maxFeePerGas,
        maxPriorityFeePerGas:
          h.parameters.maxPriorityFeePerGas,
        gasLimit:
          h.estimatedGasUnits
      }
    );

    assert.equal(
      result.transactionEnvelope.gasLimit,
      h.selection.selectedGasLimit
    );

    assert.equal(
      result.currentTransactionEnvelopeReady,
      true
    );

    assert.equal(
      result.liveExecutionAuthorized,
      false
    );

    assert.equal(
      result.signerAuthorized,
      false
    );

    assert.equal(
      result.broadcastAuthorized,
      false
    );

    assert.ok(
      Object.isFrozen(
        result.transactionEnvelope
      )
    );

    assert.ok(
      Object.isFrozen(result)
    );
  }
);

test(
  "preserves exact BigNumber identities without applying gas or fee policy",
  () => {
    const h = buildHarness();

    const result =
      buildCurrentTransactionEnvelopeEvidence({
        currentTransactionGasLimitSelectionEvidence:
          h.selection
      });

    assert.equal(
      result.transactionEnvelope.value,
      h.transactionIntent.value
    );

    assert.equal(
      result.transactionEnvelope.maxFeePerGas,
      h.parameters.maxFeePerGas
    );

    assert.equal(
      result.transactionEnvelope.maxPriorityFeePerGas,
      h.parameters.maxPriorityFeePerGas
    );

    assert.equal(
      result.transactionEnvelope.gasLimit,
      h.selection.selectedGasLimit
    );

    assert.notEqual(
      result.transactionEnvelope.gasLimit.toString(),
      "700000"
    );

    assert.notEqual(
      result.transactionEnvelope.gasLimit.toString(),
      "652106"
    );
  }
);

test(
  "rejects non-ready 1S.32 gas-limit selection evidence",
  () => {
    const h = buildHarness();

    const selection = {
      ...h.selection,
      currentTransactionGasLimitSelectionReady:
        false
    };

    assert.throws(
      () =>
        buildCurrentTransactionEnvelopeEvidence({
          currentTransactionGasLimitSelectionEvidence:
            selection
        }),
      /gas.?limit|selection|ready/i
    );
  }
);

test(
  "rejects authorization contamination at the 1S.32 boundary",
  () => {
    const h = buildHarness();

    const selection = {
      ...h.selection,
      signerAuthorized: true
    };

    assert.throws(
      () =>
        buildCurrentTransactionEnvelopeEvidence({
          currentTransactionGasLimitSelectionEvidence:
            selection
        }),
      /authorization|signer/i
    );
  }
);

test(
  "rejects selected gas limit that is not the exact 1S.31 estimate identity",
  () => {
    const h = buildHarness();

    const selection = {
      ...h.selection,
      selectedGasLimit:
        ethers.BigNumber.from(
          h.estimatedGasUnits.toString()
        )
    };

    assert.notEqual(
      selection.selectedGasLimit,
      h.estimatedGasUnits
    );

    assert.throws(
      () =>
        buildCurrentTransactionEnvelopeEvidence({
          currentTransactionGasLimitSelectionEvidence:
            selection
        }),
      /gas|estimate|identity/i
    );
  }
);

test(
  "rejects transaction-intent identity mismatch across preserved evidence",
  () => {
    const h = buildHarness();

    const parameters = {
      ...h.parameters,
      transactionIntent: {
        ...h.transactionIntent
      }
    };

    const selection = {
      ...h.selection,
      currentTransactionParameterEvidence:
        parameters
    };

    assert.throws(
      () =>
        buildCurrentTransactionEnvelopeEvidence({
          currentTransactionGasLimitSelectionEvidence:
            selection
        }),
      /transaction intent|identity/i
    );
  }
);

test(
  "rejects non-ready current transaction parameter evidence",
  () => {
    const h = buildHarness();

    const parameters = {
      ...h.parameters,
      currentTransactionParametersReady:
        false
    };

    const estimation = {
      ...h.estimation,
      currentTransactionParameterEvidence:
        parameters
    };

    const selection = {
      ...h.selection,
      currentTransactionGasEstimationEvidence:
        estimation,
      currentTransactionParameterEvidence:
        parameters
    };

    assert.throws(
      () =>
        buildCurrentTransactionEnvelopeEvidence({
          currentTransactionGasLimitSelectionEvidence:
            selection
        }),
      /parameter|ready/i
    );
  }
);

test(
  "rejects invalid chain, nonce or EIP-1559 parameter values",
  () => {
    for (const mutate of [
      p => ({ ...p, chainId: 1 }),
      p => ({ ...p, nonce: -1 }),
      p => ({
        ...p,
        maxFeePerGas:
          ethers.constants.Zero
      }),
      p => ({
        ...p,
        maxPriorityFeePerGas:
          ethers.constants.Zero
      }),
      p => ({
        ...p,
        maxFeePerGas:
          ethers.BigNumber.from("1"),
        maxPriorityFeePerGas:
          ethers.BigNumber.from("2")
      })
    ]) {
      const h = buildHarness();
      const parameters =
        mutate(h.parameters);

      const estimation = {
        ...h.estimation,
        currentTransactionParameterEvidence:
          parameters
      };

      const selection = {
        ...h.selection,
        currentTransactionGasEstimationEvidence:
          estimation,
        currentTransactionParameterEvidence:
          parameters
      };

      assert.throws(
        () =>
          buildCurrentTransactionEnvelopeEvidence({
            currentTransactionGasLimitSelectionEvidence:
              selection
          }),
        /chain|nonce|fee|priority|parameter/i
      );
    }
  }
);

test(
  "rejects non-ready 1S.31 gas estimation evidence",
  () => {
    const h = buildHarness();

    const estimation = {
      ...h.estimation,
      currentTransactionGasEstimationReady:
        false
    };

    const selection = {
      ...h.selection,
      currentTransactionGasEstimationEvidence:
        estimation
    };

    assert.throws(
      () =>
        buildCurrentTransactionEnvelopeEvidence({
          currentTransactionGasLimitSelectionEvidence:
            selection
        }),
      /gas estimation|ready/i
    );
  }
);

test(
  "rejects authorization contamination in 1S.31 gas estimation evidence",
  () => {
    const h = buildHarness();

    const estimation = {
      ...h.estimation,
      broadcastAuthorized: true
    };

    const selection = {
      ...h.selection,
      currentTransactionGasEstimationEvidence:
        estimation
    };

    assert.throws(
      () =>
        buildCurrentTransactionEnvelopeEvidence({
          currentTransactionGasLimitSelectionEvidence:
            selection
        }),
      /authorization/i
    );
  }
);

test(
  "rejects authorization contamination in current transaction parameter evidence",
  () => {
    const h = buildHarness();

    const parameters = {
      ...h.parameters,
      liveExecutionAuthorized: true
    };

    const estimation = {
      ...h.estimation,
      currentTransactionParameterEvidence:
        parameters
    };

    const selection = {
      ...h.selection,
      currentTransactionGasEstimationEvidence:
        estimation,
      currentTransactionParameterEvidence:
        parameters
    };

    assert.throws(
      () =>
        buildCurrentTransactionEnvelopeEvidence({
          currentTransactionGasLimitSelectionEvidence:
            selection
        }),
      /authorization/i
    );
  }
);

test(
  "rejects non-ready unsigned transaction intent evidence",
  () => {
    const h = buildHarness();

    const unsigned = {
      ...h.unsigned,
      unsignedTransactionIntentReady: false
    };

    const parameters = {
      ...h.parameters,
      unsignedTransactionIntentEvidence:
        unsigned
    };

    const estimation = {
      ...h.estimation,
      currentTransactionParameterEvidence:
        parameters,
      unsignedTransactionIntentEvidence:
        unsigned
    };

    const selection = {
      ...h.selection,
      currentTransactionGasEstimationEvidence:
        estimation,
      currentTransactionParameterEvidence:
        parameters,
      unsignedTransactionIntentEvidence:
        unsigned
    };

    assert.throws(
      () =>
        buildCurrentTransactionEnvelopeEvidence({
          currentTransactionGasLimitSelectionEvidence:
            selection
        }),
      /unsigned transaction intent|ready/i
    );
  }
);

test(
  "rejects authorization contamination in unsigned transaction intent evidence",
  () => {
    const h = buildHarness();

    const unsigned = {
      ...h.unsigned,
      signerAuthorized: true
    };

    const parameters = {
      ...h.parameters,
      unsignedTransactionIntentEvidence:
        unsigned
    };

    const estimation = {
      ...h.estimation,
      currentTransactionParameterEvidence:
        parameters,
      unsignedTransactionIntentEvidence:
        unsigned
    };

    const selection = {
      ...h.selection,
      currentTransactionGasEstimationEvidence:
        estimation,
      currentTransactionParameterEvidence:
        parameters,
      unsignedTransactionIntentEvidence:
        unsigned
    };

    assert.throws(
      () =>
        buildCurrentTransactionEnvelopeEvidence({
          currentTransactionGasLimitSelectionEvidence:
            selection
        }),
      /authorization/i
    );
  }
);

test(
  "rejects current parameter evidence identity mismatch between 1S.31 and 1S.32",
  () => {
    const h = buildHarness();

    const parametersCopy = {
      ...h.parameters
    };

    const selection = {
      ...h.selection,
      currentTransactionParameterEvidence:
        parametersCopy
    };

    assert.notEqual(
      parametersCopy,
      h.parameters
    );

    assert.throws(
      () =>
        buildCurrentTransactionEnvelopeEvidence({
          currentTransactionGasLimitSelectionEvidence:
            selection
        }),
      /parameter evidence identity/i
    );
  }
);

test(
  "rejects unsigned evidence identity mismatch across preserved layers",
  () => {
    const h = buildHarness();

    const unsignedCopy = {
      ...h.unsigned
    };

    const selection = {
      ...h.selection,
      unsignedTransactionIntentEvidence:
        unsignedCopy
    };

    assert.notEqual(
      unsignedCopy,
      h.unsigned
    );

    assert.throws(
      () =>
        buildCurrentTransactionEnvelopeEvidence({
          currentTransactionGasLimitSelectionEvidence:
            selection
        }),
      /unsigned transaction intent evidence identity/i
    );
  }
);

test(
  "rejects missing or malformed selected gas limit",
  () => {
    for (const selectedGasLimit of [
      undefined,
      ethers.constants.Zero,
      "827233"
    ]) {
      const h = buildHarness();

      const selection = {
        ...h.selection,
        selectedGasLimit
      };

      assert.throws(
        () =>
          buildCurrentTransactionEnvelopeEvidence({
            currentTransactionGasLimitSelectionEvidence:
              selection
          }),
        /selected gas limit|BigNumber|positive/i
      );
    }
  }
);

test(
  "does not mutate any preserved upstream evidence while composing the envelope",
  () => {
    const h = buildHarness();

    const before = {
      selectionKeys:
        Object.keys(h.selection),
      estimationKeys:
        Object.keys(h.estimation),
      parameterKeys:
        Object.keys(h.parameters),
      unsignedKeys:
        Object.keys(h.unsigned),
      intentKeys:
        Object.keys(h.transactionIntent)
    };

    buildCurrentTransactionEnvelopeEvidence({
      currentTransactionGasLimitSelectionEvidence:
        h.selection
    });

    assert.deepEqual(
      Object.keys(h.selection),
      before.selectionKeys
    );

    assert.deepEqual(
      Object.keys(h.estimation),
      before.estimationKeys
    );

    assert.deepEqual(
      Object.keys(h.parameters),
      before.parameterKeys
    );

    assert.deepEqual(
      Object.keys(h.unsigned),
      before.unsignedKeys
    );

    assert.deepEqual(
      Object.keys(h.transactionIntent),
      before.intentKeys
    );
  }
);

test(
  "accepts actual 1S.31 -> 1S.32 output and composes its exact transaction envelope",
  async () => {
    const {
      acquireCurrentTransactionGasEstimationEvidence
    } = require(
      "../scripts/utils/polygonV4CurrentTransactionGasEstimationEvidence"
    );

    const {
      selectCurrentTransactionGasLimitEvidence
    } = require(
      "../scripts/utils/polygonV4CurrentTransactionGasLimitSelectionEvidence"
    );

    const candidate = Object.freeze({
      id: "1S33-real-composition-candidate"
    });

    const executionLegs = Object.freeze([
      Object.freeze({
        venue: "TEST"
      })
    ]);

    const executionPlan = "0x1234";

    const preflight = Object.freeze({
      candidate,
      executionLegs,
      executionPlan,
      currentStatePreflightReady: true,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

    const account = Object.freeze({
      candidate,
      executionLegs,
      executionPlan,
      currentStatePreflightEvidence:
        preflight,
      callerAddress: CALLER,
      executorAddress: EXECUTOR,
      accountCallerIdentityReady: true,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

    const transactionIntent =
      Object.freeze({
        from: CALLER,
        to: EXECUTOR,
        data: "0x12345678",
        value: ethers.constants.Zero
      });

    const unsigned = Object.freeze({
      candidate,
      executionLegs,
      executionPlan,
      accountCallerIdentityEvidence:
        account,
      transactionIntent,
      unsignedTransactionIntentReady:
        true,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

    const parameters = Object.freeze({
      unsignedTransactionIntentEvidence:
        unsigned,
      transactionIntent,
      chainId: 137,
      nonce: 7,
      maxFeePerGas:
        ethers.BigNumber.from(
          "30000000000"
        ),
      maxPriorityFeePerGas:
        ethers.BigNumber.from(
          "30000000000"
        ),
      currentTransactionParametersReady:
        true,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

    const expectedEstimate =
      ethers.BigNumber.from("913579");

    let estimateCalls = 0;

    const provider = {
      async estimateGas(transaction) {
        estimateCalls += 1;

        assert.deepEqual(
          transaction,
          {
            from: CALLER,
            to: EXECUTOR,
            data: "0x12345678",
            value: ethers.constants.Zero
          }
        );

        return expectedEstimate;
      }
    };

    const estimation =
      await acquireCurrentTransactionGasEstimationEvidence({
        currentTransactionParameterEvidence:
          parameters,
        provider
      });

    assert.equal(
      estimateCalls,
      1
    );

    const selection =
      selectCurrentTransactionGasLimitEvidence({
        currentTransactionGasEstimationEvidence:
          estimation
      });

    const result =
      buildCurrentTransactionEnvelopeEvidence({
        currentTransactionGasLimitSelectionEvidence:
          selection
      });

    assert.strictEqual(
      result.currentTransactionGasLimitSelectionEvidence,
      selection
    );

    assert.strictEqual(
      result.currentTransactionGasEstimationEvidence,
      estimation
    );

    assert.strictEqual(
      result.currentTransactionParameterEvidence,
      parameters
    );

    assert.strictEqual(
      result.unsignedTransactionIntentEvidence,
      unsigned
    );

    assert.strictEqual(
      result.transactionIntent,
      transactionIntent
    );

    assert.strictEqual(
      result.transactionEnvelope.from,
      transactionIntent.from
    );

    assert.strictEqual(
      result.transactionEnvelope.to,
      transactionIntent.to
    );

    assert.strictEqual(
      result.transactionEnvelope.data,
      transactionIntent.data
    );

    assert.strictEqual(
      result.transactionEnvelope.value,
      transactionIntent.value
    );

    assert.strictEqual(
      result.transactionEnvelope.chainId,
      parameters.chainId
    );

    assert.strictEqual(
      result.transactionEnvelope.nonce,
      parameters.nonce
    );

    assert.strictEqual(
      result.transactionEnvelope.maxFeePerGas,
      parameters.maxFeePerGas
    );

    assert.strictEqual(
      result.transactionEnvelope.maxPriorityFeePerGas,
      parameters.maxPriorityFeePerGas
    );

    assert.strictEqual(
      result.transactionEnvelope.gasLimit,
      estimation.estimatedGasUnits
    );

    assert.strictEqual(
      result.transactionEnvelope.gasLimit,
      selection.selectedGasLimit
    );

    assert.strictEqual(
      result.transactionEnvelope.gasLimit,
      expectedEstimate
    );

    assert.deepEqual(
      Object.keys(
        result.transactionEnvelope
      ),
      [
        "from",
        "to",
        "data",
        "value",
        "chainId",
        "nonce",
        "maxFeePerGas",
        "maxPriorityFeePerGas",
        "gasLimit"
      ]
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        result.transactionEnvelope,
        "gasPrice"
      ),
      false
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        result.transactionEnvelope,
        "type"
      ),
      false
    );

    assert.ok(
      Object.isFrozen(
        result.transactionEnvelope
      )
    );

    assert.equal(
      result.currentTransactionEnvelopeReady,
      true
    );

    assert.equal(
      result.liveExecutionAuthorized,
      false
    );

    assert.equal(
      result.signerAuthorized,
      false
    );

    assert.equal(
      result.broadcastAuthorized,
      false
    );
  }
);
