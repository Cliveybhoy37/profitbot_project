"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { ethers } = require("ethers");

const {
  acquireExactTransactionSigningEvidence
} = require(
  "../scripts/utils/polygonV4ExactTransactionSigningEvidence"
);

function loadSubject() {
  return require(
    "../scripts/utils/" +
    "polygonV4FinalSignedTransactionCurrentStateValidationCompositionEvidence"
  );
}

async function make1S70Composition() {
  const wallet = ethers.Wallet.createRandom();

  const transactionEnvelope = Object.freeze({
    from: wallet.address,
    to: "0x1111111111111111111111111111111111111111",
    data: "0x1234",
    value: ethers.BigNumber.from(0),
    chainId: 137,
    nonce: 7,
    maxFeePerGas: ethers.BigNumber.from(100),
    maxPriorityFeePerGas:
      ethers.BigNumber.from(30),
    gasLimit: ethers.BigNumber.from(500000)
  });

  const signerCapabilityBindingEvidence =
    Object.freeze({
      transactionEnvelope,
      signerAddress: wallet.address,
      signerCapabilityAddress:
        wallet.address,
      signerCapabilityBindingReady: true,
      signerAuthorized: true,
      signingAuthorized: true,
      liveExecutionAuthorized: false,
      broadcastAuthorized: false
    });

  let signingCalls = 0;

  const exactTransactionSigningEvidence =
    await acquireExactTransactionSigningEvidence({
      signerCapabilityBindingEvidence,
      signTransaction: async tx => {
        signingCalls += 1;
        return wallet.signTransaction(tx);
      }
    });

  assert.equal(signingCalls, 1);

  return Object.freeze({
    exactTransactionSigningEvidence,
    exactTransactionSigningCompositionReady:
      true
  });
}

test(
  "1S.71 bridges exact transaction signing composition into final current-state validation without re-signing or authorization escalation",
  async () => {
    const {
      buildFinalSignedTransactionCurrentStateValidationCompositionEvidence
    } = loadSubject();

    const composition =
      await make1S70Composition();

    const signingEvidence =
      composition.exactTransactionSigningEvidence;

    const envelope =
      signingEvidence.transactionEnvelope;

    let networkCalls = 0;
    let nonceCalls = 0;
    let callCalls = 0;
    let receivedCallRequest;

    const provider = {
      getNetwork: async () => {
        networkCalls += 1;
        return { chainId: 137 };
      },

      getTransactionCount: async (
        address,
        blockTag
      ) => {
        nonceCalls += 1;
        assert.equal(address, envelope.from);
        assert.equal(blockTag, "pending");
        return envelope.nonce;
      },

      call: async request => {
        callCalls += 1;
        receivedCallRequest = request;
        return "0x";
      }
    };

    const result =
      await buildFinalSignedTransactionCurrentStateValidationCompositionEvidence({
        exactTransactionSigningCompositionEvidence:
          composition,
        provider
      });

    assert.equal(networkCalls, 1);
    assert.equal(nonceCalls, 1);
    assert.equal(callCalls, 1);

    assert.equal(
      result.exactTransactionSigningCompositionEvidence,
      composition
    );

    const finalEvidence =
      result.finalSignedTransactionCurrentStateEvidence;

    assert.equal(
      finalEvidence.transactionSigningEvidence,
      signingEvidence
    );

    assert.equal(
      finalEvidence.transactionEnvelope,
      envelope
    );

    assert.equal(
      finalEvidence.signedRawTransaction,
      signingEvidence.signedRawTransaction
    );

    assert.equal(
      finalEvidence.signedTransactionHash,
      signingEvidence.signedTransactionHash
    );

    assert.equal(
      finalEvidence.callRequest,
      receivedCallRequest
    );

    assert.equal(
      finalEvidence.finalSignedTransactionCurrentStateReady,
      true
    );

    assert.equal(
      finalEvidence.signerAuthorized,
      true
    );

    assert.equal(
      finalEvidence.signingAuthorized,
      true
    );

    assert.equal(
      finalEvidence.liveExecutionAuthorized,
      false
    );

    assert.equal(
      finalEvidence.broadcastAuthorized,
      false
    );

    assert.equal(
      result.finalSignedTransactionCurrentStateValidationCompositionReady,
      true
    );

    assert.equal(Object.isFrozen(result), true);
  }
);

