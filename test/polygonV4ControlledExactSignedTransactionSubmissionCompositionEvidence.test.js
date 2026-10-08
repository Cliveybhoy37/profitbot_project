"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const SUBJECT_PATH =
  "../scripts/utils/polygonV4ControlledExactSignedTransactionSubmissionCompositionEvidence";

function loadSubject() {
  return require(SUBJECT_PATH);
}

function makeFixture() {
  const transactionEnvelope =
    Object.freeze({
      chainId: 137,
      type: 2,
      nonce: 17,
      from:
        "0x1111111111111111111111111111111111111111",
      to:
        "0x2222222222222222222222222222222222222222",
      data: "0x1234",
      value: 0,
      gasLimit: 500000,
      maxFeePerGas: 100,
      maxPriorityFeePerGas: 10
    });

  const signedRawTransaction = "0x1234";
  const signedTransactionHash = "0x5678";

  const immediatePreSubmissionValidationEvidence =
    Object.freeze({
      transactionEnvelope,
      signedRawTransaction,
      signedTransactionHash,
      immediatePreSubmissionValidationReady: true,
      signerAuthorized: true,
      signingAuthorized: true,
      broadcastAuthorized: true,
      liveExecutionAuthorized: true
    });

  const immediatePreSubmissionValidationCompositionEvidence =
    Object.freeze({
      immediatePreSubmissionValidationEvidence,
      immediatePreSubmissionValidationCompositionReady:
        true
    });

  return {
    transactionEnvelope,
    signedRawTransaction,
    signedTransactionHash,
    immediatePreSubmissionValidationEvidence,
    immediatePreSubmissionValidationCompositionEvidence
  };
}

test(
  "1S.75 bridges immediate pre-submission validation composition into controlled exact signed transaction submission",
  async () => {
    const {
      buildControlledExactSignedTransactionSubmissionCompositionEvidence
    } = loadSubject();

    const fixture = makeFixture();

    const submitted = [];

    const submitSignedTransaction =
      async (signedRawTransaction) => {
        submitted.push(signedRawTransaction);

        return Object.freeze({
          hash: fixture.signedTransactionHash
        });
      };

    const result =
      await buildControlledExactSignedTransactionSubmissionCompositionEvidence({
        immediatePreSubmissionValidationCompositionEvidence:
          fixture
            .immediatePreSubmissionValidationCompositionEvidence,
        submitSignedTransaction
      });

    assert.deepEqual(
      submitted,
      [fixture.signedRawTransaction]
    );

    assert.equal(
      result
        .immediatePreSubmissionValidationCompositionEvidence,
      fixture
        .immediatePreSubmissionValidationCompositionEvidence
    );

    assert.equal(
      result
        .controlledExactSignedTransactionSubmissionEvidence
        .immediatePreSubmissionValidationEvidence,
      fixture
        .immediatePreSubmissionValidationEvidence
    );

    assert.equal(
      result
        .controlledExactSignedTransactionSubmissionEvidence
        .transactionEnvelope,
      fixture.transactionEnvelope
    );

    assert.equal(
      result
        .controlledExactSignedTransactionSubmissionEvidence
        .signedRawTransaction,
      fixture.signedRawTransaction
    );

    assert.equal(
      result
        .controlledExactSignedTransactionSubmissionEvidence
        .signedTransactionHash,
      fixture.signedTransactionHash
    );

    assert.equal(
      result
        .controlledExactSignedTransactionSubmissionEvidence
        .submissionResponse.hash,
      fixture.signedTransactionHash
    );

    assert.equal(
      result
        .controlledExactSignedTransactionSubmissionEvidence
        .controlledExactSignedTransactionSubmissionReady,
      true
    );

    assert.equal(
      result
        .controlledExactSignedTransactionSubmissionCompositionReady,
      true
    );

    assert.equal(
      Object.isFrozen(result),
      true
    );
  }
);

test(
  "1S.75 requires immediate pre-submission validation composition evidence object",
  async () => {
    const {
      buildControlledExactSignedTransactionSubmissionCompositionEvidence
    } = loadSubject();

    await assert.rejects(
      () =>
        buildControlledExactSignedTransactionSubmissionCompositionEvidence({
          immediatePreSubmissionValidationCompositionEvidence:
            null,
          submitSignedTransaction:
            async () => ({
              hash: "0x5678"
            })
        }),
      /Immediate pre-submission validation composition evidence must be an object/
    );
  }
);

