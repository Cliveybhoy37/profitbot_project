"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { ethers } = require("ethers");

function loadSubject() {
  return require(
    "../scripts/utils/" +
    "polygonV4ExactTransactionSigningCompositionEvidence"
  );
}

function make1S69Composition(wallet) {
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
      signingAuthorizationEvidence:
        Object.freeze({}),
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

  return Object.freeze({
    signingAuthorizationCompositionEvidence:
      Object.freeze({}),
    signerCapabilityBindingEvidence,
    signerCapabilityBindingCompositionReady:
      true
  });
}

test(
  "1S.70 bridges exact signer capability binding composition into exact transaction signing without execution or broadcast",
  async () => {
    const {
      buildExactTransactionSigningCompositionEvidence
    } = loadSubject();

    const wallet = ethers.Wallet.createRandom();
    const composition =
      make1S69Composition(wallet);

    let calls = 0;
    let received;

    const signTransaction = async tx => {
      calls += 1;
      received = tx;
      return wallet.signTransaction(tx);
    };

    const result =
      await buildExactTransactionSigningCompositionEvidence({
        signerCapabilityBindingCompositionEvidence:
          composition,
        signTransaction
      });

    assert.equal(calls, 1);

    assert.equal(
      result.signerCapabilityBindingCompositionEvidence,
      composition
    );

    const signingEvidence =
      result.exactTransactionSigningEvidence;

    assert.equal(
      signingEvidence.signerCapabilityBindingEvidence,
      composition.signerCapabilityBindingEvidence
    );

    assert.equal(
      signingEvidence.transactionEnvelope,
      composition.signerCapabilityBindingEvidence
        .transactionEnvelope
    );

    assert.equal(
      signingEvidence.signableTransaction,
      received
    );

    assert.equal(
      signingEvidence.transactionSigningReady,
      true
    );

    assert.equal(
      typeof signingEvidence.signedRawTransaction,
      "string"
    );

    assert.equal(
      ethers.utils.isHexString(
        signingEvidence.signedRawTransaction
      ),
      true
    );

    assert.equal(
      signingEvidence.signedTransactionHash,
      ethers.utils.keccak256(
        signingEvidence.signedRawTransaction
      )
    );

    assert.equal(
      signingEvidence.liveExecutionAuthorized,
      false
    );

    assert.equal(
      signingEvidence.broadcastAuthorized,
      false
    );

    assert.equal(
      result.exactTransactionSigningCompositionReady,
      true
    );

    assert.equal(Object.isFrozen(result), true);
  }
);

test(
  "1S.70 requires signer capability binding composition evidence object",
  async () => {
    const {
      buildExactTransactionSigningCompositionEvidence
    } = loadSubject();

    await assert.rejects(
      () =>
        buildExactTransactionSigningCompositionEvidence({
          signerCapabilityBindingCompositionEvidence:
            null,
          signTransaction: async () => "0x01"
        }),
      /Signer capability binding composition evidence must be an object/
    );
  }
);

test(
  "1S.70 requires signer capability binding composition readiness",
  async () => {
    const {
      buildExactTransactionSigningCompositionEvidence
    } = loadSubject();

    const wallet = ethers.Wallet.createRandom();
    const composition = {
      ...make1S69Composition(wallet),
      signerCapabilityBindingCompositionReady:
        false
    };

    await assert.rejects(
      () =>
        buildExactTransactionSigningCompositionEvidence({
          signerCapabilityBindingCompositionEvidence:
            composition,
          signTransaction:
            tx => wallet.signTransaction(tx)
        }),
      /Signer capability binding composition evidence is not ready/
    );
  }
);

test(
  "1S.70 requires contained signer capability binding evidence object",
  async () => {
    const {
      buildExactTransactionSigningCompositionEvidence
    } = loadSubject();

    const wallet = ethers.Wallet.createRandom();
    const composition = {
      ...make1S69Composition(wallet),
      signerCapabilityBindingEvidence: null
    };

    await assert.rejects(
      () =>
        buildExactTransactionSigningCompositionEvidence({
          signerCapabilityBindingCompositionEvidence:
            composition,
          signTransaction:
            tx => wallet.signTransaction(tx)
        }),
      /Signer capability binding evidence must be an object/
    );
  }
);

test(
  "1S.70 requires contained signer capability binding evidence readiness",
  async () => {
    const {
      buildExactTransactionSigningCompositionEvidence
    } = loadSubject();

    const wallet = ethers.Wallet.createRandom();
    const base = make1S69Composition(wallet);

    const composition = {
      ...base,
      signerCapabilityBindingEvidence: {
        ...base.signerCapabilityBindingEvidence,
        signerCapabilityBindingReady: false
      }
    };

    await assert.rejects(
      () =>
        buildExactTransactionSigningCompositionEvidence({
          signerCapabilityBindingCompositionEvidence:
            composition,
          signTransaction:
            tx => wallet.signTransaction(tx)
        }),
      /Signer capability binding evidence is not ready/
    );
  }
);

test(
  "1S.70 propagates signing rejection after exactly one signing callback",
  async () => {
    const {
      buildExactTransactionSigningCompositionEvidence
    } = loadSubject();

    const wallet = ethers.Wallet.createRandom();
    const composition =
      make1S69Composition(wallet);

    const expected =
      new Error("synthetic signing rejection");

    let calls = 0;

    await assert.rejects(
      () =>
        buildExactTransactionSigningCompositionEvidence({
          signerCapabilityBindingCompositionEvidence:
            composition,
          signTransaction: async () => {
            calls += 1;
            throw expected;
          }
        }),
      error => error === expected
    );

    assert.equal(calls, 1);
  }
);

test(
  "1S.70 rejects upstream signing-evidence contamination before signing callback",
  async () => {
    const {
      buildExactTransactionSigningCompositionEvidence
    } = loadSubject();

    const wallet = ethers.Wallet.createRandom();
    const base = make1S69Composition(wallet);

    const composition = {
      ...base,
      signerCapabilityBindingEvidence: {
        ...base.signerCapabilityBindingEvidence,
        transactionSigningReady: true
      }
    };

    let calls = 0;

    await assert.rejects(
      () =>
        buildExactTransactionSigningCompositionEvidence({
          signerCapabilityBindingCompositionEvidence:
            composition,
          signTransaction: async tx => {
            calls += 1;
            return wallet.signTransaction(tx);
          }
        }),
      /transactionSigningReady/
    );

    assert.equal(calls, 0);
  }
);
