"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  validateFinalSignedTransactionCurrentStateEvidence
} = require(
  "../scripts/utils/polygonV4FinalSignedTransactionCurrentStateValidationEvidence"
);

const SIGNER =
  "0x1111111111111111111111111111111111111111";

const EXECUTOR =
  "0x2222222222222222222222222222222222222222";

function makeEnvelope() {
  return Object.freeze({
    from: SIGNER,
    to: EXECUTOR,
    data: "0x12345678",
    value: ethers.constants.Zero,
    chainId: 137,
    nonce: 42,
    maxFeePerGas:
      ethers.BigNumber.from("50000000000"),
    maxPriorityFeePerGas:
      ethers.BigNumber.from("30000000000"),
    gasLimit:
      ethers.BigNumber.from("123456")
  });
}

function makeSigningEvidence({
  envelope = makeEnvelope()
} = {}) {
  const signerCapabilityBindingEvidence =
    Object.freeze({
      transactionEnvelope: envelope,
      signerAddress: SIGNER,
      signerCapabilityAddress: SIGNER,

      signerCapabilityBindingReady: true,

      signerAuthorized: true,
      signingAuthorized: true,

      liveExecutionAuthorized: false,
      broadcastAuthorized: false
    });

  return Object.freeze({
    signerCapabilityBindingEvidence,

    transactionEnvelope: envelope,

    signerAddress: SIGNER,
    signerCapabilityAddress: SIGNER,

    signedRawTransaction: "0x1234",
    signedTransactionHash:
      "0x" + "ab".repeat(32),

    transactionSigningReady: true,

    signerAuthorized: true,
    signingAuthorized: true,

    liveExecutionAuthorized: false,
    broadcastAuthorized: false
  });
}

function makeProvider({
  chainId = 137,
  pendingNonce = 42,
  callResult = "0x"
} = {}) {
  const observations = {
    networkCalls: 0,
    nonceCalls: [],
    callRequests: []
  };

  return {
    observations,

    async getNetwork() {
      observations.networkCalls += 1;

      return {
        chainId
      };
    },

    async getTransactionCount(
      address,
      blockTag
    ) {
      observations.nonceCalls.push({
        address,
        blockTag
      });

      return pendingNonce;
    },

    async call(request) {
      observations.callRequests.push(
        request
      );

      return callResult;
    }
  };
}

