"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  buildCurrentTransactionGasEstimationAcquisitionCompositionEvidence
} = require(
  "../scripts/utils/" +
  "polygonV4CurrentTransactionGasEstimationAcquisitionCompositionEvidence"
);

const CALLER =
  "0x1111111111111111111111111111111111111111";

const EXECUTOR =
  "0x2222222222222222222222222222222222222222";

const TOKEN =
  "0x3333333333333333333333333333333333333333";

function fixture() {
  const candidate =
    Object.freeze({
      amountIn:
        ethers.BigNumber.from(
          "125000000000000000"
        )
    });

  const executionLegs =
    Object.freeze([
      Object.freeze({
        tokenIn: TOKEN,
        tokenOut:
          "0x4444444444444444444444444444444444444444"
      }),
      Object.freeze({
        tokenIn:
          "0x4444444444444444444444444444444444444444",
        tokenOut:
          "0x5555555555555555555555555555555555555555"
      }),
      Object.freeze({
        tokenIn:
          "0x5555555555555555555555555555555555555555",
        tokenOut: TOKEN
      })
    ]);

  const executionPlan = "0x1234";

  const currentStatePreflightEvidence =
    Object.freeze({
      candidate,
      executionLegs,
      executionPlan,
      currentStatePreflightReady: true,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

  const accountCallerIdentityEvidence =
    Object.freeze({
      currentStatePreflightEvidence,
      candidate,
      executionLegs,
      executionPlan,
      callerAddress: CALLER,
      ownerAddress: CALLER,
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

  const unsignedTransactionIntentEvidence =
    Object.freeze({
      accountCallerIdentityEvidence,
      candidate,
      executionLegs,
      executionPlan,
      flashloanToken: TOKEN,
      flashloanAmount:
        candidate.amountIn,
      transactionIntent,
      unsignedTransactionIntentReady: true,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

  const currentTransactionParameterEvidence =
    Object.freeze({
      unsignedTransactionIntentEvidence,
      transactionIntent,
      chainId: 137,
      nonce: 7,
      maxFeePerGas:
        ethers.utils.parseUnits(
          "60",
          "gwei"
        ),
      maxPriorityFeePerGas:
        ethers.utils.parseUnits(
          "30",
          "gwei"
        ),
      currentTransactionParametersReady: true,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

  const currentTransactionParameterAcquisitionCompositionEvidence =
    Object.freeze({
      currentTransactionParameterEvidence,
      currentTransactionParameterAcquisitionCompositionReady:
        true
    });

  return {
    transactionIntent,
    currentTransactionParameterEvidence,
    currentTransactionParameterAcquisitionCompositionEvidence
  };
}

test(
  "bridges exact parameter acquisition composition into current gas estimation",
  async () => {
    const f = fixture();

    const calls = [];

    const provider = {
      async estimateGas(request) {
        calls.push(request);

        return ethers.BigNumber.from(
          "653000"
        );
      }
    };

    const result =
      await buildCurrentTransactionGasEstimationAcquisitionCompositionEvidence({
        currentTransactionParameterAcquisitionCompositionEvidence:
          f.currentTransactionParameterAcquisitionCompositionEvidence,
        provider
      });

    assert.equal(
      result
        .currentTransactionParameterAcquisitionCompositionEvidence,
      f.currentTransactionParameterAcquisitionCompositionEvidence
    );

    assert.equal(
      result.currentTransactionGasEstimationEvidence
        .currentTransactionParameterEvidence,
      f.currentTransactionParameterEvidence
    );

    assert.equal(
      result.currentTransactionGasEstimationEvidence
        .estimatedGasUnits
        .toString(),
      "653000"
    );

    assert.equal(
      result
        .currentTransactionGasEstimationAcquisitionCompositionReady,
      true
    );

    assert.equal(
      calls.length,
      1
    );

    assert.deepEqual(
      calls[0],
      {
        from:
          f.transactionIntent.from,
        to:
          f.transactionIntent.to,
        data:
          f.transactionIntent.data,
        value:
          f.transactionIntent.value
      }
    );

    assert.equal(
      Object.isFrozen(result),
      true
    );
  }
);

test(
  "requires parameter acquisition composition evidence object",
  async () => {
    await assert.rejects(
      () =>
        buildCurrentTransactionGasEstimationAcquisitionCompositionEvidence({
          currentTransactionParameterAcquisitionCompositionEvidence:
            null,
          provider: {}
        }),
      /Current transaction parameter acquisition composition evidence must be an object/
    );
  }
);

test(
  "requires completed parameter acquisition composition provenance",
  async () => {
    const f = fixture();

    await assert.rejects(
      () =>
        buildCurrentTransactionGasEstimationAcquisitionCompositionEvidence({
          currentTransactionParameterAcquisitionCompositionEvidence:
            {
              ...f.currentTransactionParameterAcquisitionCompositionEvidence,
              currentTransactionParameterAcquisitionCompositionReady:
                false
            },
          provider: {}
        }),
      /Current transaction parameter acquisition composition evidence is not ready/
    );
  }
);

test(
  "requires completed current transaction parameter evidence",
  async () => {
    const f = fixture();

    await assert.rejects(
      () =>
        buildCurrentTransactionGasEstimationAcquisitionCompositionEvidence({
          currentTransactionParameterAcquisitionCompositionEvidence:
            {
              ...f.currentTransactionParameterAcquisitionCompositionEvidence,
              currentTransactionParameterEvidence:
                {
                  ...f.currentTransactionParameterEvidence,
                  currentTransactionParametersReady:
                    false
                }
            },
          provider: {}
        }),
      /Current transaction parameter evidence is not ready/
    );
  }
);

test(
  "propagates missing estimateGas provider rejection from established acquisition",
  async () => {
    const f = fixture();

    await assert.rejects(
      () =>
        buildCurrentTransactionGasEstimationAcquisitionCompositionEvidence({
          currentTransactionParameterAcquisitionCompositionEvidence:
            f.currentTransactionParameterAcquisitionCompositionEvidence,
          provider: {}
        }),
      /Provider with estimateGas is required/
    );
  }
);

test(
  "propagates invalid gas estimate rejection from established acquisition",
  async () => {
    const f = fixture();

    let estimateCalls = 0;

    const provider = {
      async estimateGas() {
        estimateCalls += 1;
        return ethers.constants.Zero;
      }
    };

    await assert.rejects(
      () =>
        buildCurrentTransactionGasEstimationAcquisitionCompositionEvidence({
          currentTransactionParameterAcquisitionCompositionEvidence:
            f.currentTransactionParameterAcquisitionCompositionEvidence,
          provider
        }),
      /Current transaction gas estimate must be a positive BigNumber/
    );

    assert.equal(
      estimateCalls,
      1
    );
  }
);

test(
  "does not advance execution authorization",
  async () => {
    const f = fixture();

    const provider = {
      async estimateGas() {
        return ethers.BigNumber.from(
          "653000"
        );
      }
    };

    const result =
      await buildCurrentTransactionGasEstimationAcquisitionCompositionEvidence({
        currentTransactionParameterAcquisitionCompositionEvidence:
          f.currentTransactionParameterAcquisitionCompositionEvidence,
        provider
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
        result.currentTransactionGasEstimationEvidence[field],
        false
      );
    }
  }
);
