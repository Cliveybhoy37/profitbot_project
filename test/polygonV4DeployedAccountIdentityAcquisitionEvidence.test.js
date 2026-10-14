"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const EXECUTOR =
  "0x1111111111111111111111111111111111111111";
const CALLER =
  "0x2222222222222222222222222222222222222222";
const OWNER =
  "0x3333333333333333333333333333333333333333";

function loadSubject() {
  return require(
    "../scripts/utils/" +
      "polygonV4DeployedAccountIdentityAcquisitionEvidence"
  );
}

function fixture() {
  const deploymentEvidence = Object.freeze({
    executorAddress: EXECUTOR
  });

  const currentStateEvidence = Object.freeze({
    deploymentEvidence
  });

  const currentStatePreflightEvidence = Object.freeze({
    currentStateEvidence,
    currentStatePreflightReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  });

  return {
    currentStatePreflightEvidence
  };
}

test(
  "acquires caller and deployed executor owner without asserting their equality",
  async () => {
    const {
      acquireDeployedAccountIdentityEvidence
    } = loadSubject();

    const f = fixture();

    let callerCalls = 0;
    let ownerCalls = 0;
    let observedExecutorAddress;

    const result =
      await acquireDeployedAccountIdentityEvidence({
        currentStatePreflightEvidence:
          f.currentStatePreflightEvidence,

        getCallerAddress: async () => {
          callerCalls += 1;
          return CALLER;
        },

        getExecutorOwner: async (
          executorAddress
        ) => {
          ownerCalls += 1;
          observedExecutorAddress =
            executorAddress;
          return OWNER;
        }
      });

    assert.equal(callerCalls, 1);
    assert.equal(ownerCalls, 1);

    assert.equal(
      observedExecutorAddress,
      EXECUTOR
    );

    assert.strictEqual(
      result.currentStatePreflightEvidence,
      f.currentStatePreflightEvidence
    );

    assert.deepEqual(
      result.accountIdentityEvidence,
      {
        callerAddress: CALLER,
        ownerAddress: OWNER,
        executorAddress: EXECUTOR
      }
    );

    assert.equal(
      result.deployedAccountIdentityAcquisitionReady,
      true
    );

    assert.equal(
      result.liveExecutionAuthorized,
      false
    );
    assert.equal(
      result.signerAuthorized,
      false
    );
    assert.equal(
      result.broadcastAuthorized,
      false
    );

    assert.equal(
      Object.isFrozen(
        result.accountIdentityEvidence
      ),
      true
    );
    assert.equal(
      Object.isFrozen(result),
      true
    );
  }
);


test(
  "fails before acquisition when current-state preflight is not ready",
  async () => {
    const {
      acquireDeployedAccountIdentityEvidence
    } = loadSubject();

    const f = fixture();

    const invalidPreflight = Object.freeze({
      ...f.currentStatePreflightEvidence,
      currentStatePreflightReady: false
    });

    let callerCalls = 0;
    let ownerCalls = 0;

    await assert.rejects(
      () =>
        acquireDeployedAccountIdentityEvidence({
          currentStatePreflightEvidence:
            invalidPreflight,

          getCallerAddress: async () => {
            callerCalls += 1;
            return CALLER;
          },

          getExecutorOwner: async () => {
            ownerCalls += 1;
            return OWNER;
          }
        }),
      /must be ready/
    );

    assert.equal(callerCalls, 0);
    assert.equal(ownerCalls, 0);
  }
);


test(
  "fails before acquisition when any upstream authorization is true",
  async () => {
    const {
      acquireDeployedAccountIdentityEvidence
    } = loadSubject();

    const f = fixture();

    for (const flag of [
      "liveExecutionAuthorized",
      "signerAuthorized",
      "broadcastAuthorized"
    ]) {
      const invalidPreflight =
        Object.freeze({
          ...f.currentStatePreflightEvidence,
          [flag]: true
        });

      let callerCalls = 0;
      let ownerCalls = 0;

      await assert.rejects(
        () =>
          acquireDeployedAccountIdentityEvidence({
            currentStatePreflightEvidence:
              invalidPreflight,

            getCallerAddress: async () => {
              callerCalls += 1;
              return CALLER;
            },

            getExecutorOwner: async () => {
              ownerCalls += 1;
              return OWNER;
            }
          }),
        /authorization must remain false/
      );

      assert.equal(
        callerCalls,
        0,
        `${flag} must block caller acquisition`
      );

      assert.equal(
        ownerCalls,
        0,
        `${flag} must block owner acquisition`
      );
    }
  }
);


