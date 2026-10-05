"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  buildUnsignedExactTransactionIntentEvidence
} = require(
  "../scripts/utils/polygonV4UnsignedExactTransactionIntentEvidence"
);

const OWNER =
  "0x1111111111111111111111111111111111111111";

const EXECUTOR =
  "0x2222222222222222222222222222222222222222";

const TOKEN =
  "0x3333333333333333333333333333333333333333";

function fixture() {
  const amountIn =
    ethers.BigNumber.from("125000000000000000");

  const candidate =
    Object.freeze({
      amountIn
    });

  const executionLegs =
    Object.freeze([
      Object.freeze({
        tokenIn: TOKEN,
        tokenOut:
          "0x4444444444444444444444444444444444444444"
      }),
      Object.freeze({
        tokenIn:
          "0x4444444444444444444444444444444444444444",
        tokenOut:
          "0x5555555555555555555555555555555555555555"
      }),
      Object.freeze({
        tokenIn:
          "0x5555555555555555555555555555555555555555",
        tokenOut: TOKEN
      })
    ]);

  const executionPlan = "0x1234";

  const accountIdentityEvidence =
    Object.freeze({
      callerAddress: OWNER,
      ownerAddress: OWNER,
      executorAddress: EXECUTOR
    });

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
      candidate,
      executionLegs,
      executionPlan,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
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

  return {
    amountIn,
    candidate,
    executionLegs,
    executionPlan,
    accountIdentityEvidence,
    currentStatePreflightEvidence,
    accountCallerIdentityEvidence
  };
}

