"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const SUBJECT =
  "../scripts/utils/polygonV4SignerCapabilityBindingEvidence";

const SIGNER =
  "0x1111111111111111111111111111111111111111";

const OTHER =
  "0x2222222222222222222222222222222222222222";

function loadSubject() {
  return require(SUBJECT);
}

function make1S37Evidence(overrides = {}) {
  const transactionEnvelope = {
    from: SIGNER,
    to: "0x3333333333333333333333333333333333333333",
    data: "0x1234",
    value: "0",
    chainId: 137,
    nonce: 9,
    maxFeePerGas: "100",
    maxPriorityFeePerGas: "10",
    gasLimit: "827233"
  };

  return {
    signerAuthorizationEvidence: {},
    transactionEnvelope,
    signerAddress: SIGNER,
    signingAuthorizationReady: true,
    signerAuthorized: true,
    signingAuthorized: true,
    liveExecutionAuthorized: false,
    broadcastAuthorized: false,
    ...overrides
  };
}

test(
  "1S.38 binds a narrow signer capability identity to the exact authorized signer/envelope without signing or broadcast",
  async () => {
    const {
      acquireSignerCapabilityBindingEvidence
    } = loadSubject();

    const upstream = make1S37Evidence();
    let calls = 0;

    const getSignerCapabilityAddress = async () => {
      calls += 1;
      return SIGNER;
    };

    const evidence =
      await acquireSignerCapabilityBindingEvidence({
        signingAuthorizationEvidence: upstream,
        getSignerCapabilityAddress
      });

    assert.equal(calls, 1);

    assert.equal(
      evidence.signingAuthorizationEvidence,
      upstream
    );

    assert.equal(
      evidence.transactionEnvelope,
      upstream.transactionEnvelope
    );

    assert.equal(evidence.signerAddress, SIGNER);
    assert.equal(
      evidence.signerCapabilityAddress,
      SIGNER
    );

    assert.equal(
      evidence.signerCapabilityBindingReady,
      true
    );

    assert.equal(evidence.signerAuthorized, true);
    assert.equal(evidence.signingAuthorized, true);

    assert.equal(
      evidence.liveExecutionAuthorized,
      false
    );

    assert.equal(
      evidence.broadcastAuthorized,
      false
    );

    assert.equal(Object.isFrozen(evidence), true);
  }
);

test(
  "1S.38 rejects signer-capability identity mismatch",
  async () => {
    const {
      acquireSignerCapabilityBindingEvidence
    } = loadSubject();

    await assert.rejects(
      acquireSignerCapabilityBindingEvidence({
        signingAuthorizationEvidence:
          make1S37Evidence(),
        getSignerCapabilityAddress:
          async () => OTHER
      }),
      /capability|signer|address|match/i
    );
  }
);

test(
  "1S.38 rejects invalid capability address",
  async () => {
    const {
      acquireSignerCapabilityBindingEvidence
    } = loadSubject();

    await assert.rejects(
      acquireSignerCapabilityBindingEvidence({
        signingAuthorizationEvidence:
          make1S37Evidence(),
        getSignerCapabilityAddress:
          async () => "not-an-address"
      })
    );
  }
);

test(
  "1S.38 rejects invalid upstream authorization state before capability acquisition",
  async () => {
    const {
      acquireSignerCapabilityBindingEvidence
    } = loadSubject();

    const invalidStates = [
      { signingAuthorizationReady: false },
      { signerAuthorized: false },
      { signingAuthorized: false },
      { liveExecutionAuthorized: true },
      { broadcastAuthorized: true }
    ];

    for (const override of invalidStates) {
      let called = false;

      await assert.rejects(
        acquireSignerCapabilityBindingEvidence({
          signingAuthorizationEvidence:
            make1S37Evidence(override),
          getSignerCapabilityAddress:
            async () => {
              called = true;
              return SIGNER;
            }
        })
      );

      assert.equal(called, false);
    }
  }
);

test(
  "1S.38 rejects upstream signer/envelope identity mismatch before capability acquisition",
  async () => {
    const {
      acquireSignerCapabilityBindingEvidence
    } = loadSubject();

    let called = false;

    await assert.rejects(
      acquireSignerCapabilityBindingEvidence({
        signingAuthorizationEvidence:
          make1S37Evidence({
            signerAddress: OTHER
          }),
        getSignerCapabilityAddress:
          async () => {
            called = true;
            return OTHER;
          }
      }),
      /signer|address|match/i
    );

    assert.equal(called, false);
  }
);

test(
  "1S.38 rejects missing signer capability address function",
  async () => {
    const {
      acquireSignerCapabilityBindingEvidence
    } = loadSubject();

    await assert.rejects(
      acquireSignerCapabilityBindingEvidence({
        signingAuthorizationEvidence:
          make1S37Evidence()
      }),
      /getSignerCapabilityAddress|function/i
    );
  }
);

test(
  "1S.38 rejects upstream capability-binding contamination before capability acquisition",
  async () => {
    const {
      acquireSignerCapabilityBindingEvidence
    } = loadSubject();

    const contaminations = [
      { signerCapabilityBindingReady: false },
      { signerCapabilityBindingReady: true },
      { signerCapabilityAddress: SIGNER },
      { signerCapabilityAddress: undefined }
    ];

    for (const contamination of contaminations) {
      let called = false;

      await assert.rejects(
        acquireSignerCapabilityBindingEvidence({
          signingAuthorizationEvidence:
            make1S37Evidence(contamination),
          getSignerCapabilityAddress:
            async () => {
              called = true;
              return SIGNER;
            }
        }),
        /capability|binding|upstream|field/i
      );

      assert.equal(called, false);
    }
  }
);

