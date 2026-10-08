"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildAccountCallerIdentityCompositionEvidence
} = require(
  "../scripts/utils/" +
  "polygonV4AccountCallerIdentityCompositionEvidence"
);

const OWNER =
  "0x2222222222222222222222222222222222222222";

const EXECUTOR =
  "0x1111111111111111111111111111111111111111";

function fixture() {
  const deploymentEvidence =
    Object.freeze({
      executorAddress: EXECUTOR
    });

  const currentStateEvidence =
    Object.freeze({
      deploymentEvidence
    });

  const candidate = Object.freeze({});
  const executionLegs = Object.freeze([]);
  const executionPlan = "0x1234";
  const gasEvidence = Object.freeze({});
  const qualificationPolicySnapshot =
    Object.freeze({});
  const qualifiedContext = Object.freeze({});

  const currentStatePreflightEvidence =
    Object.freeze({
      currentStateEvidence,
      candidate,
      executionLegs,
      executionPlan,
      gasEvidence,
      qualificationPolicySnapshot,
      qualifiedContext,
      currentStatePreflightReady: true,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

  const accountIdentityEvidence =
    Object.freeze({
      callerAddress: OWNER,
      ownerAddress: OWNER,
      executorAddress: EXECUTOR
    });

  const deployedAccountIdentityAcquisitionEvidence =
    Object.freeze({
      currentStatePreflightEvidence,
      accountIdentityEvidence,
      deployedAccountIdentityAcquisitionReady:
        true,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

  const deployedAccountIdentityAcquisitionCompositionEvidence =
    Object.freeze({
      deployedAccountIdentityAcquisitionEvidence,
      deployedAccountIdentityAcquisitionCompositionReady:
        true
    });

  return {
    currentStatePreflightEvidence,
    accountIdentityEvidence,
    deployedAccountIdentityAcquisitionEvidence,
    deployedAccountIdentityAcquisitionCompositionEvidence
  };
}

test(
  "bridges exact deployed-account acquisition into account/caller validation",
  () => {
    const f = fixture();

    const result =
      buildAccountCallerIdentityCompositionEvidence({
        deployedAccountIdentityAcquisitionCompositionEvidence:
          f.deployedAccountIdentityAcquisitionCompositionEvidence
      });

    assert.equal(
      result
        .deployedAccountIdentityAcquisitionCompositionEvidence,
      f.deployedAccountIdentityAcquisitionCompositionEvidence
    );

    assert.equal(
      result.accountCallerIdentityEvidence
        .currentStatePreflightEvidence,
      f.currentStatePreflightEvidence
    );

    assert.equal(
      result.accountCallerIdentityEvidence
        .accountIdentityEvidence,
      f.accountIdentityEvidence
    );

    assert.equal(
      result.accountCallerIdentityEvidence
        .accountCallerIdentityReady,
      true
    );

    assert.equal(
      result.accountCallerIdentityCompositionReady,
      true
    );

    assert.equal(
      Object.isFrozen(result),
      true
    );
  }
);

test(
  "requires deployed-account acquisition composition evidence object",
  () => {
    assert.throws(
      () =>
        buildAccountCallerIdentityCompositionEvidence({
          deployedAccountIdentityAcquisitionCompositionEvidence:
            null
        }),
      /Deployed-account identity acquisition composition evidence must be an object/
    );
  }
);

test(
  "requires completed deployed-account acquisition composition provenance",
  () => {
    const f = fixture();

    assert.throws(
      () =>
        buildAccountCallerIdentityCompositionEvidence({
          deployedAccountIdentityAcquisitionCompositionEvidence:
            {
              ...f.deployedAccountIdentityAcquisitionCompositionEvidence,
              deployedAccountIdentityAcquisitionCompositionReady:
                false
            }
        }),
      /Deployed-account identity acquisition composition evidence is not ready/
    );
  }
);

test(
  "requires completed deployed-account acquisition evidence",
  () => {
    const f = fixture();

    assert.throws(
      () =>
        buildAccountCallerIdentityCompositionEvidence({
          deployedAccountIdentityAcquisitionCompositionEvidence:
            {
              ...f.deployedAccountIdentityAcquisitionCompositionEvidence,
              deployedAccountIdentityAcquisitionEvidence:
                {
                  ...f.deployedAccountIdentityAcquisitionEvidence,
                  deployedAccountIdentityAcquisitionReady:
                    false
                }
            }
        }),
      /Deployed-account identity acquisition evidence is not ready/
    );
  }
);

test(
  "propagates caller-owner identity rejection from established validator",
  () => {
    const f = fixture();

    const mismatchedAccountIdentityEvidence =
      Object.freeze({
        ...f.accountIdentityEvidence,
        callerAddress:
          "0x3333333333333333333333333333333333333333"
      });

    assert.throws(
      () =>
        buildAccountCallerIdentityCompositionEvidence({
          deployedAccountIdentityAcquisitionCompositionEvidence:
            {
              ...f.deployedAccountIdentityAcquisitionCompositionEvidence,
              deployedAccountIdentityAcquisitionEvidence:
                {
                  ...f.deployedAccountIdentityAcquisitionEvidence,
                  accountIdentityEvidence:
                    mismatchedAccountIdentityEvidence
                }
            }
        }),
      /Caller identity does not match deployed ProfitBot owner/
    );
  }
);

test(
  "propagates executor identity rejection from established validator",
  () => {
    const f = fixture();

    const mismatchedAccountIdentityEvidence =
      Object.freeze({
        ...f.accountIdentityEvidence,
        executorAddress:
          "0x4444444444444444444444444444444444444444"
      });

    assert.throws(
      () =>
        buildAccountCallerIdentityCompositionEvidence({
          deployedAccountIdentityAcquisitionCompositionEvidence:
            {
              ...f.deployedAccountIdentityAcquisitionCompositionEvidence,
              deployedAccountIdentityAcquisitionEvidence:
                {
                  ...f.deployedAccountIdentityAcquisitionEvidence,
                  accountIdentityEvidence:
                    mismatchedAccountIdentityEvidence
                }
            }
        }),
      /Account executor deployment identity mismatch/
    );
  }
);

test(
  "does not advance execution authorization",
  () => {
    const f = fixture();

    const result =
      buildAccountCallerIdentityCompositionEvidence({
        deployedAccountIdentityAcquisitionCompositionEvidence:
          f.deployedAccountIdentityAcquisitionCompositionEvidence
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
        result.accountCallerIdentityEvidence[field],
        false
      );
    }
  }
);
