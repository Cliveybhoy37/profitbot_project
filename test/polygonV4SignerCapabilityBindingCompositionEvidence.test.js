"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

function loadSubject() {
  return require(
    "../scripts/utils/" +
    "polygonV4SignerCapabilityBindingCompositionEvidence"
  );
}

const SIGNER =
  "0x1B786608D3F073e44910bB975413f97A11Dd7bcA";

function make1S68Composition() {
  const transactionEnvelope = Object.freeze({
    from: SIGNER,
    to: "0x1111111111111111111111111111111111111111",
    data: "0x1234",
    value: "0",
    chainId: 137,
    nonce: 7,
    maxFeePerGas: "100",
    maxPriorityFeePerGas: "30",
    gasLimit: "500000"
  });

  const signingAuthorizationEvidence = Object.freeze({
    signerAuthorizationEvidence: Object.freeze({}),
    transactionEnvelope,
    signerAddress: SIGNER,
    signingAuthorizationReady: true,
    signerAuthorized: true,
    signingAuthorized: true,
    liveExecutionAuthorized: false,
    broadcastAuthorized: false
  });

  return Object.freeze({
    signerAuthorizationCompositionEvidence:
      Object.freeze({}),
    signingAuthorizationEvidence,
    signingAuthorizationCompositionReady: true
  });
}

test(
  "1S.69 bridges exact signing authorization composition into signer capability binding without signing",
  async () => {
    const {
      buildSignerCapabilityBindingCompositionEvidence
    } = loadSubject();

    const composition = make1S68Composition();
    let calls = 0;

    const getSignerCapabilityAddress = async (
      ...args
    ) => {
      calls += 1;
      assert.deepEqual(args, []);
      return SIGNER;
    };

    const result =
      await buildSignerCapabilityBindingCompositionEvidence({
        signingAuthorizationCompositionEvidence:
          composition,
        getSignerCapabilityAddress
      });

    assert.equal(calls, 1);

    assert.equal(
      result.signingAuthorizationCompositionEvidence,
      composition
    );

    assert.equal(
      result.signerCapabilityBindingEvidence
        .signingAuthorizationEvidence,
      composition.signingAuthorizationEvidence
    );

    assert.equal(
      result.signerCapabilityBindingEvidence
        .transactionEnvelope,
      composition.signingAuthorizationEvidence
        .transactionEnvelope
    );

    assert.equal(
      result.signerCapabilityBindingEvidence
        .signerAddress,
      SIGNER
    );

    assert.equal(
      result.signerCapabilityBindingEvidence
        .signerCapabilityAddress,
      SIGNER
    );

    assert.equal(
      result.signerCapabilityBindingEvidence
        .signerCapabilityBindingReady,
      true
    );

    assert.equal(
      result.signerCapabilityBindingEvidence
        .signerAuthorized,
      true
    );

    assert.equal(
      result.signerCapabilityBindingEvidence
        .signingAuthorized,
      true
    );

    assert.equal(
      result.signerCapabilityBindingEvidence
        .liveExecutionAuthorized,
      false
    );

    assert.equal(
      result.signerCapabilityBindingEvidence
        .broadcastAuthorized,
      false
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        result,
        "transactionSigningReady"
      ),
      false
    );

    assert.equal(
      result.signerCapabilityBindingCompositionReady,
      true
    );

    assert.equal(Object.isFrozen(result), true);
  }
);

test(
  "1S.69 requires signing authorization composition evidence object",
  async () => {
    const {
      buildSignerCapabilityBindingCompositionEvidence
    } = loadSubject();

    await assert.rejects(
      () =>
        buildSignerCapabilityBindingCompositionEvidence({
          signingAuthorizationCompositionEvidence: null,
          getSignerCapabilityAddress: async () =>
            SIGNER
        }),
      /Signing authorization composition evidence must be an object/
    );
  }
);

test(
  "1S.69 requires signing authorization composition readiness",
  async () => {
    const {
      buildSignerCapabilityBindingCompositionEvidence
    } = loadSubject();

    const composition = {
      ...make1S68Composition(),
      signingAuthorizationCompositionReady: false
    };

    await assert.rejects(
      () =>
        buildSignerCapabilityBindingCompositionEvidence({
          signingAuthorizationCompositionEvidence:
            composition,
          getSignerCapabilityAddress: async () =>
            SIGNER
        }),
      /Signing authorization composition evidence is not ready/
    );
  }
);

test(
  "1S.69 requires contained signing authorization evidence object",
  async () => {
    const {
      buildSignerCapabilityBindingCompositionEvidence
    } = loadSubject();

    const composition = {
      ...make1S68Composition(),
      signingAuthorizationEvidence: null
    };

    await assert.rejects(
      () =>
        buildSignerCapabilityBindingCompositionEvidence({
          signingAuthorizationCompositionEvidence:
            composition,
          getSignerCapabilityAddress: async () =>
            SIGNER
        }),
      /Signing authorization evidence must be an object/
    );
  }
);

test(
  "1S.69 requires contained signing authorization evidence readiness",
  async () => {
    const {
      buildSignerCapabilityBindingCompositionEvidence
    } = loadSubject();

    const base = make1S68Composition();

    const composition = {
      ...base,
      signingAuthorizationEvidence: {
        ...base.signingAuthorizationEvidence,
        signingAuthorizationReady: false
      }
    };

    await assert.rejects(
      () =>
        buildSignerCapabilityBindingCompositionEvidence({
          signingAuthorizationCompositionEvidence:
            composition,
          getSignerCapabilityAddress: async () =>
            SIGNER
        }),
      /Signing authorization evidence is not ready/
    );
  }
);

test(
  "1S.69 propagates signer capability identity mismatch after exactly one acquisition",
  async () => {
    const {
      buildSignerCapabilityBindingCompositionEvidence
    } = loadSubject();

    const composition = make1S68Composition();
    let calls = 0;

    await assert.rejects(
      () =>
        buildSignerCapabilityBindingCompositionEvidence({
          signingAuthorizationCompositionEvidence:
            composition,
          getSignerCapabilityAddress: async () => {
            calls += 1;
            return "0x2222222222222222222222222222222222222222";
          }
        }),
      /signer capability address does not match authorized signer address/i
    );

    assert.equal(calls, 1);
  }
);

test(
  "1S.69 rejects upstream capability-binding contamination before capability acquisition",
  async () => {
    const {
      buildSignerCapabilityBindingCompositionEvidence
    } = loadSubject();

    const base = make1S68Composition();

    const composition = {
      ...base,
      signingAuthorizationEvidence: {
        ...base.signingAuthorizationEvidence,
        signerCapabilityBindingReady: true
      }
    };

    let calls = 0;

    await assert.rejects(
      () =>
        buildSignerCapabilityBindingCompositionEvidence({
          signingAuthorizationCompositionEvidence:
            composition,
          getSignerCapabilityAddress: async () => {
            calls += 1;
            return SIGNER;
          }
        }),
      /signer capability binding readiness field/i
    );

    assert.equal(calls, 0);
  }
);
