"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  buildUnsignedExactTransactionIntentCompositionEvidence
} = require(
  "../scripts/utils/" +
  "polygonV4UnsignedExactTransactionIntentCompositionEvidence"
);

const TOKEN_A =
  "0x1111111111111111111111111111111111111111";

const TOKEN_B =
  "0x2222222222222222222222222222222222222222";

const TOKEN_C =
  "0x3333333333333333333333333333333333333333";

const EXECUTOR =
  "0x4444444444444444444444444444444444444444";

const OWNER =
  "0x5555555555555555555555555555555555555555";

function fixture() {
  const candidate =
    Object.freeze({
      amountIn: ethers.BigNumber.from("123")
    });

  const executionLegs =
    Object.freeze([
      Object.freeze({
        tokenIn: TOKEN_A,
        tokenOut: TOKEN_B
      }),
      Object.freeze({
        tokenIn: TOKEN_B,
        tokenOut: TOKEN_C
      }),
      Object.freeze({
        tokenIn: TOKEN_C,
        tokenOut: TOKEN_A
      })
    ]);

  const executionPlan = "0x1234";

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
      candidate,
      executionLegs,
      executionPlan,
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

  const accountCallerIdentityEvidence =
    Object.freeze({
      currentStatePreflightEvidence,
      accountIdentityEvidence,
      candidate,
      executionLegs,
      executionPlan,
      accountCallerIdentityReady: true,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

  const accountCallerIdentityCompositionEvidence =
    Object.freeze({
      accountCallerIdentityEvidence,
      accountCallerIdentityCompositionReady: true
    });

  return {
    accountCallerIdentityEvidence,
    accountCallerIdentityCompositionEvidence
  };
}

test(
  "bridges exact account/caller composition into unsigned transaction intent",
  () => {
    const f = fixture();

    const result =
      buildUnsignedExactTransactionIntentCompositionEvidence({
        accountCallerIdentityCompositionEvidence:
          f.accountCallerIdentityCompositionEvidence
      });

    assert.equal(
      result.accountCallerIdentityCompositionEvidence,
      f.accountCallerIdentityCompositionEvidence
    );

    assert.equal(
      result.unsignedTransactionIntentEvidence
        .accountCallerIdentityEvidence,
      f.accountCallerIdentityEvidence
    );

    assert.equal(
      result.unsignedTransactionIntentEvidence
        .unsignedTransactionIntentReady,
      true
    );

    assert.equal(
      result
        .unsignedExactTransactionIntentCompositionReady,
      true
    );

    assert.equal(
      Object.isFrozen(result),
      true
    );
  }
);

test(
  "requires account/caller identity composition evidence object",
  () => {
    assert.throws(
      () =>
        buildUnsignedExactTransactionIntentCompositionEvidence({
          accountCallerIdentityCompositionEvidence:
            null
        }),
      /Account\/caller identity composition evidence must be an object/
    );
  }
);

test(
  "requires completed account/caller composition provenance",
  () => {
    const f = fixture();

    assert.throws(
      () =>
        buildUnsignedExactTransactionIntentCompositionEvidence({
          accountCallerIdentityCompositionEvidence:
            {
              ...f.accountCallerIdentityCompositionEvidence,
              accountCallerIdentityCompositionReady:
                false
            }
        }),
      /Account\/caller identity composition evidence is not ready/
    );
  }
);

test(
  "requires completed account/caller identity evidence",
  () => {
    const f = fixture();

    assert.throws(
      () =>
        buildUnsignedExactTransactionIntentCompositionEvidence({
          accountCallerIdentityCompositionEvidence:
            {
              ...f.accountCallerIdentityCompositionEvidence,
              accountCallerIdentityEvidence:
                {
                  ...f.accountCallerIdentityEvidence,
                  accountCallerIdentityReady:
                    false
                }
            }
        }),
      /Account\/caller identity evidence is not ready/
    );
  }
);

test(
  "propagates preserved route rejection from established unsigned-intent builder",
  () => {
    const f = fixture();

    const invalidExecutionLegs =
      Object.freeze(
        f.accountCallerIdentityEvidence
          .executionLegs
          .slice(0, 2)
      );

    const invalidEvidence =
      Object.freeze({
        ...f.accountCallerIdentityEvidence,
        executionLegs: invalidExecutionLegs
      });

    assert.throws(
      () =>
        buildUnsignedExactTransactionIntentCompositionEvidence({
          accountCallerIdentityCompositionEvidence:
            {
              ...f.accountCallerIdentityCompositionEvidence,
              accountCallerIdentityEvidence:
                invalidEvidence
            }
        }),
      /Exactly three preserved execution legs required/
    );
  }
);

test(
  "propagates caller-owner rejection from established unsigned-intent builder",
  () => {
    const f = fixture();

    const invalidAccountIdentityEvidence =
      Object.freeze({
        ...f.accountCallerIdentityEvidence
          .accountIdentityEvidence,
        callerAddress:
          "0x6666666666666666666666666666666666666666"
      });

    const invalidEvidence =
      Object.freeze({
        ...f.accountCallerIdentityEvidence,
        accountIdentityEvidence:
          invalidAccountIdentityEvidence
      });

    assert.throws(
      () =>
        buildUnsignedExactTransactionIntentCompositionEvidence({
          accountCallerIdentityCompositionEvidence:
            {
              ...f.accountCallerIdentityCompositionEvidence,
              accountCallerIdentityEvidence:
                invalidEvidence
            }
        }),
      /Caller owner identity mismatch/
    );
  }
);

test(
  "does not advance execution authorization",
  () => {
    const f = fixture();

    const result =
      buildUnsignedExactTransactionIntentCompositionEvidence({
        accountCallerIdentityCompositionEvidence:
          f.accountCallerIdentityCompositionEvidence
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
        result.unsignedTransactionIntentEvidence[field],
        false
      );
    }
  }
);