test(
  "1S.75 requires immediate pre-submission validation composition readiness",
  async () => {
    const {
      buildControlledExactSignedTransactionSubmissionCompositionEvidence
    } = loadSubject();

    const fixture = makeFixture();

    await assert.rejects(
      () =>
        buildControlledExactSignedTransactionSubmissionCompositionEvidence({
          immediatePreSubmissionValidationCompositionEvidence:
            Object.freeze({
              immediatePreSubmissionValidationEvidence:
                fixture.immediatePreSubmissionValidationEvidence,
              immediatePreSubmissionValidationCompositionReady:
                false
            }),
          submitSignedTransaction:
            async () => ({
              hash: fixture.signedTransactionHash
            })
        }),
      /Immediate pre-submission validation composition evidence is not ready/
    );
  }
);

test(
  "1S.75 requires contained immediate pre-submission validation evidence object",
  async () => {
    const {
      buildControlledExactSignedTransactionSubmissionCompositionEvidence
    } = loadSubject();

    const fixture = makeFixture();

    await assert.rejects(
      () =>
        buildControlledExactSignedTransactionSubmissionCompositionEvidence({
          immediatePreSubmissionValidationCompositionEvidence:
            Object.freeze({
              immediatePreSubmissionValidationEvidence:
                null,
              immediatePreSubmissionValidationCompositionReady:
                true
            }),
          submitSignedTransaction:
            async () => ({
              hash: fixture.signedTransactionHash
            })
        }),
      /Immediate pre-submission validation evidence must be an object/
    );
  }
);

test(
  "1S.75 requires contained immediate pre-submission validation readiness",
  async () => {
    const {
      buildControlledExactSignedTransactionSubmissionCompositionEvidence
    } = loadSubject();

    const fixture = makeFixture();

    await assert.rejects(
      () =>
        buildControlledExactSignedTransactionSubmissionCompositionEvidence({
          immediatePreSubmissionValidationCompositionEvidence:
            Object.freeze({
              immediatePreSubmissionValidationEvidence:
                Object.freeze({
                  ...fixture.immediatePreSubmissionValidationEvidence,
                  immediatePreSubmissionValidationReady:
                    false
                }),
              immediatePreSubmissionValidationCompositionReady:
                true
            }),
          submitSignedTransaction:
            async () => ({
              hash: fixture.signedTransactionHash
            })
        }),
      /Immediate pre-submission validation evidence is not ready/
    );
  }
);

test(
  "1S.75 propagates submission hash mismatch without producing submission composition evidence",
  async () => {
    const {
      buildControlledExactSignedTransactionSubmissionCompositionEvidence
    } = loadSubject();

    const fixture = makeFixture();
    let invocationCount = 0;

    await assert.rejects(
      () =>
        buildControlledExactSignedTransactionSubmissionCompositionEvidence({
          immediatePreSubmissionValidationCompositionEvidence:
            fixture
              .immediatePreSubmissionValidationCompositionEvidence,
          submitSignedTransaction:
            async (signedRawTransaction) => {
              invocationCount += 1;

              assert.equal(
                signedRawTransaction,
                fixture.signedRawTransaction
              );

              return {
                hash: "0xdeadbeef"
              };
            }
        }),
      /submission response hash must match signedTransactionHash/
    );

    assert.equal(invocationCount, 1);
  }
);

test(
  "1S.75 propagates submission callback failure after exactly one invocation",
  async () => {
    const {
      buildControlledExactSignedTransactionSubmissionCompositionEvidence
    } = loadSubject();

    const fixture = makeFixture();
    let invocationCount = 0;

    await assert.rejects(
      () =>
        buildControlledExactSignedTransactionSubmissionCompositionEvidence({
          immediatePreSubmissionValidationCompositionEvidence:
            fixture
              .immediatePreSubmissionValidationCompositionEvidence,
          submitSignedTransaction:
            async (signedRawTransaction) => {
              invocationCount += 1;

              assert.equal(
                signedRawTransaction,
                fixture.signedRawTransaction
              );

              throw new Error(
                "synthetic submission failure"
              );
            }
        }),
      /synthetic submission failure/
    );

    assert.equal(invocationCount, 1);
  }
);
