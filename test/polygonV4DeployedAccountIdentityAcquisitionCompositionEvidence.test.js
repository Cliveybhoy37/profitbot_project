"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildDeployedAccountIdentityAcquisitionCompositionEvidence
} = require(
  "../scripts/utils/" +
  "polygonV4DeployedAccountIdentityAcquisitionCompositionEvidence"
);

const CALLER =
  "0x2222222222222222222222222222222222222222";

const OWNER =
  "0x3333333333333333333333333333333333333333";

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

  const currentStatePreflightEvidence =
    Object.freeze({
      currentStateEvidence,
      currentStatePreflightReady: true,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

  const currentStatePreflightCompositionEvidence =
    Object.freeze({
      currentStatePreflightEvidence,
      currentStatePreflightCompositionReady: true
    });

  return {
    currentStatePreflightEvidence,
    currentStatePreflightCompositionEvidence
  };
}

test(
  "bridges exact current-state preflight into deployed-account acquisition",
  async () => {
    const f = fixture();

    let callerCalls = 0;
    let ownerCalls = 0;
    let ownerExecutor;

    const result =
      await buildDeployedAccountIdentityAcquisitionCompositionEvidence({
        currentStatePreflightCompositionEvidence:
          f.currentStatePreflightCompositionEvidence,

        getCallerAddress: async () => {
          callerCalls += 1;
          return CALLER;
        },

        getExecutorOwner: async (
          executorAddress
        ) => {
          ownerCalls += 1;
          ownerExecutor = executorAddress;
          return OWNER;
        }
      });

    assert.equal(callerCalls, 1);
    assert.equal(ownerCalls, 1);
    assert.equal(ownerExecutor, EXECUTOR);

    assert.equal(
      result.currentStatePreflightCompositionEvidence,
      f.currentStatePreflightCompositionEvidence
    );

    assert.equal(
      result.deployedAccountIdentityAcquisitionEvidence
        .currentStatePreflightEvidence,
      f.currentStatePreflightEvidence
    );

    assert.deepEqual(
      result.deployedAccountIdentityAcquisitionEvidence
        .accountIdentityEvidence,
      {
        callerAddress: CALLER,
        ownerAddress: OWNER,
        executorAddress: EXECUTOR
      }
    );

    assert.equal(
      result.deployedAccountIdentityAcquisitionEvidence
        .deployedAccountIdentityAcquisitionReady,
      true
    );

    assert.equal(
      result
        .deployedAccountIdentityAcquisitionCompositionReady,
      true
    );

    assert.equal(
      Object.isFrozen(result),
      true
    );
  }
);

test(
  "requires current-state preflight composition evidence object",
  async () => {
    await assert.rejects(
      () =>
        buildDeployedAccountIdentityAcquisitionCompositionEvidence({
          currentStatePreflightCompositionEvidence:
            null
        }),
      /Current-state preflight composition evidence must be an object/
    );
  }
);

test(
  "requires completed current-state preflight composition provenance",
  async () => {
    const f = fixture();

    await assert.rejects(
      () =>
        buildDeployedAccountIdentityAcquisitionCompositionEvidence({
          currentStatePreflightCompositionEvidence:
            {
              ...f.currentStatePreflightCompositionEvidence,
              currentStatePreflightCompositionReady:
                false
            }
        }),
      /Current-state preflight composition evidence is not ready/
    );
  }
);

test(
  "requires composed current-state preflight evidence object",
  async () => {
    const f = fixture();

    await assert.rejects(
      () =>
        buildDeployedAccountIdentityAcquisitionCompositionEvidence({
          currentStatePreflightCompositionEvidence:
            {
              ...f.currentStatePreflightCompositionEvidence,
              currentStatePreflightEvidence:
                null
            }
        }),
      /Current-state preflight evidence must be an object/
    );
  }
);

test(
  "does not advance execution authorization",
  async () => {
    const f = fixture();

    const result =
      await buildDeployedAccountIdentityAcquisitionCompositionEvidence({
        currentStatePreflightCompositionEvidence:
          f.currentStatePreflightCompositionEvidence,

        getCallerAddress:
          async () => CALLER,

        getExecutorOwner:
          async () => OWNER
      });

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
        "signerAuthorized"
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

    const acquired =
      result
        .deployedAccountIdentityAcquisitionEvidence;

    assert.equal(
      acquired.liveExecutionAuthorized,
      false
    );
    assert.equal(
      acquired.signerAuthorized,
      false
    );
    assert.equal(
      acquired.broadcastAuthorized,
      false
    );
  }
);
