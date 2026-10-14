"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  buildCurrentTransactionEnvelopeCompositionEvidence
} = require(
  "../scripts/utils/" +
  "polygonV4CurrentTransactionEnvelopeCompositionEvidence"
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

function fixture() {
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

  const currentTransactionGasLimitSelectionCompositionEvidence =
    Object.freeze({
      currentTransactionGasLimitSelectionEvidence:
        selection,
      currentTransactionGasLimitSelectionCompositionReady:
        true
    });

  return {
    selection,
    estimatedGasUnits,
    currentTransactionGasLimitSelectionCompositionEvidence
  };
}

test(
  "bridges exact gas limit selection composition into transaction envelope",
  () => {
    const f = fixture();

    const result =
      buildCurrentTransactionEnvelopeCompositionEvidence({
        currentTransactionGasLimitSelectionCompositionEvidence:
          f.currentTransactionGasLimitSelectionCompositionEvidence
      });

    assert.strictEqual(
      result.currentTransactionGasLimitSelectionCompositionEvidence,
      f.currentTransactionGasLimitSelectionCompositionEvidence
    );

    assert.strictEqual(
      result.currentTransactionEnvelopeEvidence
        .currentTransactionGasLimitSelectionEvidence,
      f.selection
    );

    assert.strictEqual(
      result.currentTransactionEnvelopeEvidence
        .transactionEnvelope.gasLimit,
      f.estimatedGasUnits
    );

    assert.equal(
      result.currentTransactionEnvelopeEvidence
        .currentTransactionEnvelopeReady,
      true
    );

    assert.equal(
      result.currentTransactionEnvelopeCompositionReady,
      true
    );

    assert.equal(
      Object.isFrozen(result),
      true
    );
  }
);

test(
  "requires gas limit selection composition evidence object",
  () => {
    assert.throws(
      () =>
        buildCurrentTransactionEnvelopeCompositionEvidence({
          currentTransactionGasLimitSelectionCompositionEvidence:
            null
        }),
      /Current transaction gas-limit selection composition evidence must be an object/
    );
  }
);

test(
  "requires completed gas limit selection composition provenance",
  () => {
    const f = fixture();

    assert.throws(
      () =>
        buildCurrentTransactionEnvelopeCompositionEvidence({
          currentTransactionGasLimitSelectionCompositionEvidence:
            {
              ...f.currentTransactionGasLimitSelectionCompositionEvidence,
              currentTransactionGasLimitSelectionCompositionReady:
                false
            }
        }),
      /Current transaction gas-limit selection composition evidence is not ready/
    );
  }
);

test(
  "requires contained gas limit selection evidence object",
  () => {
    const f = fixture();

    assert.throws(
      () =>
        buildCurrentTransactionEnvelopeCompositionEvidence({
          currentTransactionGasLimitSelectionCompositionEvidence:
            {
              ...f.currentTransactionGasLimitSelectionCompositionEvidence,
              currentTransactionGasLimitSelectionEvidence:
                null
            }
        }),
      /Current transaction gas-limit selection evidence must be an object/
    );
  }
);

test(
  "requires completed contained gas limit selection evidence",
  () => {
    const f = fixture();

    assert.throws(
      () =>
        buildCurrentTransactionEnvelopeCompositionEvidence({
          currentTransactionGasLimitSelectionCompositionEvidence:
            {
              ...f.currentTransactionGasLimitSelectionCompositionEvidence,
              currentTransactionGasLimitSelectionEvidence:
                {
                  ...f.selection,
                  currentTransactionGasLimitSelectionReady:
                    false
                }
            }
        }),
      /Current transaction gas-limit selection evidence is not ready/
    );
  }
);

test(
  "preserves exact selected gas limit without applying gas policy",
  () => {
    const f = fixture();

    const result =
      buildCurrentTransactionEnvelopeCompositionEvidence({
        currentTransactionGasLimitSelectionCompositionEvidence:
          f.currentTransactionGasLimitSelectionCompositionEvidence
      });

    assert.strictEqual(
      result.currentTransactionEnvelopeEvidence
        .transactionEnvelope.gasLimit,
      f.selection.selectedGasLimit
    );

    assert.strictEqual(
      result.currentTransactionEnvelopeEvidence
        .transactionEnvelope.gasLimit,
      f.estimatedGasUnits
    );

    assert.equal(
      result.currentTransactionEnvelopeEvidence
        .transactionEnvelope.gasLimit
        .toString(),
      "827233"
    );
  }
);

test(
  "does not advance execution authorization",
  () => {
    const f = fixture();

    const result =
      buildCurrentTransactionEnvelopeCompositionEvidence({
        currentTransactionGasLimitSelectionCompositionEvidence:
          f.currentTransactionGasLimitSelectionCompositionEvidence
      });

    for (
      const field of [
        "liveExecutionAuthorized",
        "signerAuthorized",
        "broadcastAuthorized"
      ]
    ) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(
          result,
          field
        ),
        false
      );

      assert.equal(
        result.currentTransactionEnvelopeEvidence[field],
        false
      );
    }
  }
);
