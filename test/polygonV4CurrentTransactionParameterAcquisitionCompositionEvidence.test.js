"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  buildCurrentTransactionParameterAcquisitionCompositionEvidence
} = require(
  "../scripts/utils/" +
  "polygonV4CurrentTransactionParameterAcquisitionCompositionEvidence"
);

const CALLER =
  "0x1111111111111111111111111111111111111111";

const EXECUTOR =
  "0x2222222222222222222222222222222222222222";

function fixture() {
  const candidate =
    Object.freeze({});

  const executionLegs =
    Object.freeze([]);

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
      data: "0x1234",
      value: ethers.constants.Zero
    });

  const unsignedTransactionIntentEvidence =
    Object.freeze({
      accountCallerIdentityEvidence,
      candidate,
      executionLegs,
      executionPlan,
      transactionIntent,
      unsignedTransactionIntentReady: true,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

  const unsignedExactTransactionIntentCompositionEvidence =
    Object.freeze({
      unsignedTransactionIntentEvidence,
      unsignedExactTransactionIntentCompositionReady:
        true
    });

  return {
    unsignedTransactionIntentEvidence,
    unsignedExactTransactionIntentCompositionEvidence
  };
}

test(
  "bridges exact unsigned-intent composition into current parameter acquisition",
  async () => {
    const f = fixture();

    const calls = {
      getNetwork: 0,
      getTransactionCount: 0,
      getFeeData: 0
    };

    const provider = {
      async getNetwork() {
        calls.getNetwork += 1;
        return { chainId: 137 };
      },

      async getTransactionCount(
        address,
        blockTag
      ) {
        calls.getTransactionCount += 1;

        assert.equal(address, CALLER);
        assert.equal(blockTag, "pending");

        return 7;
      },

      async getFeeData() {
        calls.getFeeData += 1;

        return {
          maxFeePerGas:
            ethers.BigNumber.from("100"),
          maxPriorityFeePerGas:
            ethers.BigNumber.from("10")
        };
      }
    };

    const result =
      await buildCurrentTransactionParameterAcquisitionCompositionEvidence({
        unsignedExactTransactionIntentCompositionEvidence:
          f.unsignedExactTransactionIntentCompositionEvidence,
        provider
      });

    assert.equal(
      result
        .unsignedExactTransactionIntentCompositionEvidence,
      f.unsignedExactTransactionIntentCompositionEvidence
    );

    assert.equal(
      result.currentTransactionParameterEvidence
        .unsignedTransactionIntentEvidence,
      f.unsignedTransactionIntentEvidence
    );

    assert.equal(
      result.currentTransactionParameterEvidence
        .currentTransactionParametersReady,
      true
    );

    assert.equal(
      result
        .currentTransactionParameterAcquisitionCompositionReady,
      true
    );

    assert.deepEqual(
      calls,
      {
        getNetwork: 1,
        getTransactionCount: 1,
        getFeeData: 1
      }
    );

    assert.equal(
      Object.isFrozen(result),
      true
    );
  }
);

test(
  "requires unsigned-intent composition evidence object",
  async () => {
    await assert.rejects(
      () =>
        buildCurrentTransactionParameterAcquisitionCompositionEvidence({
          unsignedExactTransactionIntentCompositionEvidence:
            null,
          provider: {}
        }),
      /Unsigned exact transaction intent composition evidence must be an object/
    );
  }
);

test(
  "requires completed unsigned-intent composition provenance",
  async () => {
    const f = fixture();

    await assert.rejects(
      () =>
        buildCurrentTransactionParameterAcquisitionCompositionEvidence({
          unsignedExactTransactionIntentCompositionEvidence:
            {
              ...f.unsignedExactTransactionIntentCompositionEvidence,
              unsignedExactTransactionIntentCompositionReady:
                false
            },
          provider: {}
        }),
      /Unsigned exact transaction intent composition evidence is not ready/
    );
  }
);

test(
  "requires completed unsigned transaction intent evidence",
  async () => {
    const f = fixture();

    await assert.rejects(
      () =>
        buildCurrentTransactionParameterAcquisitionCompositionEvidence({
          unsignedExactTransactionIntentCompositionEvidence:
            {
              ...f.unsignedExactTransactionIntentCompositionEvidence,
              unsignedTransactionIntentEvidence:
                {
                  ...f.unsignedTransactionIntentEvidence,
                  unsignedTransactionIntentReady:
                    false
                }
            },
          provider: {}
        }),
      /Unsigned transaction intent evidence is not ready/
    );
  }
);

test(
  "propagates provider chain rejection from established parameter acquisition",
  async () => {
    const f = fixture();

    let networkCalls = 0;

    const provider = {
      async getNetwork() {
        networkCalls += 1;
        return { chainId: 1 };
      },

      async getTransactionCount() {
        throw new Error(
          "getTransactionCount must not be reached"
        );
      },

      async getFeeData() {
        throw new Error(
          "getFeeData must not be reached"
        );
      }
    };

    await assert.rejects(
      () =>
        buildCurrentTransactionParameterAcquisitionCompositionEvidence({
          unsignedExactTransactionIntentCompositionEvidence:
            f.unsignedExactTransactionIntentCompositionEvidence,
          provider
        }),
      /Polygon chain ID 137 required/
    );

    assert.equal(networkCalls, 1);
  }
);

test(
  "propagates invalid pending nonce rejection from established parameter acquisition",
  async () => {
    const f = fixture();

    let nonceCalls = 0;
    let feeCalls = 0;

    const provider = {
      async getNetwork() {
        return { chainId: 137 };
      },

      async getTransactionCount(
        address,
        blockTag
      ) {
        nonceCalls += 1;

        assert.equal(address, CALLER);
        assert.equal(blockTag, "pending");

        return -1;
      },

      async getFeeData() {
        feeCalls += 1;
        return {
          maxFeePerGas:
            ethers.BigNumber.from("100"),
          maxPriorityFeePerGas:
            ethers.BigNumber.from("10")
        };
      }
    };

    await assert.rejects(
      () =>
        buildCurrentTransactionParameterAcquisitionCompositionEvidence({
          unsignedExactTransactionIntentCompositionEvidence:
            f.unsignedExactTransactionIntentCompositionEvidence,
          provider
        }),
      /Pending nonce invalid/
    );

    assert.equal(nonceCalls, 1);
    assert.equal(feeCalls, 0);
  }
);

test(
  "does not advance execution authorization",
  async () => {
    const f = fixture();

    const provider = {
      async getNetwork() {
        return { chainId: 137 };
      },

      async getTransactionCount() {
        return 7;
      },

      async getFeeData() {
        return {
          maxFeePerGas:
            ethers.BigNumber.from("100"),
          maxPriorityFeePerGas:
            ethers.BigNumber.from("10")
        };
      }
    };

    const result =
      await buildCurrentTransactionParameterAcquisitionCompositionEvidence({
        unsignedExactTransactionIntentCompositionEvidence:
          f.unsignedExactTransactionIntentCompositionEvidence,
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
        result.currentTransactionParameterEvidence[field],
        false
      );
    }
  }
);
