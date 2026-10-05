"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  acquireCurrentTransactionPreSendSimulationEvidence
} = require(
  "../scripts/utils/polygonV4CurrentTransactionPreSendSimulationEvidence"
);

function fixture() {
  const transactionIntent = Object.freeze({
    from:
      "0x1111111111111111111111111111111111111111",
    to:
      "0x2222222222222222222222222222222222222222",
    data: "0x12345678",
    value: ethers.BigNumber.from(0)
  });

  const unsignedTransactionIntentEvidence =
    Object.freeze({
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
        ethers.BigNumber.from("50000000000"),
      maxPriorityFeePerGas:
        ethers.BigNumber.from("30000000000"),
      currentTransactionParametersReady: true,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

  const estimatedGasUnits =
    ethers.BigNumber.from("827233");

  const currentTransactionGasEstimationEvidence =
    Object.freeze({
      currentTransactionParameterEvidence,
      unsignedTransactionIntentEvidence,
      transactionIntent,
      estimatedGasUnits,
      currentTransactionGasEstimationReady: true,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

  const selectedGasLimit = estimatedGasUnits;

  const currentTransactionGasLimitSelectionEvidence =
    Object.freeze({
      currentTransactionGasEstimationEvidence,
      currentTransactionParameterEvidence,
      unsignedTransactionIntentEvidence,
      transactionIntent,
      selectedGasLimit,
      currentTransactionGasLimitSelectionReady: true,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

  const transactionEnvelope = Object.freeze({
    from: transactionIntent.from,
    to: transactionIntent.to,
    data: transactionIntent.data,
    value: transactionIntent.value,
    chainId: 137,
    nonce: 7,
    maxFeePerGas:
      currentTransactionParameterEvidence.maxFeePerGas,
    maxPriorityFeePerGas:
      currentTransactionParameterEvidence.maxPriorityFeePerGas,
    gasLimit: selectedGasLimit
  });

  const currentTransactionEnvelopeEvidence =
    Object.freeze({
      currentTransactionGasLimitSelectionEvidence,
      currentTransactionGasEstimationEvidence,
      currentTransactionParameterEvidence,
      unsignedTransactionIntentEvidence,
      transactionIntent,
      transactionEnvelope,
      currentTransactionEnvelopeReady: true,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

  return {
    transactionIntent,
    unsignedTransactionIntentEvidence,
    currentTransactionParameterEvidence,
    currentTransactionGasEstimationEvidence,
    currentTransactionGasLimitSelectionEvidence,
    transactionEnvelope,
    currentTransactionEnvelopeEvidence
  };
}

test(
  "uses the exact ready 1S.33 envelope for current pre-send simulation evidence",
  async () => {
    const h = fixture();
    const calls = [];

    const provider = {
      async call(request) {
        calls.push(request);
        return "0x";
      }
    };

    const result =
      await acquireCurrentTransactionPreSendSimulationEvidence({
        currentTransactionEnvelopeEvidence:
          h.currentTransactionEnvelopeEvidence,
        provider
      });

    assert.equal(calls.length, 1);

    const callRequest = calls[0];

    assert.deepEqual(
      Object.keys(callRequest).sort(),
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

    assert.equal(
      callRequest.from,
      h.transactionEnvelope.from
    );

    assert.equal(
      callRequest.to,
      h.transactionEnvelope.to
    );

    assert.equal(
      callRequest.data,
      h.transactionEnvelope.data
    );

    assert.equal(
      callRequest.value,
      h.transactionEnvelope.value
    );

    assert.equal(
      callRequest.gasLimit,
      h.transactionEnvelope.gasLimit
    );

    assert.equal(
      callRequest.maxFeePerGas,
      h.transactionEnvelope.maxFeePerGas
    );

    assert.equal(
      callRequest.maxPriorityFeePerGas,
      h.transactionEnvelope.maxPriorityFeePerGas
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        callRequest,
        "chainId"
      ),
      false
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        callRequest,
        "nonce"
      ),
      false
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        callRequest,
        "gasPrice"
      ),
      false
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        callRequest,
        "type"
      ),
      false
    );

    assert.equal(
      result.currentTransactionEnvelopeEvidence,
      h.currentTransactionEnvelopeEvidence
    );

    assert.equal(
      result.transactionEnvelope,
      h.transactionEnvelope
    );

    assert.equal(
      result.currentTransactionPreSendSimulationReady,
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

    assert.equal(Object.isFrozen(result), true);
  }
);

test(
  "rejects an envelope that is not ready",
  async () => {
    const h = fixture();

    const invalid = {
      ...h.currentTransactionEnvelopeEvidence,
      currentTransactionEnvelopeReady: false
    };

    await assert.rejects(
      acquireCurrentTransactionPreSendSimulationEvidence({
        currentTransactionEnvelopeEvidence:
          invalid,
        provider: {
          call: async () => "0x"
        }
      }),
      /ready|envelope/i
    );
  }
);

test(
  "rejects any upstream live, signer, or broadcast authorization",
  async () => {
    const h = fixture();

    for (const field of [
      "liveExecutionAuthorized",
      "signerAuthorized",
      "broadcastAuthorized"
    ]) {
      const invalid = {
        ...h.currentTransactionEnvelopeEvidence,
        [field]: true
      };

      let calls = 0;

      await assert.rejects(
        acquireCurrentTransactionPreSendSimulationEvidence({
          currentTransactionEnvelopeEvidence:
            invalid,
          provider: {
            call: async () => {
              calls += 1;
              return "0x";
            }
          }
        }),
        /authoriz/i
      );

      assert.equal(calls, 0);
    }
  }
);

test(
  "requires an injected provider with call capability",
  async () => {
    const h = fixture();

    for (const provider of [
      null,
      {},
      { call: null }
    ]) {
      await assert.rejects(
        acquireCurrentTransactionPreSendSimulationEvidence({
          currentTransactionEnvelopeEvidence:
            h.currentTransactionEnvelopeEvidence,
          provider
        }),
        /provider|call/i
      );
    }
  }
);

test(
  "propagates provider simulation failure unchanged",
  async () => {
    const h = fixture();
    const failure =
      new Error("current pre-send simulation reverted");

    await assert.rejects(
      acquireCurrentTransactionPreSendSimulationEvidence({
        currentTransactionEnvelopeEvidence:
          h.currentTransactionEnvelopeEvidence,
        provider: {
          call: async () => {
            throw failure;
          }
        }
      }),
      (error) => error === failure
    );
  }
);

test(
  "contains no signer, signing, sending, broadcast, wallet, env, or transaction reconstruction ownership",
  () => {
    const fs = require("node:fs");

    const source = fs.readFileSync(
      require.resolve(
        "../scripts/utils/polygonV4CurrentTransactionPreSendSimulationEvidence"
      ),
      "utf8"
    );

    const forbidden = [
      "PRIVATE_KEY",
      "process.env",
      "new ethers.Wallet",
      "new Wallet",
      "getSigners",
      "signTransaction",
      "sendTransaction",
      "sendRawTransaction",
      ".wait(",
      "initiateFlashloan",
      "buildUnsignedExactTransactionIntentEvidence",
      "buildCurrentTransactionEnvelopeEvidence",
      "selectCurrentTransactionGasLimitEvidence",
      "acquireCurrentTransactionGasEstimationEvidence",
      "acquireCurrentTransactionParameterEvidence"
    ];

    for (const value of forbidden) {
      assert.equal(
        source.includes(value),
        false,
        `forbidden ownership detected: ${value}`
      );
    }
  }
);

test(
  "rejects substituted upstream 1S.33 evidence identities before simulation",
  async () => {
    const h = fixture();

    const cases = [
      {
        field: "currentTransactionGasEstimationEvidence",
        value: {
          ...h.currentTransactionGasEstimationEvidence
        }
      },
      {
        field: "currentTransactionParameterEvidence",
        value: {
          ...h.currentTransactionParameterEvidence
        }
      },
      {
        field: "unsignedTransactionIntentEvidence",
        value: {
          ...h.unsignedTransactionIntentEvidence
        }
      },
      {
        field: "transactionIntent",
        value: {
          ...h.transactionIntent
        }
      }
    ];

    for (const item of cases) {
      let calls = 0;

      const invalid = {
        ...h.currentTransactionEnvelopeEvidence,
        [item.field]: item.value
      };

      await assert.rejects(
        acquireCurrentTransactionPreSendSimulationEvidence({
          currentTransactionEnvelopeEvidence:
            invalid,
          provider: {
            call: async () => {
              calls += 1;
              return "0x";
            }
          }
        }),
        /identity|mismatch|evidence/i
      );

      assert.equal(calls, 0);
    }
  }
);

test(
  "rejects transaction-intent field drift in the 1S.33 envelope before simulation",
  async () => {
    const h = fixture();

    const cases = [
      [
        "from",
        "0x3333333333333333333333333333333333333333"
      ],
      [
        "to",
        "0x4444444444444444444444444444444444444444"
      ],
      [
        "data",
        "0xdeadbeef"
      ],
      [
        "value",
        ethers.BigNumber.from(1)
      ]
    ];

    for (const [field, value] of cases) {
      let calls = 0;

      const invalid = {
        ...h.currentTransactionEnvelopeEvidence,
        transactionEnvelope: {
          ...h.transactionEnvelope,
          [field]: value
        }
      };

      await assert.rejects(
        acquireCurrentTransactionPreSendSimulationEvidence({
          currentTransactionEnvelopeEvidence:
            invalid,
          provider: {
            call: async () => {
              calls += 1;
              return "0x";
            }
          }
        }),
        /envelope|intent|mismatch|identity/i
      );

      assert.equal(calls, 0);
    }
  }
);

test(
  "rejects current-parameter drift in the 1S.33 envelope before simulation",
  async () => {
    const h = fixture();

    const cases = [
      ["chainId", 1],
      ["nonce", 8],
      [
        "maxFeePerGas",
        ethers.BigNumber.from("50000000001")
      ],
      [
        "maxPriorityFeePerGas",
        ethers.BigNumber.from("30000000001")
      ]
    ];

    for (const [field, value] of cases) {
      let calls = 0;

      const invalid = {
        ...h.currentTransactionEnvelopeEvidence,
        transactionEnvelope: {
          ...h.transactionEnvelope,
          [field]: value
        }
      };

      await assert.rejects(
        acquireCurrentTransactionPreSendSimulationEvidence({
          currentTransactionEnvelopeEvidence:
            invalid,
          provider: {
            call: async () => {
              calls += 1;
              return "0x";
            }
          }
        }),
        /envelope|parameter|mismatch|identity/i
      );

      assert.equal(calls, 0);
    }
  }
);

test(
  "rejects gas-limit drift from the exact 1S.33 selected gas-limit identity before simulation",
  async () => {
    const h = fixture();
    let calls = 0;

    const invalid = {
      ...h.currentTransactionEnvelopeEvidence,
      transactionEnvelope: {
        ...h.transactionEnvelope,
        gasLimit:
          ethers.BigNumber.from(
            h.transactionEnvelope.gasLimit.toString()
          )
      }
    };

    assert.equal(
      invalid.transactionEnvelope.gasLimit.eq(
        h.currentTransactionGasLimitSelectionEvidence
          .selectedGasLimit
      ),
      true
    );

    assert.notEqual(
      invalid.transactionEnvelope.gasLimit,
      h.currentTransactionGasLimitSelectionEvidence
        .selectedGasLimit
    );

    await assert.rejects(
      acquireCurrentTransactionPreSendSimulationEvidence({
        currentTransactionEnvelopeEvidence:
          invalid,
        provider: {
          call: async () => {
            calls += 1;
            return "0x";
          }
        }
      }),
      /gas|identity|mismatch/i
    );

    assert.equal(calls, 0);
  }
);


test(
  "rejects invalid nested 1S.33 readiness before simulation",
  async () => {
    const h = fixture();

    const cases = [
      [
        "currentTransactionGasLimitSelectionEvidence",
        "currentTransactionGasLimitSelectionReady"
      ],
      [
        "currentTransactionGasEstimationEvidence",
        "currentTransactionGasEstimationReady"
      ],
      [
        "currentTransactionParameterEvidence",
        "currentTransactionParametersReady"
      ],
      [
        "unsignedTransactionIntentEvidence",
        "unsignedTransactionIntentReady"
      ]
    ];

    for (const [field, readinessField] of cases) {
      const original =
        h.currentTransactionEnvelopeEvidence[field];

      const changed = {
        ...original,
        [readinessField]: false
      };

      const invalid = {
        ...h.currentTransactionEnvelopeEvidence,
        [field]: changed
      };

      /*
       * Preserve all graph relationships that legitimately
       * point at this object so this test isolates readiness,
       * not an unrelated identity mismatch.
       */
      if (
        field ===
        "currentTransactionGasEstimationEvidence"
      ) {
        invalid.currentTransactionGasLimitSelectionEvidence = {
          ...h.currentTransactionGasLimitSelectionEvidence,
          currentTransactionGasEstimationEvidence:
            changed
        };
      }

      if (
        field ===
        "currentTransactionParameterEvidence"
      ) {
        const changedEstimation = {
          ...h.currentTransactionGasEstimationEvidence,
          currentTransactionParameterEvidence:
            changed
        };

        invalid.currentTransactionGasEstimationEvidence =
          changedEstimation;

        invalid.currentTransactionGasLimitSelectionEvidence = {
          ...h.currentTransactionGasLimitSelectionEvidence,
          currentTransactionGasEstimationEvidence:
            changedEstimation,
          currentTransactionParameterEvidence:
            changed
        };
      }

      if (
        field ===
        "unsignedTransactionIntentEvidence"
      ) {
        const changedParameters = {
          ...h.currentTransactionParameterEvidence,
          unsignedTransactionIntentEvidence:
            changed
        };

        const changedEstimation = {
          ...h.currentTransactionGasEstimationEvidence,
          currentTransactionParameterEvidence:
            changedParameters,
          unsignedTransactionIntentEvidence:
            changed
        };

        invalid.currentTransactionParameterEvidence =
          changedParameters;

        invalid.currentTransactionGasEstimationEvidence =
          changedEstimation;

        invalid.currentTransactionGasLimitSelectionEvidence = {
          ...h.currentTransactionGasLimitSelectionEvidence,
          currentTransactionGasEstimationEvidence:
            changedEstimation,
          currentTransactionParameterEvidence:
            changedParameters,
          unsignedTransactionIntentEvidence:
            changed
        };
      }

      let calls = 0;

      await assert.rejects(
        acquireCurrentTransactionPreSendSimulationEvidence({
          currentTransactionEnvelopeEvidence:
            invalid,
          provider: {
            call: async () => {
              calls += 1;
              return "0x";
            }
          }
        }),
        /ready|readiness/i
      );

      assert.equal(calls, 0);
    }
  }
);

test(
  "rejects nested 1S.33 authorization drift before simulation",
  async () => {
    const h = fixture();

    const evidenceFields = [
      "currentTransactionGasLimitSelectionEvidence",
      "currentTransactionGasEstimationEvidence",
      "currentTransactionParameterEvidence",
      "unsignedTransactionIntentEvidence"
    ];

    const authorizationFields = [
      "liveExecutionAuthorized",
      "signerAuthorized",
      "broadcastAuthorized"
    ];

    for (const evidenceField of evidenceFields) {
      for (const authorizationField of authorizationFields) {
        const original =
          h.currentTransactionEnvelopeEvidence[evidenceField];

        const changed = {
          ...original,
          [authorizationField]: true
        };

        const invalid = {
          ...h.currentTransactionEnvelopeEvidence,
          [evidenceField]: changed
        };

        if (
          evidenceField ===
          "currentTransactionGasEstimationEvidence"
        ) {
          invalid.currentTransactionGasLimitSelectionEvidence = {
            ...h.currentTransactionGasLimitSelectionEvidence,
            currentTransactionGasEstimationEvidence:
              changed
          };
        }

        if (
          evidenceField ===
          "currentTransactionParameterEvidence"
        ) {
          const changedEstimation = {
            ...h.currentTransactionGasEstimationEvidence,
            currentTransactionParameterEvidence:
              changed
          };

          invalid.currentTransactionGasEstimationEvidence =
            changedEstimation;

          invalid.currentTransactionGasLimitSelectionEvidence = {
            ...h.currentTransactionGasLimitSelectionEvidence,
            currentTransactionGasEstimationEvidence:
              changedEstimation,
            currentTransactionParameterEvidence:
              changed
          };
        }

        if (
          evidenceField ===
          "unsignedTransactionIntentEvidence"
        ) {
          const changedParameters = {
            ...h.currentTransactionParameterEvidence,
            unsignedTransactionIntentEvidence:
              changed
          };

          const changedEstimation = {
            ...h.currentTransactionGasEstimationEvidence,
            currentTransactionParameterEvidence:
              changedParameters,
            unsignedTransactionIntentEvidence:
              changed
          };

          invalid.currentTransactionParameterEvidence =
            changedParameters;

          invalid.currentTransactionGasEstimationEvidence =
            changedEstimation;

          invalid.currentTransactionGasLimitSelectionEvidence = {
            ...h.currentTransactionGasLimitSelectionEvidence,
            currentTransactionGasEstimationEvidence:
              changedEstimation,
            currentTransactionParameterEvidence:
              changedParameters,
            unsignedTransactionIntentEvidence:
              changed
          };
        }

        let calls = 0;

        await assert.rejects(
          acquireCurrentTransactionPreSendSimulationEvidence({
            currentTransactionEnvelopeEvidence:
              invalid,
            provider: {
              call: async () => {
                calls += 1;
                return "0x";
              }
            }
          }),
          /authoriz/i
        );

        assert.equal(calls, 0);
      }
    }
  }
);

test(
  "accepts actual 1S.31 -> 1S.33 production output and performs the exact 1S.34 call projection",
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

    const {
      buildCurrentTransactionEnvelopeEvidence
    } = require(
      "../scripts/utils/polygonV4CurrentTransactionEnvelopeEvidence"
    );

    const CALLER =
      "0x1111111111111111111111111111111111111111";

    const EXECUTOR =
      "0x2222222222222222222222222222222222222222";

    const candidate = Object.freeze({
      id: "1S34-real-composition-candidate"
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
    let simulationCalls = 0;
    let observedCallRequest;

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
      },

      async call(transaction) {
        simulationCalls += 1;
        observedCallRequest = transaction;
        return "0x";
      }
    };

    const estimation =
      await acquireCurrentTransactionGasEstimationEvidence({
        currentTransactionParameterEvidence:
          parameters,
        provider
      });

    const selection =
      selectCurrentTransactionGasLimitEvidence({
        currentTransactionGasEstimationEvidence:
          estimation
      });

    const envelope =
      buildCurrentTransactionEnvelopeEvidence({
        currentTransactionGasLimitSelectionEvidence:
          selection
      });

    const result =
      await acquireCurrentTransactionPreSendSimulationEvidence({
        currentTransactionEnvelopeEvidence:
          envelope,
        provider
      });

    assert.equal(
      estimateCalls,
      1
    );

    assert.equal(
      simulationCalls,
      1
    );

    assert.strictEqual(
      envelope.currentTransactionGasLimitSelectionEvidence,
      selection
    );

    assert.strictEqual(
      envelope.currentTransactionGasEstimationEvidence,
      estimation
    );

    assert.strictEqual(
      envelope.currentTransactionParameterEvidence,
      parameters
    );

    assert.strictEqual(
      envelope.unsignedTransactionIntentEvidence,
      unsigned
    );

    assert.strictEqual(
      envelope.transactionIntent,
      transactionIntent
    );

    assert.strictEqual(
      result.currentTransactionEnvelopeEvidence,
      envelope
    );

    assert.strictEqual(
      result.transactionEnvelope,
      envelope.transactionEnvelope
    );

    assert.strictEqual(
      observedCallRequest,
      result.callRequest
    );

    assert.deepEqual(
      Object.keys(observedCallRequest).sort(),
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
      observedCallRequest.from,
      transactionIntent.from
    );

    assert.strictEqual(
      observedCallRequest.to,
      transactionIntent.to
    );

    assert.strictEqual(
      observedCallRequest.data,
      transactionIntent.data
    );

    assert.strictEqual(
      observedCallRequest.value,
      transactionIntent.value
    );

    assert.strictEqual(
      observedCallRequest.gasLimit,
      selection.selectedGasLimit
    );

    assert.strictEqual(
      observedCallRequest.maxFeePerGas,
      parameters.maxFeePerGas
    );

    assert.strictEqual(
      observedCallRequest.maxPriorityFeePerGas,
      parameters.maxPriorityFeePerGas
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        observedCallRequest,
        "chainId"
      ),
      false
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        observedCallRequest,
        "nonce"
      ),
      false
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        observedCallRequest,
        "gasPrice"
      ),
      false
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        observedCallRequest,
        "type"
      ),
      false
    );

    assert.equal(
      result.simulationResult,
      "0x"
    );

    assert.equal(
      result.currentTransactionPreSendSimulationReady,
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
      Object.isFrozen(result.callRequest),
      true
    );

    assert.equal(
      Object.isFrozen(result),
      true
    );
  }
);
