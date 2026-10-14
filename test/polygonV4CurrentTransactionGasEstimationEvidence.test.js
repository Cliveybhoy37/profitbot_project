"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { ethers } = require("ethers");

const MODULE_PATH =
  "../scripts/utils/polygonV4CurrentTransactionGasEstimationEvidence";

const CALLER =
  "0x1111111111111111111111111111111111111111";

const EXECUTOR =
  "0x2222222222222222222222222222222222222222";

const TOKEN =
  "0x3333333333333333333333333333333333333333";

const DATA = "0x12345678";

function loadSubject() {
  return require(MODULE_PATH);
}

function makeUpstream() {
  const candidate = Object.freeze({
    amountIn:
      ethers.BigNumber.from(
        "125000000000000000"
      )
  });

  const executionLegs = Object.freeze([
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

  const currentStatePreflightEvidence =
    Object.freeze({
      candidate,
      executionLegs,
      executionPlan,

      currentStatePreflightReady: true,

      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

  const accountCallerIdentityEvidence =
    Object.freeze({
      currentStatePreflightEvidence,

      candidate,
      executionLegs,
      executionPlan,

      callerAddress: CALLER,
      ownerAddress: CALLER,
      executorAddress: EXECUTOR,

      accountCallerIdentityReady: true,

      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

  const transactionIntent = Object.freeze({
    from: CALLER,
    to: EXECUTOR,
    data: DATA,
    value: ethers.constants.Zero
  });

  const unsignedTransactionIntentEvidence =
    Object.freeze({
      accountCallerIdentityEvidence,

      candidate,
      executionLegs,
      executionPlan,

      flashloanToken: TOKEN,
      flashloanAmount: candidate.amountIn,

      transactionIntent,

      unsignedTransactionIntentReady: true,

      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

  return Object.freeze({
    unsignedTransactionIntentEvidence,

    transactionIntent,

    chainId: 137,
    nonce: 7,

    maxFeePerGas:
      ethers.utils.parseUnits("60", "gwei"),

    maxPriorityFeePerGas:
      ethers.utils.parseUnits("30", "gwei"),

    currentTransactionParametersReady: true,

    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  });
}

function makeProvider({
  estimatedGas =
    ethers.BigNumber.from("653000")
} = {}) {
  const calls = [];

  return {
    calls,

    async estimateGas(request) {
      calls.push([
        "estimateGas",
        request
      ]);

      return estimatedGas;
    }
  };
}

test(
  "acquires raw current gas estimate for the exact preserved transaction intent",
  async () => {
    const {
      acquireCurrentTransactionGasEstimationEvidence
    } = loadSubject();

    const upstream = makeUpstream();
    const provider = makeProvider();

    const result =
      await acquireCurrentTransactionGasEstimationEvidence({
        currentTransactionParameterEvidence:
          upstream,
        provider
      });

    assert.strictEqual(
      result.currentTransactionParameterEvidence,
      upstream
    );

    assert.strictEqual(
      result.transactionIntent,
      upstream.transactionIntent
    );

    assert.equal(
      result.estimatedGasUnits.toString(),
      "653000"
    );

    assert.equal(
      result.currentTransactionGasEstimationReady,
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
      provider.calls.length,
      1
    );

    assert.equal(
      provider.calls[0][0],
      "estimateGas"
    );

    assert.deepEqual(
      provider.calls[0][1],
      {
        from:
          upstream.transactionIntent.from,
        to:
          upstream.transactionIntent.to,
        data:
          upstream.transactionIntent.data,
        value:
          upstream.transactionIntent.value
      }
    );

    assert.equal(
      Object.isFrozen(result),
      true
    );
  }
);

test(
  "preserves the exact 1S.30 and 1S.29 evidence identities",
  async () => {
    const {
      acquireCurrentTransactionGasEstimationEvidence
    } = loadSubject();

    const upstream = makeUpstream();

    const result =
      await acquireCurrentTransactionGasEstimationEvidence({
        currentTransactionParameterEvidence:
          upstream,
        provider: makeProvider()
      });

    assert.strictEqual(
      result.currentTransactionParameterEvidence,
      upstream
    );

    assert.strictEqual(
      result.unsignedTransactionIntentEvidence,
      upstream.unsignedTransactionIntentEvidence
    );

    assert.strictEqual(
      result.transactionIntent,
      upstream.transactionIntent
    );
  }
);

test(
  "rejects missing 1S.30 evidence",
  async () => {
    const {
      acquireCurrentTransactionGasEstimationEvidence
    } = loadSubject();

    await assert.rejects(
      acquireCurrentTransactionGasEstimationEvidence({
        provider: makeProvider()
      }),
      /transaction.*parameter|evidence/i
    );
  }
);

test(
  "rejects 1S.30 evidence not ready",
  async () => {
    const {
      acquireCurrentTransactionGasEstimationEvidence
    } = loadSubject();

    const upstream = {
      ...makeUpstream(),
      currentTransactionParametersReady:
        false
    };

    await assert.rejects(
      acquireCurrentTransactionGasEstimationEvidence({
        currentTransactionParameterEvidence:
          upstream,
        provider: makeProvider()
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
    `rejects 1S.30 ${field} not exactly false`,
    async () => {
      const {
        acquireCurrentTransactionGasEstimationEvidence
      } = loadSubject();

      const upstream = {
        ...makeUpstream(),
        [field]: true
      };

      await assert.rejects(
        acquireCurrentTransactionGasEstimationEvidence({
          currentTransactionParameterEvidence:
            upstream,
          provider: makeProvider()
        }),
        /authorization|false/i
      );
    }
  );
}

test(
  "requires Polygon chain ID 137 from preserved 1S.30 evidence",
  async () => {
    const {
      acquireCurrentTransactionGasEstimationEvidence
    } = loadSubject();

    const upstream = {
      ...makeUpstream(),
      chainId: 1
    };

    await assert.rejects(
      acquireCurrentTransactionGasEstimationEvidence({
        currentTransactionParameterEvidence:
          upstream,
        provider: makeProvider()
      }),
      /chain|137|Polygon/i
    );
  }
);

test(
  "requires a non-negative safe pending nonce",
  async () => {
    const {
      acquireCurrentTransactionGasEstimationEvidence
    } = loadSubject();

    const upstream = {
      ...makeUpstream(),
      nonce: -1
    };

    await assert.rejects(
      acquireCurrentTransactionGasEstimationEvidence({
        currentTransactionParameterEvidence:
          upstream,
        provider: makeProvider()
      }),
      /nonce/i
    );
  }
);

test(
  "accepts nonce zero",
  async () => {
    const {
      acquireCurrentTransactionGasEstimationEvidence
    } = loadSubject();

    const upstream = Object.freeze({
      ...makeUpstream(),
      nonce: 0
    });

    const result =
      await acquireCurrentTransactionGasEstimationEvidence({
        currentTransactionParameterEvidence:
          upstream,
        provider: makeProvider()
      });

    assert.equal(
      result.currentTransactionGasEstimationReady,
      true
    );
  }
);

test(
  "requires positive maxFeePerGas evidence",
  async () => {
    const {
      acquireCurrentTransactionGasEstimationEvidence
    } = loadSubject();

    const upstream = {
      ...makeUpstream(),
      maxFeePerGas:
        ethers.constants.Zero
    };

    await assert.rejects(
      acquireCurrentTransactionGasEstimationEvidence({
        currentTransactionParameterEvidence:
          upstream,
        provider: makeProvider()
      }),
      /maxFeePerGas|fee/i
    );
  }
);

test(
  "requires positive maxPriorityFeePerGas evidence",
  async () => {
    const {
      acquireCurrentTransactionGasEstimationEvidence
    } = loadSubject();

    const upstream = {
      ...makeUpstream(),
      maxPriorityFeePerGas:
        ethers.constants.Zero
    };

    await assert.rejects(
      acquireCurrentTransactionGasEstimationEvidence({
        currentTransactionParameterEvidence:
          upstream,
        provider: makeProvider()
      }),
      /maxPriorityFeePerGas|priority|fee/i
    );
  }
);

test(
  "rejects maxFeePerGas below maxPriorityFeePerGas",
  async () => {
    const {
      acquireCurrentTransactionGasEstimationEvidence
    } = loadSubject();

    const upstream = {
      ...makeUpstream(),

      maxFeePerGas:
        ethers.utils.parseUnits(
          "20",
          "gwei"
        ),

      maxPriorityFeePerGas:
        ethers.utils.parseUnits(
          "30",
          "gwei"
        )
    };

    await assert.rejects(
      acquireCurrentTransactionGasEstimationEvidence({
        currentTransactionParameterEvidence:
          upstream,
        provider: makeProvider()
      }),
      /fee|priority/i
    );
  }
);

test(
  "rejects reconstructed 1S.29 transaction intent identity",
  async () => {
    const {
      acquireCurrentTransactionGasEstimationEvidence
    } = loadSubject();

    const original = makeUpstream();

    const upstream = Object.freeze({
      ...original,
      transactionIntent:
        Object.freeze({
          ...original.transactionIntent
        })
    });

    await assert.rejects(
      acquireCurrentTransactionGasEstimationEvidence({
        currentTransactionParameterEvidence:
          upstream,
        provider: makeProvider()
      }),
      /transaction.*intent|identity|preserved/i
    );
  }
);

test(
  "rejects transaction caller divergence from preserved account identity",
  async () => {
    const {
      acquireCurrentTransactionGasEstimationEvidence
    } = loadSubject();

    const original = makeUpstream();

    const changedIntent =
      Object.freeze({
        ...original.transactionIntent,
        from:
          "0x6666666666666666666666666666666666666666"
      });

    const changedUnsigned =
      Object.freeze({
        ...original
          .unsignedTransactionIntentEvidence,
        transactionIntent:
          changedIntent
      });

    const upstream =
      Object.freeze({
        ...original,
        unsignedTransactionIntentEvidence:
          changedUnsigned,
        transactionIntent:
          changedIntent
      });

    await assert.rejects(
      acquireCurrentTransactionGasEstimationEvidence({
        currentTransactionParameterEvidence:
          upstream,
        provider: makeProvider()
      }),
      /caller|from|identity/i
    );
  }
);

test(
  "rejects transaction target divergence from preserved executor identity",
  async () => {
    const {
      acquireCurrentTransactionGasEstimationEvidence
    } = loadSubject();

    const original = makeUpstream();

    const changedIntent =
      Object.freeze({
        ...original.transactionIntent,
        to:
          "0x7777777777777777777777777777777777777777"
      });

    const changedUnsigned =
      Object.freeze({
        ...original
          .unsignedTransactionIntentEvidence,
        transactionIntent:
          changedIntent
      });

    const upstream =
      Object.freeze({
        ...original,
        unsignedTransactionIntentEvidence:
          changedUnsigned,
        transactionIntent:
          changedIntent
      });

    await assert.rejects(
      acquireCurrentTransactionGasEstimationEvidence({
        currentTransactionParameterEvidence:
          upstream,
        provider: makeProvider()
      }),
      /executor|target|to|identity/i
    );
  }
);

test(
  "rejects missing provider estimateGas capability",
  async () => {
    const {
      acquireCurrentTransactionGasEstimationEvidence
    } = loadSubject();

    await assert.rejects(
      acquireCurrentTransactionGasEstimationEvidence({
        currentTransactionParameterEvidence:
          makeUpstream(),
        provider: {}
      }),
      /provider|estimateGas/i
    );
  }
);

test(
  "rejects zero gas estimate",
  async () => {
    const {
      acquireCurrentTransactionGasEstimationEvidence
    } = loadSubject();

    await assert.rejects(
      acquireCurrentTransactionGasEstimationEvidence({
        currentTransactionParameterEvidence:
          makeUpstream(),
        provider:
          makeProvider({
            estimatedGas:
              ethers.constants.Zero
          })
      }),
      /gas|positive/i
    );
  }
);

test(
  "rejects malformed gas estimate",
  async () => {
    const {
      acquireCurrentTransactionGasEstimationEvidence
    } = loadSubject();

    await assert.rejects(
      acquireCurrentTransactionGasEstimationEvidence({
        currentTransactionParameterEvidence:
          makeUpstream(),
        provider:
          makeProvider({
            estimatedGas:
              "not-gas"
          })
      }),
      /gas|BigNumber|positive/i
    );
  }
);

test(
  "does not add a gasLimit or transaction-envelope fields",
  async () => {
    const {
      acquireCurrentTransactionGasEstimationEvidence
    } = loadSubject();

    const result =
      await acquireCurrentTransactionGasEstimationEvidence({
        currentTransactionParameterEvidence:
          makeUpstream(),
        provider: makeProvider()
      });

    for (const field of [
      "gasLimit",
      "gasPrice",
      "type",
      "chainId",
      "nonce",
      "maxFeePerGas",
      "maxPriorityFeePerGas"
    ]) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(
          result,
          field
        ),
        false,
        `${field} must not be added to gas-estimation output`
      );
    }
  }
);

test(
  "does not mutate the exact preserved transaction intent",
  async () => {
    const {
      acquireCurrentTransactionGasEstimationEvidence
    } = loadSubject();

    const upstream = makeUpstream();

    const before = {
      from:
        upstream.transactionIntent.from,
      to:
        upstream.transactionIntent.to,
      data:
        upstream.transactionIntent.data,
      value:
        upstream.transactionIntent
          .value.toString()
    };

    const result =
      await acquireCurrentTransactionGasEstimationEvidence({
        currentTransactionParameterEvidence:
          upstream,
        provider: makeProvider()
      });

    assert.strictEqual(
      result.transactionIntent,
      upstream.transactionIntent
    );

    assert.deepEqual(
      {
        from:
          result.transactionIntent.from,
        to:
          result.transactionIntent.to,
        data:
          result.transactionIntent.data,
        value:
          result.transactionIntent
            .value.toString()
      },
      before
    );
  }
);

test(
  "production boundary owns estimation only and no gas-limit signer signing send or broadcast capability",
  () => {
    const sourcePath =
      path.join(
        __dirname,
        "..",
        "scripts",
        "utils",
        "polygonV4CurrentTransactionGasEstimationEvidence.js"
      );

    const source =
      fs.readFileSync(
        sourcePath,
        "utf8"
      );

    const forbidden = [
      /700000/,
      /652106/,
      /gasLimit\s*:/,
      /getSigner\s*\(/,
      /getSigners\s*\(/,
      /PRIVATE_KEY/,
      /privateKey/,
      /mnemonic/i,
      /seed phrase/i,
      /new\s+ethers\.Wallet/,
      /Wallet\s*\(/,
      /populateTransaction/,
      /signTransaction/,
      /sendTransaction/,
      /sendRawTransaction/,
      /broadcastTransaction/,
      /\.wait\s*\(/,
      /getTransactionCount\s*\(/,
      /getFeeData\s*\(/,
      /getNetwork\s*\(/,
      /initiateFlashloan\s*\(/
    ];

    for (const pattern of forbidden) {
      assert.doesNotMatch(
        source,
        pattern
      );
    }

    assert.match(
      source,
      /\.estimateGas\s*\(/
    );
  }
);

test(
  "rejects nested current-state preflight evidence not ready",
  async () => {
    const {
      acquireCurrentTransactionGasEstimationEvidence
    } = loadSubject();

    const original = makeUpstream();

    const unsigned =
      original.unsignedTransactionIntentEvidence;

    const account =
      unsigned.accountCallerIdentityEvidence;

    const changedPreflight =
      Object.freeze({
        ...account.currentStatePreflightEvidence,
        currentStatePreflightReady: false
      });

    const changedAccount =
      Object.freeze({
        ...account,
        currentStatePreflightEvidence:
          changedPreflight
      });

    const changedUnsigned =
      Object.freeze({
        ...unsigned,
        accountCallerIdentityEvidence:
          changedAccount
      });

    const changedCurrent =
      Object.freeze({
        ...original,
        unsignedTransactionIntentEvidence:
          changedUnsigned
      });

    await assert.rejects(
      acquireCurrentTransactionGasEstimationEvidence({
        currentTransactionParameterEvidence:
          changedCurrent,
        provider: makeProvider()
      }),
      /preflight.*ready|current.*state.*ready/i
    );
  }
);

test(
  "rejects nested current-state preflight authorization",
  async () => {
    const {
      acquireCurrentTransactionGasEstimationEvidence
    } = loadSubject();

    const original = makeUpstream();

    const unsigned =
      original.unsignedTransactionIntentEvidence;

    const account =
      unsigned.accountCallerIdentityEvidence;

    const changedPreflight =
      Object.freeze({
        ...account.currentStatePreflightEvidence,
        liveExecutionAuthorized: true
      });

    const changedAccount =
      Object.freeze({
        ...account,
        currentStatePreflightEvidence:
          changedPreflight
      });

    const changedUnsigned =
      Object.freeze({
        ...unsigned,
        accountCallerIdentityEvidence:
          changedAccount
      });

    const changedCurrent =
      Object.freeze({
        ...original,
        unsignedTransactionIntentEvidence:
          changedUnsigned
      });

    await assert.rejects(
      acquireCurrentTransactionGasEstimationEvidence({
        currentTransactionParameterEvidence:
          changedCurrent,
        provider: makeProvider()
      }),
      /authorization|false/i
    );
  }
);

test(
  "rejects reconstructed candidate identity in preserved upstream graph",
  async () => {
    const {
      acquireCurrentTransactionGasEstimationEvidence
    } = loadSubject();

    const original = makeUpstream();

    const unsigned =
      original.unsignedTransactionIntentEvidence;

    const changedUnsigned =
      Object.freeze({
        ...unsigned,
        candidate:
          Object.freeze({
            ...unsigned.candidate
          })
      });

    const changedCurrent =
      Object.freeze({
        ...original,
        unsignedTransactionIntentEvidence:
          changedUnsigned
      });

    await assert.rejects(
      acquireCurrentTransactionGasEstimationEvidence({
        currentTransactionParameterEvidence:
          changedCurrent,
        provider: makeProvider()
      }),
      /candidate.*identity|preserved.*candidate/i
    );
  }
);

test(
  "rejects reconstructed execution legs identity in preserved upstream graph",
  async () => {
    const {
      acquireCurrentTransactionGasEstimationEvidence
    } = loadSubject();

    const original = makeUpstream();

    const unsigned =
      original.unsignedTransactionIntentEvidence;

    const changedUnsigned =
      Object.freeze({
        ...unsigned,
        executionLegs:
          Object.freeze([
            ...unsigned.executionLegs
          ])
      });

    const changedCurrent =
      Object.freeze({
        ...original,
        unsignedTransactionIntentEvidence:
          changedUnsigned
      });

    await assert.rejects(
      acquireCurrentTransactionGasEstimationEvidence({
        currentTransactionParameterEvidence:
          changedCurrent,
        provider: makeProvider()
      }),
      /execution.*legs.*identity|preserved.*legs/i
    );
  }
);

test(
  "rejects changed execution plan identity in preserved upstream graph",
  async () => {
    const {
      acquireCurrentTransactionGasEstimationEvidence
    } = loadSubject();

    const original = makeUpstream();

    const unsigned =
      original.unsignedTransactionIntentEvidence;

    const changedUnsigned =
      Object.freeze({
        ...unsigned,
        executionPlan: "0xabcd"
      });

    const changedCurrent =
      Object.freeze({
        ...original,
        unsignedTransactionIntentEvidence:
          changedUnsigned
      });

    await assert.rejects(
      acquireCurrentTransactionGasEstimationEvidence({
        currentTransactionParameterEvidence:
          changedCurrent,
        provider: makeProvider()
      }),
      /execution.*plan.*identity|preserved.*plan/i
    );
  }
);

test(
  "rejects account evidence whose preserved candidate identity diverges",
  async () => {
    const {
      acquireCurrentTransactionGasEstimationEvidence
    } = loadSubject();

    const original = makeUpstream();

    const unsigned =
      original.unsignedTransactionIntentEvidence;

    const account =
      unsigned.accountCallerIdentityEvidence;

    const changedAccount =
      Object.freeze({
        ...account,
        candidate:
          Object.freeze({
            ...account.candidate
          })
      });

    const changedUnsigned =
      Object.freeze({
        ...unsigned,
        accountCallerIdentityEvidence:
          changedAccount
      });

    const changedCurrent =
      Object.freeze({
        ...original,
        unsignedTransactionIntentEvidence:
          changedUnsigned
      });

    await assert.rejects(
      acquireCurrentTransactionGasEstimationEvidence({
        currentTransactionParameterEvidence:
          changedCurrent,
        provider: makeProvider()
      }),
      /candidate.*identity|preserved.*candidate/i
    );
  }
);
