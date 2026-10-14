"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

function loadSubject() {
  return require(
    "../scripts/utils/" +
    "polygonV4SigningAuthorizationCompositionEvidence"
  );
}

const SIGNER =
  "0x1B786608D3F073e44910bB975413f97A11Dd7bcA";

function make1S67Composition() {
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

  const signerAuthorizationEvidence = Object.freeze({
    prospectiveSignerIdentityEvidence: Object.freeze({
      prospectiveSignerIdentityReady: true
    }),
    transactionEnvelope,
    signerAddress: SIGNER,
    signerAuthorizationReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: true,
    broadcastAuthorized: false
  });

  return Object.freeze({
    prospectiveSignerIdentityAcquisitionCompositionEvidence:
      Object.freeze({}),
    signerAuthorizationEvidence,
    signerAuthorizationCompositionReady: true
  });
}

test(
  "1S.68 bridges exact signer authorization composition into signing authorization without signing",
  async () => {
    const {
      buildSigningAuthorizationCompositionEvidence
    } = loadSubject();

    const composition = make1S67Composition();
    let calls = 0;

    const authorizeTransactionSigning = async ({
      signerAddress,
      transactionEnvelope
    }) => {
      calls += 1;

      assert.equal(signerAddress, SIGNER);
      assert.equal(
        transactionEnvelope,
        composition.signerAuthorizationEvidence
          .transactionEnvelope
      );

      return true;
    };

    const result =
      await buildSigningAuthorizationCompositionEvidence({
        signerAuthorizationCompositionEvidence:
          composition,
        authorizeTransactionSigning
      });

    assert.equal(calls, 1);

    assert.equal(
      result.signerAuthorizationCompositionEvidence,
      composition
    );

    assert.equal(
      result.signingAuthorizationEvidence
        .signerAuthorizationEvidence,
      composition.signerAuthorizationEvidence
    );

    assert.equal(
      result.signingAuthorizationEvidence
        .transactionEnvelope,
      composition.signerAuthorizationEvidence
        .transactionEnvelope
    );

    assert.equal(
      result.signingAuthorizationEvidence
        .signingAuthorizationReady,
      true
    );

    assert.equal(
      result.signingAuthorizationEvidence
        .signerAuthorized,
      true
    );

    assert.equal(
      result.signingAuthorizationEvidence
        .signingAuthorized,
      true
    );

    assert.equal(
      result.signingAuthorizationEvidence
        .liveExecutionAuthorized,
      false
    );

    assert.equal(
      result.signingAuthorizationEvidence
        .broadcastAuthorized,
      false
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        result,
        "signerCapabilityBindingReady"
      ),
      false
    );

    assert.equal(
      result.signingAuthorizationCompositionReady,
      true
    );

    assert.equal(Object.isFrozen(result), true);
  }
);


test(
  "1S.68 requires signer authorization composition evidence to be an object",
  async () => {
    const {
      buildSigningAuthorizationCompositionEvidence
    } = loadSubject();

    for (const invalid of [undefined, null, [], "bad"]) {
      await assert.rejects(
        buildSigningAuthorizationCompositionEvidence({
          signerAuthorizationCompositionEvidence: invalid,
          authorizeTransactionSigning: async () => true
        }),
        /composition evidence.*object/i
      );
    }
  }
);

test(
  "1S.68 requires signer authorization composition evidence to be ready",
  async () => {
    const {
      buildSigningAuthorizationCompositionEvidence
    } = loadSubject();

    await assert.rejects(
      buildSigningAuthorizationCompositionEvidence({
        signerAuthorizationCompositionEvidence: {
          signerAuthorizationCompositionReady: false
        },
        authorizeTransactionSigning: async () => true
      }),
      /composition evidence.*not ready/i
    );
  }
);

test(
  "1S.68 requires contained signer authorization evidence to be an object",
  async () => {
    const {
      buildSigningAuthorizationCompositionEvidence
    } = loadSubject();

    await assert.rejects(
      buildSigningAuthorizationCompositionEvidence({
        signerAuthorizationCompositionEvidence: {
          signerAuthorizationCompositionReady: true,
          signerAuthorizationEvidence: null
        },
        authorizeTransactionSigning: async () => true
      }),
      /signer authorization evidence.*object/i
    );
  }
);

test(
  "1S.68 requires contained signer authorization evidence to be ready",
  async () => {
    const {
      buildSigningAuthorizationCompositionEvidence
    } = loadSubject();

    const composition = make1S67Composition();

    await assert.rejects(
      buildSigningAuthorizationCompositionEvidence({
        signerAuthorizationCompositionEvidence: {
          ...composition,
          signerAuthorizationEvidence: {
            ...composition.signerAuthorizationEvidence,
            signerAuthorizationReady: false
          }
        },
        authorizeTransactionSigning: async () => true
      }),
      /signer authorization evidence.*not ready/i
    );
  }
);

test(
  "1S.68 propagates explicit signing authorization denial after exactly one callback",
  async () => {
    const {
      buildSigningAuthorizationCompositionEvidence
    } = loadSubject();

    const composition = make1S67Composition();
    let calls = 0;

    await assert.rejects(
      buildSigningAuthorizationCompositionEvidence({
        signerAuthorizationCompositionEvidence:
          composition,
        authorizeTransactionSigning: async () => {
          calls += 1;
          return false;
        }
      }),
      /authorization.*true/i
    );

    assert.equal(calls, 1);
  }
);

test(
  "1S.68 rejects upstream signing authorization contamination before authorization callback",
  async () => {
    const {
      buildSigningAuthorizationCompositionEvidence
    } = loadSubject();

    const composition = make1S67Composition();
    let calls = 0;

    const contaminated = {
      ...composition,
      signerAuthorizationEvidence: {
        ...composition.signerAuthorizationEvidence,
        signingAuthorized: true
      }
    };

    await assert.rejects(
      buildSigningAuthorizationCompositionEvidence({
        signerAuthorizationCompositionEvidence:
          contaminated,
        authorizeTransactionSigning: async () => {
          calls += 1;
          return true;
        }
      }),
      /upstream|signing authorization/i
    );

    assert.equal(calls, 0);
  }
);
