"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  acquireCurrentTransactionParameterEvidence
} = require(
  "../scripts/utils/polygonV4CurrentTransactionParameterEvidence"
);

const CALLER =
  "0x1111111111111111111111111111111111111111";

const EXECUTOR =
  "0x2222222222222222222222222222222222222222";

const TOKEN =
  "0x3333333333333333333333333333333333333333";

const DATA = "0x12345678";

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

  return Object.freeze({
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
}

function makeProvider({
  chainId = 137,
  nonce = 7,
  maxFeePerGas =
    ethers.utils.parseUnits("60", "gwei"),
  maxPriorityFeePerGas =
    ethers.utils.parseUnits("30", "gwei")
} = {}) {
  const calls = [];

  return {
    calls,

    async getNetwork() {
      calls.push(["getNetwork"]);
      return { chainId };
    },

    async getTransactionCount(address, blockTag) {
      calls.push([
        "getTransactionCount",
        address,
        blockTag
      ]);

      return nonce;
    },

    async getFeeData() {
      calls.push(["getFeeData"]);

      return {
        gasPrice: null,
        lastBaseFeePerGas: null,
        maxFeePerGas,
        maxPriorityFeePerGas
      };
    }
  };
}

test(
  "acquires exact current Polygon transaction parameter evidence",
  async () => {
    const upstream = makeUpstream();
    const provider = makeProvider();

    const result =
      await acquireCurrentTransactionParameterEvidence({
        unsignedTransactionIntentEvidence: upstream,
        provider
      });

    assert.equal(
      result.unsignedTransactionIntentEvidence,
      upstream
    );

    assert.equal(
      result.transactionIntent,
      upstream.transactionIntent
    );

    assert.equal(
      result.chainId,
      137
    );

    assert.equal(
      result.nonce,
      7
    );

    assert.equal(
      result.maxFeePerGas.toString(),
      ethers.utils.parseUnits("60", "gwei").toString()
    );

    assert.equal(
      result.maxPriorityFeePerGas.toString(),
      ethers.utils.parseUnits("30", "gwei").toString()
    );

    assert.equal(
      result.currentTransactionParametersReady,
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

    assert.deepEqual(
      provider.calls,
      [
        ["getNetwork"],
        [
          "getTransactionCount",
          CALLER,
          "pending"
        ],
        ["getFeeData"]
      ]
    );

    assert.equal(
      Object.isFrozen(result),
      true
    );
  }
);

test(
  "rejects shallow fabricated 1S.29 evidence graph",
  async () => {
    const transactionIntent =
      Object.freeze({
        from: CALLER,
        to: EXECUTOR,
        data: DATA,
        value: ethers.constants.Zero
      });

    const shallow = Object.freeze({
      transactionIntent,

      flashloanToken: TOKEN,
      flashloanAmount:
        ethers.BigNumber.from(
          "125000000000000000"
        ),

      unsignedTransactionIntentReady: true,

      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

    await assert.rejects(
      acquireCurrentTransactionParameterEvidence({
        unsignedTransactionIntentEvidence:
          shallow,
        provider: makeProvider()
      }),
      /account|identity|candidate|execution|preserved/i
    );
  }
);

test(
  "rejects reconstructed candidate identity",
  async () => {
    const upstream = makeUpstream();

    const reconstructed =
      Object.freeze({
        ...upstream,
        candidate: {
          ...upstream.candidate
        }
      });

    await assert.rejects(
      acquireCurrentTransactionParameterEvidence({
        unsignedTransactionIntentEvidence:
          reconstructed,
        provider: makeProvider()
      }),
      /candidate.*identity|preserved.*candidate/i
    );
  }
);

test(
  "rejects reconstructed execution legs identity",
  async () => {
    const upstream = makeUpstream();

    const reconstructed =
      Object.freeze({
        ...upstream,
        executionLegs:
          [...upstream.executionLegs]
      });

    await assert.rejects(
      acquireCurrentTransactionParameterEvidence({
        unsignedTransactionIntentEvidence:
          reconstructed,
        provider: makeProvider()
      }),
      /execution.*legs.*identity|preserved.*legs/i
    );
  }
);

test(
  "rejects changed execution plan identity",
  async () => {
    const upstream = makeUpstream();

    const changed =
      Object.freeze({
        ...upstream,
        executionPlan: "0xabcd"
      });

    await assert.rejects(
      acquireCurrentTransactionParameterEvidence({
        unsignedTransactionIntentEvidence:
          changed,
        provider: makeProvider()
      }),
      /execution.*plan.*identity|preserved.*plan/i
    );
  }
);

test(
  "rejects account identity evidence not ready",
  async () => {
    const upstream = makeUpstream();

    const changed =
      Object.freeze({
        ...upstream,
        accountCallerIdentityEvidence:
          Object.freeze({
            ...upstream
              .accountCallerIdentityEvidence,
            accountCallerIdentityReady:
              false
          })
      });

    await assert.rejects(
      acquireCurrentTransactionParameterEvidence({
        unsignedTransactionIntentEvidence:
          changed,
        provider: makeProvider()
      }),
      /account.*ready|identity.*ready/i
    );
  }
);

test(
  "rejects nested current-state preflight not ready",
  async () => {
    const upstream = makeUpstream();

    const account =
      upstream.accountCallerIdentityEvidence;

    const changedPreflight =
      Object.freeze({
        ...account.currentStatePreflightEvidence,
        currentStatePreflightReady: false
      });

    const changed =
      Object.freeze({
        ...upstream,
        accountCallerIdentityEvidence:
          Object.freeze({
            ...account,
            currentStatePreflightEvidence:
              changedPreflight
          })
      });

    await assert.rejects(
      acquireCurrentTransactionParameterEvidence({
        unsignedTransactionIntentEvidence:
          changed,
        provider: makeProvider()
      }),
      /preflight.*ready|current.*state.*ready/i
    );
  }
);

test(
  "rejects transaction caller not bound to preserved caller",
  async () => {
    const upstream = makeUpstream();

    const changed =
      Object.freeze({
        ...upstream,
        transactionIntent:
          Object.freeze({
            ...upstream.transactionIntent,
            from:
              "0x6666666666666666666666666666666666666666"
          })
      });

    await assert.rejects(
      acquireCurrentTransactionParameterEvidence({
        unsignedTransactionIntentEvidence:
          changed,
        provider: makeProvider()
      }),
      /caller|from|identity/i
    );
  }
);

test(
  "rejects transaction target not bound to preserved executor",
  async () => {
    const upstream = makeUpstream();

    const changed =
      Object.freeze({
        ...upstream,
        transactionIntent:
          Object.freeze({
            ...upstream.transactionIntent,
            to:
              "0x7777777777777777777777777777777777777777"
          })
      });

    await assert.rejects(
      acquireCurrentTransactionParameterEvidence({
        unsignedTransactionIntentEvidence:
          changed,
        provider: makeProvider()
      }),
      /executor|target|to|identity/i
    );
  }
);

test(
  "rejects missing upstream evidence",
  async () => {
    await assert.rejects(
      acquireCurrentTransactionParameterEvidence({
        provider: makeProvider()
      }),
      /evidence|intent/i
    );
  }
);

test(
  "rejects upstream not ready",
  async () => {
    const upstream = {
      ...makeUpstream(),
      unsignedTransactionIntentReady: false
    };

    await assert.rejects(
      acquireCurrentTransactionParameterEvidence({
        unsignedTransactionIntentEvidence: upstream,
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
    `rejects upstream ${field} not exactly false`,
    async () => {
      const upstream = {
        ...makeUpstream(),
        [field]: true
      };

      await assert.rejects(
        acquireCurrentTransactionParameterEvidence({
          unsignedTransactionIntentEvidence: upstream,
          provider: makeProvider()
        }),
        /authorization|false/i
      );
    }
  );
}

test(
  "rejects missing provider",
  async () => {
    await assert.rejects(
      acquireCurrentTransactionParameterEvidence({
        unsignedTransactionIntentEvidence:
          makeUpstream()
      }),
      /provider/i
    );
  }
);

test(
  "rejects wrong network",
  async () => {
    await assert.rejects(
      acquireCurrentTransactionParameterEvidence({
        unsignedTransactionIntentEvidence:
          makeUpstream(),
        provider: makeProvider({
          chainId: 1
        })
      }),
      /network|chain|polygon/i
    );
  }
);

test(
  "acquires nonce for exact upstream caller using pending block tag",
  async () => {
    const upstream = makeUpstream();
    const provider = makeProvider();

    await acquireCurrentTransactionParameterEvidence({
      unsignedTransactionIntentEvidence: upstream,
      provider
    });

    const nonceCall =
      provider.calls.find(
        call =>
          call[0] === "getTransactionCount"
      );

    assert.deepEqual(
      nonceCall,
      [
        "getTransactionCount",
        upstream.transactionIntent.from,
        "pending"
      ]
    );
  }
);

for (const nonce of [
  -1,
  1.5,
  NaN,
  Infinity,
  "7",
  null
]) {
  test(
    `rejects invalid nonce ${String(nonce)}`,
    async () => {
      await assert.rejects(
        acquireCurrentTransactionParameterEvidence({
          unsignedTransactionIntentEvidence:
            makeUpstream(),
          provider: makeProvider({ nonce })
        }),
        /nonce/i
      );
    }
  );
}

test(
  "accepts nonce zero",
  async () => {
    const result =
      await acquireCurrentTransactionParameterEvidence({
        unsignedTransactionIntentEvidence:
          makeUpstream(),
        provider: makeProvider({
          nonce: 0
        })
      });

    assert.equal(result.nonce, 0);
  }
);

test(
  "rejects missing maxFeePerGas",
  async () => {
    await assert.rejects(
      acquireCurrentTransactionParameterEvidence({
        unsignedTransactionIntentEvidence:
          makeUpstream(),
        provider: makeProvider({
          maxFeePerGas: null
        })
      }),
      /maxFeePerGas|fee/i
    );
  }
);

test(
  "rejects missing maxPriorityFeePerGas",
  async () => {
    await assert.rejects(
      acquireCurrentTransactionParameterEvidence({
        unsignedTransactionIntentEvidence:
          makeUpstream(),
        provider: makeProvider({
          maxPriorityFeePerGas: null
        })
      }),
      /maxPriorityFeePerGas|priority|fee/i
    );
  }
);

test(
  "rejects zero maxFeePerGas",
  async () => {
    await assert.rejects(
      acquireCurrentTransactionParameterEvidence({
        unsignedTransactionIntentEvidence:
          makeUpstream(),
        provider: makeProvider({
          maxFeePerGas:
            ethers.constants.Zero
        })
      }),
      /maxFeePerGas|positive|fee/i
    );
  }
);

test(
  "rejects zero maxPriorityFeePerGas",
  async () => {
    await assert.rejects(
      acquireCurrentTransactionParameterEvidence({
        unsignedTransactionIntentEvidence:
          makeUpstream(),
        provider: makeProvider({
          maxPriorityFeePerGas:
            ethers.constants.Zero
        })
      }),
      /maxPriorityFeePerGas|positive|priority|fee/i
    );
  }
);

test(
  "rejects maxFeePerGas below maxPriorityFeePerGas",
  async () => {
    await assert.rejects(
      acquireCurrentTransactionParameterEvidence({
        unsignedTransactionIntentEvidence:
          makeUpstream(),
        provider: makeProvider({
          maxFeePerGas:
            ethers.utils.parseUnits("20", "gwei"),
          maxPriorityFeePerGas:
            ethers.utils.parseUnits("30", "gwei")
        })
      }),
      /fee|priority/i
    );
  }
);

test(
  "does not acquire gas limit, signer, or send transaction",
  async () => {
    const provider = makeProvider();

    provider.estimateGas = async () => {
      throw new Error("estimateGas must not be called");
    };

    provider.getSigner = () => {
      throw new Error("getSigner must not be called");
    };

    provider.sendTransaction = async () => {
      throw new Error("sendTransaction must not be called");
    };

    const result =
      await acquireCurrentTransactionParameterEvidence({
        unsignedTransactionIntentEvidence:
          makeUpstream(),
        provider
      });

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        result,
        "gasLimit"
      ),
      false
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        result,
        "signer"
      ),
      false
    );
  }
);

test(
  "does not mutate exact upstream transaction intent",
  async () => {
    const upstream = makeUpstream();

    const before = {
      from: upstream.transactionIntent.from,
      to: upstream.transactionIntent.to,
      data: upstream.transactionIntent.data,
      value:
        upstream.transactionIntent.value.toString()
    };

    const result =
      await acquireCurrentTransactionParameterEvidence({
        unsignedTransactionIntentEvidence: upstream,
        provider: makeProvider()
      });

    assert.equal(
      result.transactionIntent,
      upstream.transactionIntent
    );

    assert.deepEqual(
      {
        from: result.transactionIntent.from,
        to: result.transactionIntent.to,
        data: result.transactionIntent.data,
        value:
          result.transactionIntent.value.toString()
      },
      before
    );
  }
);

test(
  "source has no signer, wallet, gas-limit, signing, send, or broadcast ownership",
  () => {
    const fs = require("node:fs");

    const source = fs.readFileSync(
      require.resolve(
        "../scripts/utils/polygonV4CurrentTransactionParameterEvidence.js"
      ),
      "utf8"
    );

    const forbidden = [
      /PRIVATE_KEY/,
      /privateKey/,
      /mnemonic/i,
      /seed phrase/i,
      /new\s+ethers\.Wallet/,
      /Wallet\s*\(/,
      /getSigner\s*\(/,
      /estimateGas\s*\(/,
      /gasLimit\s*:/,
      /populateTransaction/,
      /signTransaction/,
      /sendTransaction/,
      /sendRawTransaction/,
      /broadcastTransaction/,
      /\.wait\s*\(/,
      /initiateFlashloan\s*\(/
    ];

    for (const pattern of forbidden) {
      assert.doesNotMatch(
        source,
        pattern
      );
    }
  }
);