test(
  "builds exact unsigned transaction intent from preserved 1S.28 evidence",
  () => {
    const f = fixture();

    const result =
      buildUnsignedExactTransactionIntentEvidence({
        accountCallerIdentityEvidence:
          f.accountCallerIdentityEvidence
      });

    const iface =
      new ethers.utils.Interface([
        "function initiateFlashloan(address token,uint256 amount,bytes params)"
      ]);

    const expectedData =
      iface.encodeFunctionData(
        "initiateFlashloan",
        [
          TOKEN,
          f.amountIn,
          f.executionPlan
        ]
      );

    assert.strictEqual(
      result.accountCallerIdentityEvidence,
      f.accountCallerIdentityEvidence
    );

    assert.strictEqual(
      result.candidate,
      f.candidate
    );

    assert.strictEqual(
      result.executionLegs,
      f.executionLegs
    );

    assert.strictEqual(
      result.executionPlan,
      f.executionPlan
    );

    assert.equal(
      result.flashloanToken,
      TOKEN
    );

    assert.strictEqual(
      result.flashloanAmount,
      f.amountIn
    );

    assert.equal(
      result.transactionIntent.from,
      OWNER
    );

    assert.equal(
      result.transactionIntent.to,
      EXECUTOR
    );

    assert.equal(
      result.transactionIntent.data,
      expectedData
    );

    assert.ok(
      ethers.BigNumber.isBigNumber(
        result.transactionIntent.value
      )
    );

    assert.ok(
      result.transactionIntent.value.eq(0)
    );

    assert.equal(
      result.unsignedTransactionIntentReady,
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
  }
);

test(
  "uses exact preserved plan bytes without rebuilding route evidence",
  () => {
    const f = fixture();

    const result =
      buildUnsignedExactTransactionIntentEvidence({
        accountCallerIdentityEvidence:
          f.accountCallerIdentityEvidence
      });

    const iface =
      new ethers.utils.Interface([
        "function initiateFlashloan(address token,uint256 amount,bytes params)"
      ]);

    const decoded =
      iface.decodeFunctionData(
        "initiateFlashloan",
        result.transactionIntent.data
      );

    assert.equal(
      decoded.token,
      TOKEN
    );

    assert.ok(
      decoded.amount.eq(
        f.candidate.amountIn
      )
    );

    assert.equal(
      decoded.params,
      f.executionPlan
    );
  }
);

test(
  "rejects upstream evidence unless 1S.28 is ready",
  () => {
    const f = fixture();

    const malformed = {
      ...f.accountCallerIdentityEvidence,
      accountCallerIdentityReady: false
    };

    assert.throws(
      () =>
        buildUnsignedExactTransactionIntentEvidence({
          accountCallerIdentityEvidence:
            malformed
        }),
      /ready/i
    );
  }
);

for (const field of [
  "liveExecutionAuthorized",
  "signerAuthorized",
  "broadcastAuthorized"
]) {
  test(
    `rejects upstream ${field}=true`,
    () => {
      const f = fixture();

      const malformed = {
        ...f.accountCallerIdentityEvidence,
        [field]: true
      };

      assert.throws(
        () =>
          buildUnsignedExactTransactionIntentEvidence({
            accountCallerIdentityEvidence:
              malformed
          }),
        /authoriz/i
      );
    }
  );

  test(
    `rejects upstream ${field} unless explicitly false`,
    () => {
      const f = fixture();

      const malformed = {
        ...f.accountCallerIdentityEvidence
      };

      delete malformed[field];

      assert.throws(
        () =>
          buildUnsignedExactTransactionIntentEvidence({
            accountCallerIdentityEvidence:
              malformed
          }),
        /authoriz/i
      );
    }
  );
}

test(
  "rejects reconstructed candidate identity",
  () => {
    const f = fixture();

    const malformed = {
      ...f.accountCallerIdentityEvidence,
      candidate: {
        ...f.candidate
      }
    };

    assert.throws(
      () =>
        buildUnsignedExactTransactionIntentEvidence({
          accountCallerIdentityEvidence:
            malformed
        }),
      /candidate.*identity/i
    );
  }
);

test(
  "rejects reconstructed execution-leg identity",
  () => {
    const f = fixture();

    const malformed = {
      ...f.accountCallerIdentityEvidence,
      executionLegs:
        [...f.executionLegs]
    };

    assert.throws(
      () =>
        buildUnsignedExactTransactionIntentEvidence({
          accountCallerIdentityEvidence:
            malformed
        }),
      /execution.*legs.*identity/i
    );
  }
);

test(
  "rejects execution-plan identity mismatch",
  () => {
    const f = fixture();

    const malformed = {
      ...f.accountCallerIdentityEvidence,
      executionPlan: "0xabcd"
    };

    assert.throws(
      () =>
        buildUnsignedExactTransactionIntentEvidence({
          accountCallerIdentityEvidence:
            malformed
        }),
      /execution.*plan.*identity/i
    );
  }
);

test(
  "rejects invalid or zero flashloan token",
  () => {
    for (const token of [
      "not-an-address",
      ethers.constants.AddressZero
    ]) {
      const f = fixture();

      const legs = [
        {
          ...f.executionLegs[0],
          tokenIn: token
        },
        f.executionLegs[1],
        {
          ...f.executionLegs[2],
          tokenOut: token
        }
      ];

      const preflight = {
        ...f.currentStatePreflightEvidence,
        executionLegs: legs
      };

      const malformed = {
        ...f.accountCallerIdentityEvidence,
        currentStatePreflightEvidence:
          preflight,
        executionLegs: legs
      };

      assert.throws(
        () =>
          buildUnsignedExactTransactionIntentEvidence({
            accountCallerIdentityEvidence:
              malformed
          }),
        /token/i
      );
    }
  }
);

test(
  "rejects nonpositive flashloan amount",
  () => {
    const f = fixture();

    const candidate = {
      amountIn: ethers.constants.Zero
    };

    const preflight = {
      ...f.currentStatePreflightEvidence,
      candidate
    };

    const malformed = {
      ...f.accountCallerIdentityEvidence,
      currentStatePreflightEvidence:
        preflight,
      candidate
    };

    assert.throws(
      () =>
        buildUnsignedExactTransactionIntentEvidence({
          accountCallerIdentityEvidence:
            malformed
        }),
      /amount/i
    );
  }
);

test(
  "rejects non-hex or empty execution plan",
  () => {
    for (const executionPlan of [
      "0x",
      "not-hex"
    ]) {
      const f = fixture();

      const preflight = {
        ...f.currentStatePreflightEvidence,
        executionPlan
      };

      const malformed = {
        ...f.accountCallerIdentityEvidence,
        currentStatePreflightEvidence:
          preflight,
        executionPlan
      };

      assert.throws(
        () =>
          buildUnsignedExactTransactionIntentEvidence({
            accountCallerIdentityEvidence:
              malformed
          }),
        /execution.*plan/i
      );
    }
  }
);

test(
  "rejects non-contiguous or non-closing preserved route",
  () => {
    const f = fixture();

    const legs = [
      f.executionLegs[0],
      {
        ...f.executionLegs[1],
        tokenIn:
          "0x6666666666666666666666666666666666666666"
      },
      f.executionLegs[2]
    ];

    const preflight = {
      ...f.currentStatePreflightEvidence,
      executionLegs: legs
    };

    const malformed = {
      ...f.accountCallerIdentityEvidence,
      currentStatePreflightEvidence:
        preflight,
      executionLegs: legs
    };

    assert.throws(
      () =>
        buildUnsignedExactTransactionIntentEvidence({
          accountCallerIdentityEvidence:
            malformed
        }),
      /route/i
    );
  }
);

test(
  "rejects caller-owner identity mismatch",
  () => {
    const f = fixture();

    const malformedAccount = {
      ...f.accountIdentityEvidence,
      ownerAddress:
        "0x7777777777777777777777777777777777777777"
    };

    const malformed = {
      ...f.accountCallerIdentityEvidence,
      accountIdentityEvidence:
        malformedAccount
    };

    assert.throws(
      () =>
        buildUnsignedExactTransactionIntentEvidence({
          accountCallerIdentityEvidence:
            malformed
        }),
      /caller.*owner/i
    );
  }
);

test(
  "rejects missing deployment executor evidence",
  () => {
    const f = fixture();

    const preflight = {
      ...f.currentStatePreflightEvidence
    };

    delete preflight.currentStateEvidence;

    const malformed = {
      ...f.accountCallerIdentityEvidence,
      currentStatePreflightEvidence:
        preflight
    };

    assert.throws(
      () =>
        buildUnsignedExactTransactionIntentEvidence({
          accountCallerIdentityEvidence:
            malformed
        }),
      /current-state|deployment|executor/i
    );
  }
);

test(
  "rejects executor identity mismatch",
  () => {
    const f = fixture();

    const malformedAccount = {
      ...f.accountIdentityEvidence,
      executorAddress:
        "0x8888888888888888888888888888888888888888"
    };

    const malformed = {
      ...f.accountCallerIdentityEvidence,
      accountIdentityEvidence:
        malformedAccount
    };

    assert.throws(
      () =>
        buildUnsignedExactTransactionIntentEvidence({
          accountCallerIdentityEvidence:
            malformed
        }),
      /executor/i
    );
  }
);

test(
  "does not expose nonce fee gas-limit signer signing sending or broadcast fields",
  () => {
    const f = fixture();

    const result =
      buildUnsignedExactTransactionIntentEvidence({
        accountCallerIdentityEvidence:
          f.accountCallerIdentityEvidence
      });

    for (const field of [
      "nonce",
      "gasLimit",
      "gasPrice",
      "maxFeePerGas",
      "maxPriorityFeePerGas",
      "signer",
      "signature",
      "hash",
      "receipt"
    ]) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(
          result.transactionIntent,
          field
        ),
        false
      );
    }
  }
);

test(
  "source contains no provider signer wallet send or broadcast capability",
  () => {
    const fs = require("node:fs");
    const path = require("node:path");

    const source =
      fs.readFileSync(
        path.join(
          __dirname,
          "../scripts/utils/polygonV4UnsignedExactTransactionIntentEvidence.js"
        ),
        "utf8"
      );

    for (const forbidden of [
      "JsonRpcProvider",
      "getSigner(",
      "new ethers.Wallet",
      ".sendTransaction(",
      ".sendRawTransaction(",
      ".wait(",
      "PRIVATE_KEY"
    ]) {
      assert.equal(
        source.includes(forbidden),
        false,
        `forbidden capability: ${forbidden}`
      );
    }
  }
);
