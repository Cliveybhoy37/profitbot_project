"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildProspectiveSignerIdentityAcquisitionCompositionEvidence
} = require(
  "../scripts/utils/" +
  "polygonV4ProspectiveSignerIdentityAcquisitionCompositionEvidence"
);

function fixture() {
  const signerAddress =
    "0x1B786608D3F073e44910bB975413f97A11Dd7bcA";

  const transactionEnvelope =
    Object.freeze({
      from: signerAddress
    });

  const currentTransactionPreSendSimulationEvidence =
    Object.freeze({
      transactionEnvelope,
      currentTransactionPreSendSimulationReady:
        true,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

  const currentTransactionPreSendSimulationAcquisitionCompositionEvidence =
    Object.freeze({
      currentTransactionPreSendSimulationEvidence,
      currentTransactionPreSendSimulationAcquisitionCompositionReady:
        true
    });

  return {
    signerAddress,
    transactionEnvelope,
    currentTransactionPreSendSimulationEvidence,
    currentTransactionPreSendSimulationAcquisitionCompositionEvidence
  };
}

test(
  "bridges exact pre-send simulation composition into prospective signer identity acquisition",
  async () => {
    const f = fixture();
    let calls = 0;

    const result =
      await buildProspectiveSignerIdentityAcquisitionCompositionEvidence({
        currentTransactionPreSendSimulationAcquisitionCompositionEvidence:
          f.currentTransactionPreSendSimulationAcquisitionCompositionEvidence,

        getSignerAddress:
          async () => {
            calls += 1;
            return f.signerAddress;
          }
      });

    assert.equal(calls, 1);

    assert.strictEqual(
      result
        .currentTransactionPreSendSimulationAcquisitionCompositionEvidence,
      f.currentTransactionPreSendSimulationAcquisitionCompositionEvidence
    );

    assert.strictEqual(
      result.prospectiveSignerIdentityEvidence
        .currentTransactionPreSendSimulationEvidence,
      f.currentTransactionPreSendSimulationEvidence
    );

    assert.strictEqual(
      result.prospectiveSignerIdentityEvidence
        .transactionEnvelope,
      f.transactionEnvelope
    );

    assert.equal(
      result.prospectiveSignerIdentityEvidence
        .signerAddress,
      f.signerAddress
    );

    assert.equal(
      result
        .prospectiveSignerIdentityAcquisitionCompositionReady,
      true
    );

    assert.equal(
      result.prospectiveSignerIdentityEvidence
        .liveExecutionAuthorized,
      false
    );

    assert.equal(
      result.prospectiveSignerIdentityEvidence
        .signerAuthorized,
      false
    );

    assert.equal(
      result.prospectiveSignerIdentityEvidence
        .broadcastAuthorized,
      false
    );

    assert.equal(
      Object.isFrozen(result),
      true
    );
  }
);

test(
  "requires pre-send simulation acquisition composition evidence to be an object",
  async () => {
    await assert.rejects(
      buildProspectiveSignerIdentityAcquisitionCompositionEvidence({
        currentTransactionPreSendSimulationAcquisitionCompositionEvidence:
          null,
        getSignerAddress:
          async () => {
            throw new Error("must not be called");
          }
      }),
      /composition evidence.*object/i
    );
  }
);

test(
  "requires pre-send simulation acquisition composition evidence to be ready",
  async () => {
    const f = fixture();

    const invalid =
      Object.freeze({
        ...f.currentTransactionPreSendSimulationAcquisitionCompositionEvidence,
        currentTransactionPreSendSimulationAcquisitionCompositionReady:
          false
      });

    let calls = 0;

    await assert.rejects(
      buildProspectiveSignerIdentityAcquisitionCompositionEvidence({
        currentTransactionPreSendSimulationAcquisitionCompositionEvidence:
          invalid,
        getSignerAddress:
          async () => {
            calls += 1;
            return f.signerAddress;
          }
      }),
      /composition evidence.*not ready/i
    );

    assert.equal(calls, 0);
  }
);

test(
  "requires contained pre-send simulation evidence to be an object",
  async () => {
    const f = fixture();

    const invalid =
      Object.freeze({
        ...f.currentTransactionPreSendSimulationAcquisitionCompositionEvidence,
        currentTransactionPreSendSimulationEvidence:
          null
      });

    await assert.rejects(
      buildProspectiveSignerIdentityAcquisitionCompositionEvidence({
        currentTransactionPreSendSimulationAcquisitionCompositionEvidence:
          invalid,
        getSignerAddress:
          async () => f.signerAddress
      }),
      /pre-send simulation evidence.*object/i
    );
  }
);

test(
  "requires contained pre-send simulation evidence to be ready",
  async () => {
    const f = fixture();

    const invalidSimulation =
      Object.freeze({
        ...f.currentTransactionPreSendSimulationEvidence,
        currentTransactionPreSendSimulationReady:
          false
      });

    const invalidComposition =
      Object.freeze({
        ...f.currentTransactionPreSendSimulationAcquisitionCompositionEvidence,
        currentTransactionPreSendSimulationEvidence:
          invalidSimulation
      });

    let calls = 0;

    await assert.rejects(
      buildProspectiveSignerIdentityAcquisitionCompositionEvidence({
        currentTransactionPreSendSimulationAcquisitionCompositionEvidence:
          invalidComposition,
        getSignerAddress:
          async () => {
            calls += 1;
            return f.signerAddress;
          }
      }),
      /pre-send simulation evidence.*not ready/i
    );

    assert.equal(calls, 0);
  }
);

test(
  "propagates signer address mismatch after exactly one acquisition",
  async () => {
    const f = fixture();
    let calls = 0;

    await assert.rejects(
      buildProspectiveSignerIdentityAcquisitionCompositionEvidence({
        currentTransactionPreSendSimulationAcquisitionCompositionEvidence:
          f.currentTransactionPreSendSimulationAcquisitionCompositionEvidence,

        getSignerAddress:
          async () => {
            calls += 1;
            return "0x0000000000000000000000000000000000000001";
          }
      }),
      /signer|address|from|match/i
    );

    assert.equal(calls, 1);
  }
);

test(
  "does not advance authorization",
  async () => {
    const f = fixture();

    const result =
      await buildProspectiveSignerIdentityAcquisitionCompositionEvidence({
        currentTransactionPreSendSimulationAcquisitionCompositionEvidence:
          f.currentTransactionPreSendSimulationAcquisitionCompositionEvidence,

        getSignerAddress:
          async () => f.signerAddress
      });

    const evidence =
      result.prospectiveSignerIdentityEvidence;

    assert.equal(
      evidence.liveExecutionAuthorized,
      false
    );
    assert.equal(
      evidence.signerAuthorized,
      false
    );
    assert.equal(
      evidence.broadcastAuthorized,
      false
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        result,
        "signerAuthorized"
      ),
      false
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        result,
        "liveExecutionAuthorized"
      ),
      false
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        result,
        "broadcastAuthorized"
      ),
      false
    );
  }
);