test(
  "1S.38 preserves exact upstream/envelope references and exposes no signer capability object",
  async () => {
    const {
      acquireSignerCapabilityBindingEvidence
    } = loadSubject();

    const upstream = make1S37Evidence();

    const evidence =
      await acquireSignerCapabilityBindingEvidence({
        signingAuthorizationEvidence: upstream,
        getSignerCapabilityAddress:
          async () => SIGNER
      });

    assert.equal(
      evidence.signingAuthorizationEvidence,
      upstream
    );

    assert.equal(
      evidence.transactionEnvelope,
      upstream.transactionEnvelope
    );

    assert.deepEqual(
      Object.keys(evidence).sort(),
      [
        "broadcastAuthorized",
        "liveExecutionAuthorized",
        "signerAddress",
        "signerAuthorized",
        "signerCapabilityAddress",
        "signerCapabilityBindingReady",
        "signingAuthorizationEvidence",
        "signingAuthorized",
        "transactionEnvelope"
      ].sort()
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        evidence,
        "signer"
      ),
      false
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        evidence,
        "wallet"
      ),
      false
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        evidence,
        "signTransaction"
      ),
      false
    );
  }
);

test(
  "1S.38 production boundary contains no key, wallet, signing, sending, RPC, execution, or gas-selection ownership",
  () => {
    const productionPath = path.join(
      __dirname,
      "../scripts/utils/polygonV4SignerCapabilityBindingEvidence.js"
    );

    if (!fs.existsSync(productionPath)) {
      return;
    }

    const source =
      fs.readFileSync(productionPath, "utf8");

    const forbidden = [
      "PRIVATE_KEY",
      "process.env",
      "new ethers.Wallet",
      "new Wallet",
      "getSigner(",
      "getSigners(",
      "signTransaction",
      "sendTransaction",
      "sendRawTransaction",
      "broadcastTransaction",
      ".wait(",
      "initiateFlashloan",
      "JsonRpcProvider",
      "estimateGas",
      "getTransactionCount",
      "getFeeData"
    ];

    for (const token of forbidden) {
      assert.equal(
        source.includes(token),
        false,
        `production must not contain ${token}`
      );
    }
  }
);

test(
  "1S.38 rejects malformed signing-authorization evidence before capability acquisition",
  async () => {
    const {
      acquireSignerCapabilityBindingEvidence
    } = loadSubject();

    for (const malformed of [
      undefined,
      null,
      "evidence",
      137,
      [],
      true
    ]) {
      let called = false;

      await assert.rejects(
        acquireSignerCapabilityBindingEvidence({
          signingAuthorizationEvidence: malformed,
          getSignerCapabilityAddress:
            async () => {
              called = true;
              return SIGNER;
            }
        }),
        /signingAuthorizationEvidence|object/i
      );

      assert.equal(called, false);
    }
  }
);

test(
  "1S.38 propagates signer-capability address acquisition rejection unchanged",
  async () => {
    const {
      acquireSignerCapabilityBindingEvidence
    } = loadSubject();

    const expected =
      new Error("capability-address-acquisition-failed");

    let calls = 0;

    const getSignerCapabilityAddress =
      async () => {
        calls += 1;
        throw expected;
      };

    await assert.rejects(
      acquireSignerCapabilityBindingEvidence({
        signingAuthorizationEvidence:
          make1S37Evidence(),
        getSignerCapabilityAddress
      }),
      error => error === expected
    );

    assert.equal(calls, 1);
  }
);

test(
  "1S.38 invokes the narrow signer-capability address function exactly once with no arguments",
  async () => {
    const {
      acquireSignerCapabilityBindingEvidence
    } = loadSubject();

    const upstream = make1S37Evidence();

    let calls = 0;
    let receivedArguments;

    const getSignerCapabilityAddress =
      async (...args) => {
        calls += 1;
        receivedArguments = args;
        return SIGNER;
      };

    const evidence =
      await acquireSignerCapabilityBindingEvidence({
        signingAuthorizationEvidence: upstream,
        getSignerCapabilityAddress
      });

    assert.equal(calls, 1);
    assert.deepEqual(receivedArguments, []);

    assert.equal(
      evidence.signingAuthorizationEvidence,
      upstream
    );

    assert.equal(
      evidence.transactionEnvelope,
      upstream.transactionEnvelope
    );
  }
);

test(
  "1S.38 normalizes equivalent signer-capability address casing",
  async () => {
    const {
      acquireSignerCapabilityBindingEvidence
    } = loadSubject();

    const mixedCaseSigner =
      "0x1111111111111111111111111111111111111111";

    const upstream =
      make1S37Evidence({
        signerAddress: mixedCaseSigner,
        transactionEnvelope: {
          ...make1S37Evidence().transactionEnvelope,
          from: mixedCaseSigner
        }
      });

    const evidence =
      await acquireSignerCapabilityBindingEvidence({
        signingAuthorizationEvidence: upstream,
        getSignerCapabilityAddress:
          async () => mixedCaseSigner.toUpperCase()
            .replace(/^0X/, "0x")
      });

    assert.equal(
      evidence.signerCapabilityAddress,
      SIGNER
    );

    assert.equal(evidence.signerAddress, SIGNER);
  }
);
