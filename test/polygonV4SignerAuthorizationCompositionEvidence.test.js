"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildSignerAuthorizationCompositionEvidence
} = require(
  "../scripts/utils/" +
  "polygonV4SignerAuthorizationCompositionEvidence"
);

function fixture() {
  const signerAddress =
    "0x1B786608D3F073e44910bB975413f97A11Dd7bcA";

  const transactionEnvelope =
    Object.freeze({
      from: signerAddress
    });

  const prospectiveSignerIdentityEvidence =
    Object.freeze({
      transactionEnvelope,
      signerAddress,
      prospectiveSignerIdentityReady: true,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

  const prospectiveSignerIdentityAcquisitionCompositionEvidence =
    Object.freeze({
      prospectiveSignerIdentityEvidence,
      prospectiveSignerIdentityAcquisitionCompositionReady:
        true
    });

  return {
    signerAddress,
    transactionEnvelope,
    prospectiveSignerIdentityEvidence,
    prospectiveSignerIdentityAcquisitionCompositionEvidence
  };
}

test(
  "bridges exact prospective signer identity composition into signer authorization",
  async () => {
    const f = fixture();
    let calls = 0;

    const result =
      await buildSignerAuthorizationCompositionEvidence({
        prospectiveSignerIdentityAcquisitionCompositionEvidence:
          f.prospectiveSignerIdentityAcquisitionCompositionEvidence,

        authorizeSignerIdentity:
          async ({
            signerAddress,
            transactionEnvelope
          }) => {
            calls += 1;

            assert.equal(
              signerAddress,
              f.signerAddress
            );

            assert.equal(
              transactionEnvelope,
              f.transactionEnvelope
            );

            return true;
          }
      });

    assert.equal(calls, 1);

    assert.equal(
      result
        .prospectiveSignerIdentityAcquisitionCompositionEvidence,
      f.prospectiveSignerIdentityAcquisitionCompositionEvidence
    );

    assert.equal(
      result.signerAuthorizationEvidence
        .prospectiveSignerIdentityEvidence,
      f.prospectiveSignerIdentityEvidence
    );

    assert.equal(
      result.signerAuthorizationEvidence
        .transactionEnvelope,
      f.transactionEnvelope
    );

    assert.equal(
      result.signerAuthorizationEvidence.signerAddress,
      f.signerAddress
    );

    assert.equal(
      result.signerAuthorizationEvidence
        .signerAuthorizationReady,
      true
    );

    assert.equal(
      result.signerAuthorizationEvidence.signerAuthorized,
      true
    );

    assert.equal(
      result.signerAuthorizationEvidence
        .liveExecutionAuthorized,
      false
    );

    assert.equal(
      result.signerAuthorizationEvidence
        .broadcastAuthorized,
      false
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        result.signerAuthorizationEvidence,
        "signingAuthorized"
      ),
      false
    );

    assert.equal(
      result.signerAuthorizationCompositionReady,
      true
    );

    assert.equal(
      Object.isFrozen(result),
      true
    );
  }
);

test(
  "requires prospective signer identity acquisition composition evidence to be an object",
  async () => {
    await assert.rejects(
      buildSignerAuthorizationCompositionEvidence({
        prospectiveSignerIdentityAcquisitionCompositionEvidence:
          null,
        authorizeSignerIdentity:
          async () => {
            throw new Error("must not be called");
          }
      }),
      /composition evidence.*object/i
    );
  }
);

test(
  "requires prospective signer identity acquisition composition evidence to be ready",
  async () => {
    const f = fixture();
    let calls = 0;

    const invalid =
      Object.freeze({
        ...f.prospectiveSignerIdentityAcquisitionCompositionEvidence,
        prospectiveSignerIdentityAcquisitionCompositionReady:
          false
      });

    await assert.rejects(
      buildSignerAuthorizationCompositionEvidence({
        prospectiveSignerIdentityAcquisitionCompositionEvidence:
          invalid,
        authorizeSignerIdentity:
          async () => {
            calls += 1;
            return true;
          }
      }),
      /composition evidence.*not ready/i
    );

    assert.equal(calls, 0);
  }
);

test(
  "requires contained prospective signer identity evidence to be an object",
  async () => {
    const f = fixture();

    const invalid =
      Object.freeze({
        ...f.prospectiveSignerIdentityAcquisitionCompositionEvidence,
        prospectiveSignerIdentityEvidence:
          null
      });

    await assert.rejects(
      buildSignerAuthorizationCompositionEvidence({
        prospectiveSignerIdentityAcquisitionCompositionEvidence:
          invalid,
        authorizeSignerIdentity:
          async () => true
      }),
      /prospective signer identity evidence.*object/i
    );
  }
);

test(
  "requires contained prospective signer identity evidence to be ready",
  async () => {
    const f = fixture();
    let calls = 0;

    const invalidEvidence =
      Object.freeze({
        ...f.prospectiveSignerIdentityEvidence,
        prospectiveSignerIdentityReady:
          false
      });

    const invalidComposition =
      Object.freeze({
        ...f.prospectiveSignerIdentityAcquisitionCompositionEvidence,
        prospectiveSignerIdentityEvidence:
          invalidEvidence
      });

    await assert.rejects(
      buildSignerAuthorizationCompositionEvidence({
        prospectiveSignerIdentityAcquisitionCompositionEvidence:
          invalidComposition,
        authorizeSignerIdentity:
          async () => {
            calls += 1;
            return true;
          }
      }),
      /prospective signer identity evidence.*not ready/i
    );

    assert.equal(calls, 0);
  }
);

test(
  "propagates explicit signer authorization denial after exactly one callback",
  async () => {
    const f = fixture();
    let calls = 0;

    await assert.rejects(
      buildSignerAuthorizationCompositionEvidence({
        prospectiveSignerIdentityAcquisitionCompositionEvidence:
          f.prospectiveSignerIdentityAcquisitionCompositionEvidence,

        authorizeSignerIdentity:
          async ({
            signerAddress,
            transactionEnvelope
          }) => {
            calls += 1;

            assert.equal(
              signerAddress,
              f.signerAddress
            );

            assert.equal(
              transactionEnvelope,
              f.transactionEnvelope
            );

            return false;
          }
      }),
      /authoriz|true/i
    );

    assert.equal(calls, 1);
  }
);

test(
  "rejects upstream authorization contamination before authorization callback",
  async () => {
    const f = fixture();
    let calls = 0;

    const contaminatedEvidence =
      Object.freeze({
        ...f.prospectiveSignerIdentityEvidence,
        signerAuthorized:
          true
      });

    const contaminatedComposition =
      Object.freeze({
        ...f.prospectiveSignerIdentityAcquisitionCompositionEvidence,
        prospectiveSignerIdentityEvidence:
          contaminatedEvidence
      });

    await assert.rejects(
      buildSignerAuthorizationCompositionEvidence({
        prospectiveSignerIdentityAcquisitionCompositionEvidence:
          contaminatedComposition,

        authorizeSignerIdentity:
          async () => {
            calls += 1;
            return true;
          }
      }),
      /authorization|false|signer/i
    );

    assert.equal(calls, 0);
  }
);