test(
  "1S.71 requires exact transaction signing composition evidence object",
  async () => {
    const {
      buildFinalSignedTransactionCurrentStateValidationCompositionEvidence
    } = loadSubject();

    await assert.rejects(
      () =>
        buildFinalSignedTransactionCurrentStateValidationCompositionEvidence({
          exactTransactionSigningCompositionEvidence:
            null,
          provider: {}
        }),
      /Exact transaction signing composition evidence must be an object/
    );
  }
);

test(
  "1S.71 requires exact transaction signing composition readiness",
  async () => {
    const {
      buildFinalSignedTransactionCurrentStateValidationCompositionEvidence
    } = loadSubject();

    const base =
      await make1S70Composition();

    const composition = {
      ...base,
      exactTransactionSigningCompositionReady:
        false
    };

    await assert.rejects(
      () =>
        buildFinalSignedTransactionCurrentStateValidationCompositionEvidence({
          exactTransactionSigningCompositionEvidence:
            composition,
          provider: {}
        }),
      /Exact transaction signing composition evidence is not ready/
    );
  }
);

test(
  "1S.71 requires contained exact transaction signing evidence object",
  async () => {
    const {
      buildFinalSignedTransactionCurrentStateValidationCompositionEvidence
    } = loadSubject();

    const base =
      await make1S70Composition();

    const composition = {
      ...base,
      exactTransactionSigningEvidence: null
    };

    await assert.rejects(
      () =>
        buildFinalSignedTransactionCurrentStateValidationCompositionEvidence({
          exactTransactionSigningCompositionEvidence:
            composition,
          provider: {}
        }),
      /Exact transaction signing evidence must be an object/
    );
  }
);

test(
  "1S.71 requires contained exact transaction signing evidence readiness",
  async () => {
    const {
      buildFinalSignedTransactionCurrentStateValidationCompositionEvidence
    } = loadSubject();

    const base =
      await make1S70Composition();

    const composition = {
      ...base,
      exactTransactionSigningEvidence: {
        ...base.exactTransactionSigningEvidence,
        transactionSigningReady: false
      }
    };

    await assert.rejects(
      () =>
        buildFinalSignedTransactionCurrentStateValidationCompositionEvidence({
          exactTransactionSigningCompositionEvidence:
            composition,
          provider: {}
        }),
      /Exact transaction signing evidence is not ready/
    );
  }
);

test(
  "1S.71 delegates current chain validation and fails before nonce or final call on wrong chain",
  async () => {
    const {
      buildFinalSignedTransactionCurrentStateValidationCompositionEvidence
    } = loadSubject();

    const composition =
      await make1S70Composition();

    let networkCalls = 0;
    let nonceCalls = 0;
    let callCalls = 0;

    const provider = {
      getNetwork: async () => {
        networkCalls += 1;
        return { chainId: 1 };
      },

      getTransactionCount: async () => {
        nonceCalls += 1;
        return 7;
      },

      call: async () => {
        callCalls += 1;
        return "0x";
      }
    };

    await assert.rejects(
      () =>
        buildFinalSignedTransactionCurrentStateValidationCompositionEvidence({
          exactTransactionSigningCompositionEvidence:
            composition,
          provider
        }),
      /current Polygon chain ID 137 required/
    );

    assert.equal(networkCalls, 1);
    assert.equal(nonceCalls, 0);
    assert.equal(callCalls, 0);
  }
);

test(
  "1S.71 delegates pending nonce validation and fails before final call on nonce drift",
  async () => {
    const {
      buildFinalSignedTransactionCurrentStateValidationCompositionEvidence
    } = loadSubject();

    const composition =
      await make1S70Composition();

    const expectedNonce =
      composition.exactTransactionSigningEvidence
        .transactionEnvelope.nonce;

    let networkCalls = 0;
    let nonceCalls = 0;
    let callCalls = 0;

    const provider = {
      getNetwork: async () => {
        networkCalls += 1;
        return { chainId: 137 };
      },

      getTransactionCount: async () => {
        nonceCalls += 1;
        return expectedNonce + 1;
      },

      call: async () => {
        callCalls += 1;
        return "0x";
      }
    };

    await assert.rejects(
      () =>
        buildFinalSignedTransactionCurrentStateValidationCompositionEvidence({
          exactTransactionSigningCompositionEvidence:
            composition,
          provider
        }),
      /current pending nonce does not match signed transaction nonce/
    );

    assert.equal(networkCalls, 1);
    assert.equal(nonceCalls, 1);
    assert.equal(callCalls, 0);
  }
);