test(
  "1S.40 validates the exact signed transaction against current chain, pending nonce and final call without authorizing broadcast",
  async () => {
    const signingEvidence =
      makeSigningEvidence();

    const provider =
      makeProvider();

    const result =
      await validateFinalSignedTransactionCurrentStateEvidence({
        transactionSigningEvidence:
          signingEvidence,
        provider
      });

    assert.equal(
      result.transactionSigningEvidence,
      signingEvidence
    );

    assert.equal(
      result.transactionEnvelope,
      signingEvidence.transactionEnvelope
    );

    assert.equal(
      result.signedRawTransaction,
      signingEvidence.signedRawTransaction
    );

    assert.equal(
      result.signedTransactionHash,
      signingEvidence.signedTransactionHash
    );

    assert.equal(
      provider.observations.networkCalls,
      1
    );

    assert.deepEqual(
      provider.observations.nonceCalls,
      [
        {
          address: SIGNER,
          blockTag: "pending"
        }
      ]
    );

    assert.equal(
      provider.observations.callRequests.length,
      1
    );

    assert.deepEqual(
      provider.observations.callRequests[0],
      {
        from: SIGNER,
        to: EXECUTOR,
        data: "0x12345678",
        value: ethers.constants.Zero,
        gasLimit:
          signingEvidence.transactionEnvelope.gasLimit,
        maxFeePerGas:
          signingEvidence.transactionEnvelope.maxFeePerGas,
        maxPriorityFeePerGas:
          signingEvidence.transactionEnvelope.maxPriorityFeePerGas
      }
    );

    assert.equal(
      result.finalSignedTransactionCurrentStateReady,
      true
    );

    assert.equal(
      result.signerAuthorized,
      true
    );

    assert.equal(
      result.signingAuthorized,
      true
    );

    assert.equal(
      result.liveExecutionAuthorized,
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
  "1S.40 rejects signing evidence that is not ready",
  async () => {
    const evidence = {
      ...makeSigningEvidence(),
      transactionSigningReady: false
    };

    await assert.rejects(
      validateFinalSignedTransactionCurrentStateEvidence({
        transactionSigningEvidence: evidence,
        provider: makeProvider()
      }),
      /transaction signing evidence must be ready/
    );
  }
);

test(
  "1S.40 rejects upstream live execution or broadcast authorization",
  async () => {
    for (const field of [
      "liveExecutionAuthorized",
      "broadcastAuthorized"
    ]) {
      const evidence = {
        ...makeSigningEvidence(),
        [field]: true
      };

      await assert.rejects(
        validateFinalSignedTransactionCurrentStateEvidence({
          transactionSigningEvidence: evidence,
          provider: makeProvider()
        }),
        /execution and broadcast authorization must remain false/
      );
    }
  }
);

test(
  "1S.40 rejects missing signer or signing authorization",
  async () => {
    for (const field of [
      "signerAuthorized",
      "signingAuthorized"
    ]) {
      const evidence = {
        ...makeSigningEvidence(),
        [field]: false
      };

      await assert.rejects(
        validateFinalSignedTransactionCurrentStateEvidence({
          transactionSigningEvidence: evidence,
          provider: makeProvider()
        }),
        /signer and signing authorization must remain true/
      );
    }
  }
);

test(
  "1S.40 rejects a current provider network other than Polygon 137 before nonce or simulation",
  async () => {
    const provider =
      makeProvider({
        chainId: 1
      });

    await assert.rejects(
      validateFinalSignedTransactionCurrentStateEvidence({
        transactionSigningEvidence:
          makeSigningEvidence(),
        provider
      }),
      /current Polygon chain ID 137 required/
    );

    assert.equal(
      provider.observations.nonceCalls.length,
      0
    );

    assert.equal(
      provider.observations.callRequests.length,
      0
    );
  }
);

test(
  "1S.40 rejects pending nonce drift before final simulation",
  async () => {
    for (const pendingNonce of [41, 43]) {
      const provider =
        makeProvider({
          pendingNonce
        });

      await assert.rejects(
        validateFinalSignedTransactionCurrentStateEvidence({
          transactionSigningEvidence:
            makeSigningEvidence(),
          provider
        }),
        /current pending nonce does not match signed transaction nonce/
      );

      assert.equal(
        provider.observations.callRequests.length,
        0
      );
    }
  }
);

test(
  "1S.40 fails closed when final provider call rejects",
  async () => {
    const provider =
      makeProvider();

    provider.call =
      async request => {
        provider.observations.callRequests.push(
          request
        );

        throw new Error(
          "final simulation reverted"
        );
      };

    await assert.rejects(
      validateFinalSignedTransactionCurrentStateEvidence({
        transactionSigningEvidence:
          makeSigningEvidence(),
        provider
      }),
      /final simulation reverted/
    );

    assert.equal(
      provider.observations.callRequests.length,
      1
    );
  }
);

test(
  "1S.40 requires ready signer capability binding evidence",
  async () => {
    const evidence = {
      ...makeSigningEvidence(),
      signerCapabilityBindingEvidence: {
        signerCapabilityBindingReady: false
      }
    };

    await assert.rejects(
      validateFinalSignedTransactionCurrentStateEvidence({
        transactionSigningEvidence: evidence,
        provider: makeProvider()
      }),
      /signer capability binding/i
    );
  }
);

test(
  "1S.40 rejects transaction envelope identity drift from signer capability binding evidence",
  async () => {
    const original =
      makeSigningEvidence();

    const evidence = {
      ...original,
      transactionEnvelope: {
        ...original.transactionEnvelope
      }
    };

    await assert.rejects(
      validateFinalSignedTransactionCurrentStateEvidence({
        transactionSigningEvidence: evidence,
        provider: makeProvider()
      }),
      /envelope.*identity|identity.*envelope/i
    );
  }
);

test(
  "1S.40 rejects signer identity drift from signer capability binding evidence",
  async () => {
    const original =
      makeSigningEvidence();

    const evidence = {
      ...original,
      signerAddress:
        "0x3333333333333333333333333333333333333333"
    };

    await assert.rejects(
      validateFinalSignedTransactionCurrentStateEvidence({
        transactionSigningEvidence: evidence,
        provider: makeProvider()
      }),
      /signer.*identity|identity.*signer/i
    );
  }
);

test(
  "1S.40 rejects signer capability binding authorization drift",
  async () => {
    const cases = [
      {
        field: "signerAuthorized",
        value: false,
        expected:
          /signer capability binding authorization must remain true/
      },
      {
        field: "signingAuthorized",
        value: false,
        expected:
          /signer capability binding authorization must remain true/
      },
      {
        field: "liveExecutionAuthorized",
        value: true,
        expected:
          /signer capability binding execution and broadcast authorization must remain false/
      },
      {
        field: "broadcastAuthorized",
        value: true,
        expected:
          /signer capability binding execution and broadcast authorization must remain false/
      }
    ];

    for (const {
      field,
      value,
      expected
    } of cases) {
      const original =
        makeSigningEvidence();

      const evidence = {
        ...original,
        signerCapabilityBindingEvidence: {
          ...original.signerCapabilityBindingEvidence,
          [field]: value
        }
      };

      await assert.rejects(
        validateFinalSignedTransactionCurrentStateEvidence({
          transactionSigningEvidence: evidence,
          provider: makeProvider()
        }),
        expected
      );
    }
  }
);
