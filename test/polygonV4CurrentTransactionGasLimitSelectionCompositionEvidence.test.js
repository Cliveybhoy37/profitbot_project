"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  buildCurrentTransactionGasLimitSelectionCompositionEvidence
} = require(
  "../scripts/utils/" +
  "polygonV4CurrentTransactionGasLimitSelectionCompositionEvidence"
);

const CALLER =
  "0x1111111111111111111111111111111111111111";

const EXECUTOR =
  "0x2222222222222222222222222222222222222222";

function fixture() {
  const candidate =
    Object.freeze({
      id: "1S63-test-candidate"
    });

  const executionLegs =
    Object.freeze([
      Object.freeze({
        venue: "TEST"
      })
    ]);

  const executionPlan = "0x1234";

  const preflight =
    Object.freeze({
      candidate,
      executionLegs,
      executionPlan,
      currentStatePreflightReady: true,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

  const account =
    Object.freeze({
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

  const unsigned =
    Object.freeze({
      candidate,
      executionLegs,
      executionPlan,
      accountCallerIdentityEvidence:
        account,
      transactionIntent,
      unsignedTransactionIntentReady: true,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

  const parameters =
    Object.freeze({
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

  const estimatedGasUnits =
    ethers.BigNumber.from(
      "900123"
    );

  const currentTransactionGasEstimationEvidence =
    Object.freeze({
      currentTransactionParameterEvidence:
        parameters,
      unsignedTransactionIntentEvidence:
        unsigned,
      transactionIntent,
      estimatedGasUnits,
      currentTransactionGasEstimationReady:
        true,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

  const currentTransactionGasEstimationAcquisitionCompositionEvidence =
    Object.freeze({
      currentTransactionGasEstimationEvidence,
      currentTransactionGasEstimationAcquisitionCompositionReady:
        true
    });

  return {
    estimatedGasUnits,
    currentTransactionGasEstimationEvidence,
    currentTransactionGasEstimationAcquisitionCompositionEvidence
  };
}

test(
  "bridges exact gas estimation acquisition composition into gas limit selection",
  () => {
    const f = fixture();

    const result =
      buildCurrentTransactionGasLimitSelectionCompositionEvidence({
        currentTransactionGasEstimationAcquisitionCompositionEvidence:
          f.currentTransactionGasEstimationAcquisitionCompositionEvidence
      });

    assert.strictEqual(
      result
        .currentTransactionGasEstimationAcquisitionCompositionEvidence,
      f.currentTransactionGasEstimationAcquisitionCompositionEvidence
    );

    assert.strictEqual(
      result.currentTransactionGasLimitSelectionEvidence
        .currentTransactionGasEstimationEvidence,
      f.currentTransactionGasEstimationEvidence
    );

    assert.strictEqual(
      result.currentTransactionGasLimitSelectionEvidence
        .selectedGasLimit,
      f.estimatedGasUnits
    );

    assert.equal(
      result
        .currentTransactionGasLimitSelectionCompositionReady,
      true
    );

    assert.equal(
      Object.isFrozen(result),
      true
    );
  }
);

test(
  "requires gas estimation acquisition composition evidence object",
  () => {
    assert.throws(
      () =>
        buildCurrentTransactionGasLimitSelectionCompositionEvidence({
          currentTransactionGasEstimationAcquisitionCompositionEvidence:
            null
        }),
      /Current transaction gas estimation acquisition composition evidence must be an object/
    );
  }
);

test(
  "requires completed gas estimation acquisition composition provenance",
  () => {
    const f = fixture();

    assert.throws(
      () =>
        buildCurrentTransactionGasLimitSelectionCompositionEvidence({
          currentTransactionGasEstimationAcquisitionCompositionEvidence:
            {
              ...f.currentTransactionGasEstimationAcquisitionCompositionEvidence,
              currentTransactionGasEstimationAcquisitionCompositionReady:
                false
            }
        }),
      /Current transaction gas estimation acquisition composition evidence is not ready/
    );
  }
);

test(
  "requires completed current transaction gas estimation evidence",
  () => {
    const f = fixture();

    assert.throws(
      () =>
        buildCurrentTransactionGasLimitSelectionCompositionEvidence({
          currentTransactionGasEstimationAcquisitionCompositionEvidence:
            {
              ...f.currentTransactionGasEstimationAcquisitionCompositionEvidence,
              currentTransactionGasEstimationEvidence:
                {
                  ...f.currentTransactionGasEstimationEvidence,
                  currentTransactionGasEstimationReady:
                    false
                }
            }
        }),
      /Current transaction gas estimation evidence is not ready/
    );
  }
);

test(
  "propagates invalid estimated gas rejection from established selector",
  () => {
    const f = fixture();

    const invalidEstimation =
      Object.freeze({
        ...f.currentTransactionGasEstimationEvidence,
        estimatedGasUnits:
          ethers.constants.Zero
      });

    assert.throws(
      () =>
        buildCurrentTransactionGasLimitSelectionCompositionEvidence({
          currentTransactionGasEstimationAcquisitionCompositionEvidence:
            Object.freeze({
              currentTransactionGasEstimationEvidence:
                invalidEstimation,
              currentTransactionGasEstimationAcquisitionCompositionReady:
                true
            })
        }),
      /Estimated gas units must be positive/
    );
  }
);

test(
  "does not add a gas margin or substitute another gas value",
  () => {
    const f = fixture();

    const result =
      buildCurrentTransactionGasLimitSelectionCompositionEvidence({
        currentTransactionGasEstimationAcquisitionCompositionEvidence:
          f.currentTransactionGasEstimationAcquisitionCompositionEvidence
      });

    assert.strictEqual(
      result.currentTransactionGasLimitSelectionEvidence
        .selectedGasLimit,
      f.currentTransactionGasEstimationEvidence
        .estimatedGasUnits
    );

    assert.equal(
      result.currentTransactionGasLimitSelectionEvidence
        .selectedGasLimit
        .toString(),
      "900123"
    );
  }
);

test(
  "does not advance execution authorization",
  () => {
    const f = fixture();

    const result =
      buildCurrentTransactionGasLimitSelectionCompositionEvidence({
        currentTransactionGasEstimationAcquisitionCompositionEvidence:
          f.currentTransactionGasEstimationAcquisitionCompositionEvidence
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
        result.currentTransactionGasLimitSelectionEvidence[field],
        false
      );
    }
  }
);
