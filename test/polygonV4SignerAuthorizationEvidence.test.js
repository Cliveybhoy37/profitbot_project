"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

function loadSubject() {
  return require(
    "../scripts/utils/polygonV4SignerAuthorizationEvidence"
  );
}

const SIGNER =
  "0x1B786608D3F073e44910bB975413f97A11Dd7bcA";

function make1S35Evidence(overrides = {}) {
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
    currentTransactionPreSendSimulationEvidence: {
      currentTransactionPreSendSimulationReady: true
    },
    transactionEnvelope,
    signerAddress: SIGNER,
    prospectiveSignerIdentityReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false,
    ...overrides
  };
}

test(
  "1S.36 explicitly authorizes the exact prospective signer identity without authorizing execution or broadcast",
  async () => {
    const {
      acquireSignerAuthorizationEvidence
    } = loadSubject();

    const upstream = make1S35Evidence();
    let calls = 0;

    const authorizeSignerIdentity = async ({
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
      await acquireSignerAuthorizationEvidence({
        prospectiveSignerIdentityEvidence: upstream,
        authorizeSignerIdentity
      });

    assert.equal(calls, 1);

    assert.equal(
      evidence.prospectiveSignerIdentityEvidence,
      upstream
    );

    assert.equal(
      evidence.transactionEnvelope,
      upstream.transactionEnvelope
    );

    assert.equal(evidence.signerAddress, SIGNER);

    assert.equal(
      evidence.signerAuthorizationReady,
      true
    );

    assert.equal(evidence.signerAuthorized, true);
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
  "1S.36 rejects an explicit signer-authorization denial",
  async () => {
    const {
      acquireSignerAuthorizationEvidence
    } = loadSubject();

    await assert.rejects(
      acquireSignerAuthorizationEvidence({
        prospectiveSignerIdentityEvidence:
          make1S35Evidence(),
        authorizeSignerIdentity: async () => false
      }),
      /authoriz|true/i
    );
  }
);

test(
  "1S.36 requires authorization result to be exactly true",
  async () => {
    const {
      acquireSignerAuthorizationEvidence
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
        acquireSignerAuthorizationEvidence({
          prospectiveSignerIdentityEvidence:
            make1S35Evidence(),
          authorizeSignerIdentity:
            async () => invalid
        }),
        /authoriz|true/i
      );
    }
  }
);

test(
  "1S.36 rejects upstream authorization contamination before requesting authorization",
  async () => {
    const {
      acquireSignerAuthorizationEvidence
    } = loadSubject();

    let called = false;

    const authorizeSignerIdentity = async () => {
      called = true;
      throw new Error(
        "authorization callback must not be reached"
      );
    };

    await assert.rejects(
      acquireSignerAuthorizationEvidence({
        prospectiveSignerIdentityEvidence:
          make1S35Evidence({
            signerAuthorized: true
          }),
        authorizeSignerIdentity
      }),
      /authorization|false|signer/i
    );

    assert.equal(called, false);
  }
);

test(
  "1S.36 rejects non-ready 1S.35 evidence before requesting authorization",
  async () => {
    const {
      acquireSignerAuthorizationEvidence
    } = loadSubject();

    let called = false;

    const authorizeSignerIdentity = async () => {
      called = true;
      return true;
    };

    await assert.rejects(
      acquireSignerAuthorizationEvidence({
        prospectiveSignerIdentityEvidence:
          make1S35Evidence({
            prospectiveSignerIdentityReady: false
          }),
        authorizeSignerIdentity
      }),
      /prospective|ready/i
    );

    assert.equal(called, false);
  }
);

test(
  "1S.36 rejects signer/envelope identity mismatch before requesting authorization",
  async () => {
    const {
      acquireSignerAuthorizationEvidence
    } = loadSubject();

    let called = false;

    const authorizeSignerIdentity = async () => {
      called = true;
      return true;
    };

    await assert.rejects(
      acquireSignerAuthorizationEvidence({
        prospectiveSignerIdentityEvidence:
          make1S35Evidence({
            signerAddress:
              "0x2222222222222222222222222222222222222222"
          }),
        authorizeSignerIdentity
      }),
      /signer|address|match/i
    );

    assert.equal(called, false);
  }
);

test(
  "1S.36 production boundary contains no wallet, key, signing, sending, RPC, execution, or gas-selection ownership",
  () => {
    const productionPath = path.join(
      __dirname,
      "../scripts/utils/polygonV4SignerAuthorizationEvidence.js"
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
  "1S.36 rejects missing authorizeSignerIdentity",
  async () => {
    const {
      acquireSignerAuthorizationEvidence
    } = loadSubject();

    await assert.rejects(
      acquireSignerAuthorizationEvidence({
        prospectiveSignerIdentityEvidence:
          make1S35Evidence()
      }),
      /authorizeSignerIdentity|function/i
    );
  }
);

test(
  "1S.36 rejects malformed prospective signer address before requesting authorization",
  async () => {
    const {
      acquireSignerAuthorizationEvidence
    } = loadSubject();

    let called = false;

    const authorizeSignerIdentity = async () => {
      called = true;
      return true;
    };

    await assert.rejects(
      acquireSignerAuthorizationEvidence({
        prospectiveSignerIdentityEvidence:
          make1S35Evidence({
            signerAddress: "not-an-address"
          }),
        authorizeSignerIdentity
      })
    );

    assert.equal(called, false);
  }
);

test(
  "1S.36 rejects malformed transaction-envelope from before requesting authorization",
  async () => {
    const {
      acquireSignerAuthorizationEvidence
    } = loadSubject();

    let called = false;

    const upstream = make1S35Evidence();

    upstream.transactionEnvelope = {
      ...upstream.transactionEnvelope,
      from: "not-an-address"
    };

    const authorizeSignerIdentity = async () => {
      called = true;
      return true;
    };

    await assert.rejects(
      acquireSignerAuthorizationEvidence({
        prospectiveSignerIdentityEvidence:
          upstream,
        authorizeSignerIdentity
      })
    );

    assert.equal(called, false);
  }
);

test(
  "1S.36 propagates rejected authorization acquisition without manufacturing evidence",
  async () => {
    const {
      acquireSignerAuthorizationEvidence
    } = loadSubject();

    const failure = new Error(
      "authorization source unavailable"
    );

    await assert.rejects(
      acquireSignerAuthorizationEvidence({
        prospectiveSignerIdentityEvidence:
          make1S35Evidence(),
        authorizeSignerIdentity: async () => {
          throw failure;
        }
      }),
      (error) => error === failure
    );
  }
);

test(
  "1S.36 preserves exact upstream and envelope references",
  async () => {
    const {
      acquireSignerAuthorizationEvidence
    } = loadSubject();

    const upstream = make1S35Evidence();
    const envelope = upstream.transactionEnvelope;

    const evidence =
      await acquireSignerAuthorizationEvidence({
        prospectiveSignerIdentityEvidence:
          upstream,
        authorizeSignerIdentity:
          async () => true
      });

    assert.equal(
      evidence.prospectiveSignerIdentityEvidence,
      upstream
    );

    assert.equal(
      evidence.transactionEnvelope,
      envelope
    );

    assert.equal(
      evidence.transactionEnvelope,
      upstream.transactionEnvelope
    );
  }
);
