"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const MODULE_PATH =
  "../scripts/utils/polygonV4CurrentTransactionGasLimitSelectionEvidence";

const CALLER =
  "0x1111111111111111111111111111111111111111";

const EXECUTOR =
  "0x2222222222222222222222222222222222222222";

function makeEvidence({
  estimatedGasUnits =
    ethers.BigNumber.from("827233")
} = {}) {
  const candidate =
    Object.freeze({
      id: "1S32-test-candidate"
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
        ethers.BigNumber.from("30000000000"),
      maxPriorityFeePerGas:
        ethers.BigNumber.from("30000000000"),
      currentTransactionParametersReady:
        true,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

  return Object.freeze({
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
}

test(
  "selects the exact current transaction estimate as gas-limit evidence without adding a margin",
  () => {
    const {
      selectCurrentTransactionGasLimitEvidence
    } = require(MODULE_PATH);

    const estimationEvidence =
      makeEvidence({
        estimatedGasUnits:
          ethers.BigNumber.from("900123")
      });

    const result =
      selectCurrentTransactionGasLimitEvidence({
        currentTransactionGasEstimationEvidence:
          estimationEvidence
      });

    assert.equal(
      result.currentTransactionGasEstimationEvidence,
      estimationEvidence
    );

    assert.equal(
      result.currentTransactionParameterEvidence,
      estimationEvidence.currentTransactionParameterEvidence
    );

    assert.equal(
      result.unsignedTransactionIntentEvidence,
      estimationEvidence.unsignedTransactionIntentEvidence
    );

    assert.equal(
      result.transactionIntent,
      estimationEvidence.transactionIntent
    );

    assert.strictEqual(
      result.selectedGasLimit,
      estimationEvidence.estimatedGasUnits
    );

    assert.equal(
      result.selectedGasLimit.toString(),
      "900123"
    );

    assert.equal(
      result.currentTransactionGasLimitSelectionReady,
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

    assert.equal(
      Object.isFrozen(result),
      true
    );
  }
);

test(
  "does not substitute qualification-policy or historical receipt gas constants",
  () => {
    const {
      selectCurrentTransactionGasLimitEvidence
    } = require(MODULE_PATH);

    for (const estimate of [
      "699999",
      "700001",
      "652105",
      "652107",
      "827232",
      "827234"
    ]) {
      const estimationEvidence =
        makeEvidence({
          estimatedGasUnits:
            ethers.BigNumber.from(estimate)
        });

      const result =
        selectCurrentTransactionGasLimitEvidence({
          currentTransactionGasEstimationEvidence:
            estimationEvidence
        });

      assert.strictEqual(
        result.selectedGasLimit,
        estimationEvidence.estimatedGasUnits
      );

      assert.equal(
        result.selectedGasLimit.toString(),
        estimate
      );
    }
  }
);

test(
  "rejects non-ready gas-estimation evidence",
  () => {
    const {
      selectCurrentTransactionGasLimitEvidence
    } = require(MODULE_PATH);

    const evidence =
      makeEvidence();

    assert.throws(
      () =>
        selectCurrentTransactionGasLimitEvidence({
          currentTransactionGasEstimationEvidence:
            {
              ...evidence,
              currentTransactionGasEstimationReady:
                false
            }
        }),
      /gas estimation.*ready/i
    );
  }
);

test(
  "rejects execution authorization contamination",
  () => {
    const {
      selectCurrentTransactionGasLimitEvidence
    } = require(MODULE_PATH);

    for (const flag of [
      "liveExecutionAuthorized",
      "signerAuthorized",
      "broadcastAuthorized"
    ]) {
      const evidence =
        makeEvidence();

      assert.throws(
        () =>
          selectCurrentTransactionGasLimitEvidence({
            currentTransactionGasEstimationEvidence:
              {
                ...evidence,
                [flag]: true
              }
          }),
        /authoriz/i
      );
    }
  }
);

test(
  "rejects invalid estimated gas units",
  () => {
    const {
      selectCurrentTransactionGasLimitEvidence
    } = require(MODULE_PATH);

    for (const estimatedGasUnits of [
      827233,
      "827233",
      ethers.constants.Zero
    ]) {
      assert.throws(
        () =>
          selectCurrentTransactionGasLimitEvidence({
            currentTransactionGasEstimationEvidence:
              makeEvidence({
                estimatedGasUnits
              })
          }),
        /gas/i
      );
    }
  }
);

test(
  "rejects current transaction parameter evidence that is not ready",
  () => {
    const {
      selectCurrentTransactionGasLimitEvidence
    } = require(MODULE_PATH);

    const evidence = makeEvidence();

    const badParameters = {
      ...evidence.currentTransactionParameterEvidence,
      currentTransactionParametersReady:
        false
    };

    assert.throws(
      () =>
        selectCurrentTransactionGasLimitEvidence({
          currentTransactionGasEstimationEvidence:
            {
              ...evidence,
              currentTransactionParameterEvidence:
                badParameters
            }
        }),
      /parameter.*ready/i
    );
  }
);

test(
  "rejects authorization contamination in current transaction parameter evidence",
  () => {
    const {
      selectCurrentTransactionGasLimitEvidence
    } = require(MODULE_PATH);

    for (const flag of [
      "liveExecutionAuthorized",
      "signerAuthorized",
      "broadcastAuthorized"
    ]) {
      const evidence = makeEvidence();

      assert.throws(
        () =>
          selectCurrentTransactionGasLimitEvidence({
            currentTransactionGasEstimationEvidence:
              {
                ...evidence,
                currentTransactionParameterEvidence:
                  {
                    ...evidence.currentTransactionParameterEvidence,
                    [flag]: true
                  }
              }
          }),
        /authoriz/i
      );
    }
  }
);

test(
  "rejects unsigned transaction evidence that is not ready",
  () => {
    const {
      selectCurrentTransactionGasLimitEvidence
    } = require(MODULE_PATH);

    const evidence = makeEvidence();

    const badUnsigned = {
      ...evidence.unsignedTransactionIntentEvidence,
      unsignedTransactionIntentReady:
        false
    };

    const badParameters = {
      ...evidence.currentTransactionParameterEvidence,
      unsignedTransactionIntentEvidence:
        badUnsigned
    };

    assert.throws(
      () =>
        selectCurrentTransactionGasLimitEvidence({
          currentTransactionGasEstimationEvidence:
            {
              ...evidence,
              unsignedTransactionIntentEvidence:
                badUnsigned,
              currentTransactionParameterEvidence:
                badParameters
            }
        }),
      /unsigned.*ready/i
    );
  }
);

test(
  "rejects authorization contamination in unsigned transaction evidence",
  () => {
    const {
      selectCurrentTransactionGasLimitEvidence
    } = require(MODULE_PATH);

    for (const flag of [
      "liveExecutionAuthorized",
      "signerAuthorized",
      "broadcastAuthorized"
    ]) {
      const evidence = makeEvidence();

      const badUnsigned = {
        ...evidence.unsignedTransactionIntentEvidence,
        [flag]: true
      };

      const badParameters = {
        ...evidence.currentTransactionParameterEvidence,
        unsignedTransactionIntentEvidence:
          badUnsigned
      };

      assert.throws(
        () =>
          selectCurrentTransactionGasLimitEvidence({
            currentTransactionGasEstimationEvidence:
              {
                ...evidence,
                unsignedTransactionIntentEvidence:
                  badUnsigned,
                currentTransactionParameterEvidence:
                  badParameters
              }
          }),
        /authoriz/i
      );
    }
  }
);

test(
  "rejects broken parameter to unsigned evidence identity",
  () => {
    const {
      selectCurrentTransactionGasLimitEvidence
    } = require(MODULE_PATH);

    const evidence = makeEvidence();

    assert.throws(
      () =>
        selectCurrentTransactionGasLimitEvidence({
          currentTransactionGasEstimationEvidence:
            {
              ...evidence,
              currentTransactionParameterEvidence:
                {
                  ...evidence.currentTransactionParameterEvidence,
                  unsignedTransactionIntentEvidence:
                    {
                      ...evidence.unsignedTransactionIntentEvidence
                    }
                }
            }
        }),
      /unsigned.*identity/i
    );
  }
);

test(
  "rejects broken transaction intent identity",
  () => {
    const {
      selectCurrentTransactionGasLimitEvidence
    } = require(MODULE_PATH);

    const evidence = makeEvidence();

    assert.throws(
      () =>
        selectCurrentTransactionGasLimitEvidence({
          currentTransactionGasEstimationEvidence:
            {
              ...evidence,
              transactionIntent:
                {
                  ...evidence.transactionIntent
                }
            }
        }),
      /transaction intent.*identity/i
    );
  }
);

test(
  "rejects account caller identity evidence that is not ready",
  () => {
    const {
      selectCurrentTransactionGasLimitEvidence
    } = require(MODULE_PATH);

    const evidence = makeEvidence();

    const unsigned =
      evidence.unsignedTransactionIntentEvidence;

    const badAccount = {
      ...unsigned.accountCallerIdentityEvidence,
      accountCallerIdentityReady: false
    };

    const badUnsigned = {
      ...unsigned,
      accountCallerIdentityEvidence:
        badAccount
    };

    const badParameters = {
      ...evidence.currentTransactionParameterEvidence,
      unsignedTransactionIntentEvidence:
        badUnsigned
    };

    assert.throws(
      () =>
        selectCurrentTransactionGasLimitEvidence({
          currentTransactionGasEstimationEvidence:
            {
              ...evidence,
              unsignedTransactionIntentEvidence:
                badUnsigned,
              currentTransactionParameterEvidence:
                badParameters
            }
        }),
      /account.*ready/i
    );
  }
);

test(
  "rejects current-state preflight evidence that is not ready",
  () => {
    const {
      selectCurrentTransactionGasLimitEvidence
    } = require(MODULE_PATH);

    const evidence = makeEvidence();

    const unsigned =
      evidence.unsignedTransactionIntentEvidence;

    const account =
      unsigned.accountCallerIdentityEvidence;

    const badPreflight = {
      ...account.currentStatePreflightEvidence,
      currentStatePreflightReady: false
    };

    const badAccount = {
      ...account,
      currentStatePreflightEvidence:
        badPreflight
    };

    const badUnsigned = {
      ...unsigned,
      accountCallerIdentityEvidence:
        badAccount
    };

    const badParameters = {
      ...evidence.currentTransactionParameterEvidence,
      unsignedTransactionIntentEvidence:
        badUnsigned
    };

    assert.throws(
      () =>
        selectCurrentTransactionGasLimitEvidence({
          currentTransactionGasEstimationEvidence:
            {
              ...evidence,
              unsignedTransactionIntentEvidence:
                badUnsigned,
              currentTransactionParameterEvidence:
                badParameters
            }
        }),
      /preflight.*ready/i
    );
  }
);

test(
  "rejects authorization contamination below unsigned evidence",
  () => {
    const {
      selectCurrentTransactionGasLimitEvidence
    } = require(MODULE_PATH);

    for (const layer of [
      "account",
      "preflight"
    ]) {
      const evidence = makeEvidence();

      const unsigned =
        evidence.unsignedTransactionIntentEvidence;

      const account =
        unsigned.accountCallerIdentityEvidence;

      const preflight =
        account.currentStatePreflightEvidence;

      let badAccount;

      if (layer === "account") {
        badAccount = {
          ...account,
          liveExecutionAuthorized: true
        };
      } else {
        badAccount = {
          ...account,
          currentStatePreflightEvidence: {
            ...preflight,
            liveExecutionAuthorized: true
          }
        };
      }

      const badUnsigned = {
        ...unsigned,
        accountCallerIdentityEvidence:
          badAccount
      };

      const badParameters = {
        ...evidence.currentTransactionParameterEvidence,
        unsignedTransactionIntentEvidence:
          badUnsigned
      };

      assert.throws(
        () =>
          selectCurrentTransactionGasLimitEvidence({
            currentTransactionGasEstimationEvidence:
              {
                ...evidence,
                unsignedTransactionIntentEvidence:
                  badUnsigned,
                currentTransactionParameterEvidence:
                  badParameters
              }
          }),
        /authoriz/i
      );
    }
  }
);

test(
  "accepts actual 1S.31 output and preserves its exact estimate as selected gas limit",
  async () => {
    const {
      acquireCurrentTransactionGasEstimationEvidence
    } = require(
      "../scripts/utils/polygonV4CurrentTransactionGasEstimationEvidence"
    );

    const {
      selectCurrentTransactionGasLimitEvidence
    } = require(MODULE_PATH);

    const candidate = Object.freeze({
      id: "1S32-real-1S31-candidate"
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
      unsignedTransactionIntentReady: true,
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
        ethers.BigNumber.from("30000000000"),
      maxPriorityFeePerGas:
        ethers.BigNumber.from("30000000000"),
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

    assert.equal(estimateCalls, 1);

    const result =
      selectCurrentTransactionGasLimitEvidence({
        currentTransactionGasEstimationEvidence:
          estimation
      });

    assert.strictEqual(
      result.currentTransactionGasEstimationEvidence,
      estimation
    );

    assert.strictEqual(
      result.currentTransactionParameterEvidence,
      estimation.currentTransactionParameterEvidence
    );

    assert.strictEqual(
      result.unsignedTransactionIntentEvidence,
      estimation.unsignedTransactionIntentEvidence
    );

    assert.strictEqual(
      result.transactionIntent,
      estimation.transactionIntent
    );

    assert.strictEqual(
      result.selectedGasLimit,
      estimation.estimatedGasUnits
    );

    assert.strictEqual(
      result.selectedGasLimit,
      expectedEstimate
    );

    assert.equal(
      result.selectedGasLimit.toString(),
      "913579"
    );

    assert.equal(
      result.currentTransactionGasLimitSelectionReady,
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