test(
  "rejects invalid deployed executor before either acquisition callback",
  async () => {
    const {
      acquireDeployedAccountIdentityEvidence
    } = loadSubject();

    const f = fixture();

    const invalidPreflight = Object.freeze({
      ...f.currentStatePreflightEvidence,
      currentStateEvidence: Object.freeze({
        ...f.currentStatePreflightEvidence
          .currentStateEvidence,
        deploymentEvidence: Object.freeze({
          executorAddress:
            "0x0000000000000000000000000000000000000000"
        })
      })
    });

    let callerCalls = 0;
    let ownerCalls = 0;

    await assert.rejects(
      () =>
        acquireDeployedAccountIdentityEvidence({
          currentStatePreflightEvidence:
            invalidPreflight,

          getCallerAddress: async () => {
            callerCalls += 1;
            return CALLER;
          },

          getExecutorOwner: async () => {
            ownerCalls += 1;
            return OWNER;
          }
        }),
      /Deployed executor address must be a valid nonzero address/
    );

    assert.equal(callerCalls, 0);
    assert.equal(ownerCalls, 0);
  }
);

test(
  "rejects invalid acquired caller before executor owner acquisition",
  async () => {
    const {
      acquireDeployedAccountIdentityEvidence
    } = loadSubject();

    const f = fixture();

    let callerCalls = 0;
    let ownerCalls = 0;

    await assert.rejects(
      () =>
        acquireDeployedAccountIdentityEvidence({
          currentStatePreflightEvidence:
            f.currentStatePreflightEvidence,

          getCallerAddress: async () => {
            callerCalls += 1;
            return ethers.constants.AddressZero;
          },

          getExecutorOwner: async () => {
            ownerCalls += 1;
            return OWNER;
          }
        }),
      /Caller address must be a valid nonzero address/
    );

    assert.equal(callerCalls, 1);
    assert.equal(ownerCalls, 0);
  }
);


test(
  "rejects invalid acquired executor owner after exactly one owner lookup",
  async () => {
    const {
      acquireDeployedAccountIdentityEvidence
    } = loadSubject();

    const f = fixture();

    let callerCalls = 0;
    let ownerCalls = 0;
    let observedExecutorAddress;

    await assert.rejects(
      () =>
        acquireDeployedAccountIdentityEvidence({
          currentStatePreflightEvidence:
            f.currentStatePreflightEvidence,

          getCallerAddress: async () => {
            callerCalls += 1;
            return CALLER;
          },

          getExecutorOwner: async (
            executorAddress
          ) => {
            ownerCalls += 1;
            observedExecutorAddress =
              executorAddress;

            return ethers.constants.AddressZero;
          }
        }),
      /Executor owner address must be a valid nonzero address/
    );

    assert.equal(callerCalls, 1);
    assert.equal(ownerCalls, 1);

    assert.equal(
      observedExecutorAddress,
      EXECUTOR
    );
  }
);


test(
  "composes acquired account identity into existing caller identity validation",
  async () => {
    const {
      acquireDeployedAccountIdentityEvidence
    } = loadSubject();

    const {
      buildAccountCallerIdentityEvidence
    } = require(
      "../scripts/utils/" +
        "polygonV4AccountCallerIdentityEvidence"
    );

    const f = fixture();

    const acquired =
      await acquireDeployedAccountIdentityEvidence({
        currentStatePreflightEvidence:
          f.currentStatePreflightEvidence,

        getCallerAddress: async () => OWNER,

        getExecutorOwner: async (
          executorAddress
        ) => {
          assert.equal(
            executorAddress,
            EXECUTOR
          );

          return OWNER;
        }
      });

    const validated =
      buildAccountCallerIdentityEvidence({
        currentStatePreflightEvidence:
          f.currentStatePreflightEvidence,

        accountIdentityEvidence:
          acquired.accountIdentityEvidence
      });

    assert.strictEqual(
      validated.currentStatePreflightEvidence,
      f.currentStatePreflightEvidence
    );

    assert.strictEqual(
      validated.accountIdentityEvidence,
      acquired.accountIdentityEvidence
    );

    assert.equal(
      validated.accountCallerIdentityReady,
      true
    );

    assert.equal(
      validated.liveExecutionAuthorized,
      false
    );
    assert.equal(
      validated.signerAuthorized,
      false
    );
    assert.equal(
      validated.broadcastAuthorized,
      false
    );
  }
);


test(
  "leaves caller-owner mismatch rejection to existing caller identity validation",
  async () => {
    const {
      acquireDeployedAccountIdentityEvidence
    } = loadSubject();

    const {
      buildAccountCallerIdentityEvidence
    } = require(
      "../scripts/utils/" +
        "polygonV4AccountCallerIdentityEvidence"
    );

    const f = fixture();

    const acquired =
      await acquireDeployedAccountIdentityEvidence({
        currentStatePreflightEvidence:
          f.currentStatePreflightEvidence,

        getCallerAddress: async () => CALLER,

        getExecutorOwner: async (
          executorAddress
        ) => {
          assert.equal(
            executorAddress,
            EXECUTOR
          );

          return OWNER;
        }
      });

    assert.notEqual(
      acquired.accountIdentityEvidence
        .callerAddress,
      acquired.accountIdentityEvidence
        .ownerAddress
    );

    assert.throws(
      () =>
        buildAccountCallerIdentityEvidence({
          currentStatePreflightEvidence:
            f.currentStatePreflightEvidence,

          accountIdentityEvidence:
            acquired.accountIdentityEvidence
        }),
      /Caller identity does not match deployed ProfitBot owner/
    );
  }
);
