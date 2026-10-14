"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

function loadSubject() {
  return require(
    "../scripts/utils/polygonV4SigningAuthorizationEvidence"
  );
}

const SIGNER =
  "0x1B786608D3F073e44910bB975413f97A11Dd7bcA";

function make1S36Evidence(overrides = {}) {
  const transactionEnvelope = {
    from: SIGNER,
    to: "0x1111111111111111111111111111111111111111",
    data: "0x1234",
    value: "0",
    chainId: 137,
    nonce: 7,
    maxFeePerGas: "100",
    maxPriorityFeePerGas: "30",
    gasLimit: "500000"
  };

  return {
    prospectiveSignerIdentityEvidence: {
      prospectiveSignerIdentityReady: true
    },
    transactionEnvelope,
    signerAddress: SIGNER,
    signerAuthorizationReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: true,
    broadcastAuthorized: false,
    ...overrides
  };
}

test(
  "1S.37 explicitly authorizes signing of the exact authorized signer/envelope without signing, execution, or broadcast",
  async () => {
    const {
      acquireSigningAuthorizationEvidence
    } = loadSubject();

    const upstream = make1S36Evidence();
    let calls = 0;

    const authorizeTransactionSigning = async ({
      signerAddress,
      transactionEnvelope
    }) => {
      calls += 1;

      assert.equal(signerAddress, SIGNER);

      assert.equal(
        transactionEnvelope,
        upstream.transactionEnvelope
      );

      return true;
    };

    const evidence =
      await acquireSigningAuthorizationEvidence({
        signerAuthorizationEvidence: upstream,
        authorizeTransactionSigning
      });

    assert.equal(calls, 1);

    assert.equal(
      evidence.signerAuthorizationEvidence,
      upstream
    );

    assert.equal(
      evidence.transactionEnvelope,
      upstream.transactionEnvelope
    );

    assert.equal(evidence.signerAddress, SIGNER);

    assert.equal(
      evidence.signingAuthorizationReady,
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
  "1S.37 rejects an explicit signing-authorization denial",
  async () => {
    const {
      acquireSigningAuthorizationEvidence
    } = loadSubject();

    await assert.rejects(
      acquireSigningAuthorizationEvidence({
        signerAuthorizationEvidence:
          make1S36Evidence(),
        authorizeTransactionSigning:
          async () => false
      }),
      /authoriz|true/i
    );
  }
);

test(
  "1S.37 requires signing authorization result to be exactly true",
  async () => {
    const {
      acquireSigningAuthorizationEvidence
    } = loadSubject();

    for (const invalid of [
      undefined,
      null,
      1,
      "true",
      {},
      []
    ]) {
      await assert.rejects(
        acquireSigningAuthorizationEvidence({
          signerAuthorizationEvidence:
            make1S36Evidence(),
          authorizeTransactionSigning:
            async () => invalid
        }),
        /authoriz|true/i
      );
    }
  }
);

test(
  "1S.37 rejects non-ready signer authorization evidence before requesting signing authorization",
  async () => {
    const {
      acquireSigningAuthorizationEvidence
    } = loadSubject();

    let called = false;

    const authorizeTransactionSigning = async () => {
      called = true;
      return true;
    };

    await assert.rejects(
      acquireSigningAuthorizationEvidence({
        signerAuthorizationEvidence:
          make1S36Evidence({
            signerAuthorizationReady: false
          }),
        authorizeTransactionSigning
      }),
      /signer|authorization|ready/i
    );

    assert.equal(called, false);
  }
);

test(
  "1S.37 rejects non-authorized signer evidence before requesting signing authorization",
  async () => {
    const {
      acquireSigningAuthorizationEvidence
    } = loadSubject();

    let called = false;

    const authorizeTransactionSigning = async () => {
      called = true;
      return true;
    };

    await assert.rejects(
      acquireSigningAuthorizationEvidence({
        signerAuthorizationEvidence:
          make1S36Evidence({
            signerAuthorized: false
          }),
        authorizeTransactionSigning
      }),
      /signer|authoriz|true/i
    );

    assert.equal(called, false);
  }
);

test(
  "1S.37 rejects upstream signing-authorization contamination before requesting authorization",
  async () => {
    const {
      acquireSigningAuthorizationEvidence
    } = loadSubject();

    let called = false;

    const authorizeTransactionSigning = async () => {
      called = true;
      return true;
    };

    for (const signingAuthorized of [
      false,
      true
    ]) {
      await assert.rejects(
        acquireSigningAuthorizationEvidence({
          signerAuthorizationEvidence:
            make1S36Evidence({
              signingAuthorized
            }),
          authorizeTransactionSigning
        }),
        /signing|authorization|upstream|field/i
      );
    }

    assert.equal(called, false);
  }
);

test(
  "1S.37 rejects signer/envelope identity mismatch before requesting signing authorization",
  async () => {
    const {
      acquireSigningAuthorizationEvidence
    } = loadSubject();

    let called = false;

    const authorizeTransactionSigning = async () => {
      called = true;
      return true;
    };

    await assert.rejects(
      acquireSigningAuthorizationEvidence({
        signerAuthorizationEvidence:
          make1S36Evidence({
            signerAddress:
              "0x2222222222222222222222222222222222222222"
          }),
        authorizeTransactionSigning
      }),
      /signer|address|match/i
    );

    assert.equal(called, false);
  }
);

test(
  "1S.37 production boundary contains no wallet, key, signing, sending, RPC, execution, or gas-selection ownership",
  () => {
    const productionPath = path.join(
      __dirname,
      "../scripts/utils/polygonV4SigningAuthorizationEvidence.js"
    );

    if (!fs.existsSync(productionPath)) {
      return;
    }

    const source = fs.readFileSync(
      productionPath,
      "utf8"
    );

    const forbidden = [
      "PRIVATE_KEY",
      "process.env",
      "new ethers.Wallet",
      "new Wallet",
      "getSigner(",
      "getSigners(",
      "getSignerAddress",
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
  "1S.37 rejects missing authorizeTransactionSigning",
  async () => {
    const {
      acquireSigningAuthorizationEvidence
    } = loadSubject();

    await assert.rejects(
      acquireSigningAuthorizationEvidence({
        signerAuthorizationEvidence:
          make1S36Evidence()
      }),
      /authorizeTransactionSigning|function/i
    );
  }
);

test(
  "1S.37 rejects malformed signer or envelope-from before requesting signing authorization",
  async () => {
    const {
      acquireSigningAuthorizationEvidence
    } = loadSubject();

    for (const malformed of [
      {
        signerAddress: "not-an-address"
      },
      {
        transactionEnvelope: {
          ...make1S36Evidence().transactionEnvelope,
          from: "not-an-address"
        }
      }
    ]) {
      let called = false;

      const authorizeTransactionSigning =
        async () => {
          called = true;
          return true;
        };

      await assert.rejects(
        acquireSigningAuthorizationEvidence({
          signerAuthorizationEvidence:
            make1S36Evidence(malformed),
          authorizeTransactionSigning
        })
      );

      assert.equal(called, false);
    }
  }
);

test(
  "1S.37 propagates the exact signing-authorization callback rejection",
  async () => {
    const {
      acquireSigningAuthorizationEvidence
    } = loadSubject();

    const expectedError =
      new Error("authorization capability failed");

    let calls = 0;

    const authorizeTransactionSigning =
      async () => {
        calls += 1;
        throw expectedError;
      };

    try {
      await acquireSigningAuthorizationEvidence({
        signerAuthorizationEvidence:
          make1S36Evidence(),
        authorizeTransactionSigning
      });

      assert.fail(
        "expected authorization callback rejection"
      );
    } catch (error) {
      assert.equal(error, expectedError);
    }

    assert.equal(calls, 1);
  }
);

test(
  "1S.37 rejects upstream signingAuthorizationReady contamination before requesting authorization",
  async () => {
    const {
      acquireSigningAuthorizationEvidence
    } = loadSubject();

    for (const signingAuthorizationReady of [
      false,
      true
    ]) {
      let called = false;

      const authorizeTransactionSigning =
        async () => {
          called = true;
          return true;
        };

      await assert.rejects(
        acquireSigningAuthorizationEvidence({
          signerAuthorizationEvidence:
            make1S36Evidence({
              signingAuthorizationReady
            }),
          authorizeTransactionSigning
        }),
        /signing|authorization|readiness|upstream|field/i
      );

      assert.equal(called, false);
    }
  }
);

test(
  "1S.37 rejects malformed signer-authorization evidence before requesting authorization",
  async () => {
    const {
      acquireSigningAuthorizationEvidence
    } = loadSubject();

    for (const malformed of [
      undefined,
      null,
      "evidence",
      137,
      true,
      []
    ]) {
      let called = false;

      const authorizeTransactionSigning =
        async () => {
          called = true;
          return true;
        };

      await assert.rejects(
        acquireSigningAuthorizationEvidence({
          signerAuthorizationEvidence:
            malformed,
          authorizeTransactionSigning
        }),
        /signerAuthorizationEvidence|object/i
      );

      assert.equal(called, false);
    }
  }
);

test(
  "1S.37 preserves exact upstream and envelope references and gives authorization capability only the bound identity and envelope",
  async () => {
    const {
      acquireSigningAuthorizationEvidence
    } = loadSubject();

    const upstream = make1S36Evidence();

    let callbackArgument;
    let calls = 0;

    const authorizeTransactionSigning =
      async (argument) => {
        calls += 1;
        callbackArgument = argument;
        return true;
      };

    const evidence =
      await acquireSigningAuthorizationEvidence({
        signerAuthorizationEvidence: upstream,
        authorizeTransactionSigning
      });

    assert.equal(calls, 1);

    assert.equal(
      evidence.signerAuthorizationEvidence,
      upstream
    );

    assert.equal(
      evidence.transactionEnvelope,
      upstream.transactionEnvelope
    );

    assert.equal(
      callbackArgument.transactionEnvelope,
      upstream.transactionEnvelope
    );

    assert.equal(
      callbackArgument.signerAddress,
      SIGNER
    );

    assert.deepEqual(
      Object.keys(callbackArgument).sort(),
      [
        "signerAddress",
        "transactionEnvelope"
      ]
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        callbackArgument,
        "signer"
      ),
      false
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        callbackArgument,
        "provider"
      ),
      false
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        callbackArgument,
        "wallet"
      ),
      false
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        callbackArgument,
        "signTransaction"
      ),
      false
    );
  }
);
