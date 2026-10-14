const test = require("node:test");
const assert = require("node:assert/strict");

const MODULE_PATH =
  "../scripts/utils/polygonV4ProspectiveSignerIdentityEvidence";

test(
  "1S.35 prospective signer identity evidence module exists",
  () => {
    assert.doesNotThrow(() => require(MODULE_PATH));
  }
);

test(
  "1S.35 binds injected signer address to frozen transaction envelope from",
  async () => {
    const {
      acquireProspectiveSignerIdentityEvidence
    } = require(MODULE_PATH);

    const expectedAddress =
      "0x1B786608D3F073e44910bB975413f97A11Dd7bcA";

    let getAddressCalls = 0;

    const getSignerAddress = async () => {
      getAddressCalls += 1;
      return expectedAddress;
    };

    const preSendSimulationEvidence = Object.freeze({
      transactionEnvelope: Object.freeze({
        from: expectedAddress
      }),
      currentTransactionPreSendSimulationReady: true,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

    const evidence =
      await acquireProspectiveSignerIdentityEvidence({
        preSendSimulationEvidence,
        getSignerAddress
      });

    assert.equal(getAddressCalls, 1);

    assert.equal(
      evidence.signerAddress,
      expectedAddress
    );

    assert.equal(
      evidence.transactionEnvelope,
      preSendSimulationEvidence.transactionEnvelope
    );

    assert.equal(
      evidence.currentTransactionPreSendSimulationEvidence,
      preSendSimulationEvidence
    );

    assert.equal(
      evidence.prospectiveSignerIdentityReady,
      true
    );

    assert.equal(evidence.liveExecutionAuthorized, false);
    assert.equal(evidence.signerAuthorized, false);
    assert.equal(evidence.broadcastAuthorized, false);
  }
);

test(
  "1S.35 fails closed when signer address does not match transaction envelope from",
  async () => {
    const {
      acquireProspectiveSignerIdentityEvidence
    } = require(MODULE_PATH);

    const preSendSimulationEvidence = Object.freeze({
      transactionEnvelope: Object.freeze({
        from:
          "0x1B786608D3F073e44910bB975413f97A11Dd7bcA"
      }),
      currentTransactionPreSendSimulationReady: true,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

    const getSignerAddress = async () =>
      "0x0000000000000000000000000000000000000001";

    await assert.rejects(
      acquireProspectiveSignerIdentityEvidence({
        preSendSimulationEvidence,
        getSignerAddress
      }),
      /signer|address|from|match/i
    );
  }
);

test(
  "1S.35 rejects upstream authorization drift",
  async () => {
    const {
      acquireProspectiveSignerIdentityEvidence
    } = require(MODULE_PATH);

    const getSignerAddress = async () => {
      throw new Error(
        "getSignerAddress must not be reached after upstream authorization drift"
      );
    };

    const preSendSimulationEvidence = Object.freeze({
      transactionEnvelope: Object.freeze({
        from:
          "0x1B786608D3F073e44910bB975413f97A11Dd7bcA"
      }),
      currentTransactionPreSendSimulationReady: true,
      liveExecutionAuthorized: false,
      signerAuthorized: true,
      broadcastAuthorized: false
    });

    await assert.rejects(
      acquireProspectiveSignerIdentityEvidence({
        preSendSimulationEvidence,
        getSignerAddress
      })
    );
  }
);

test(
  "1S.35 production utility owns no secret, signing, sending, or broadcast behavior",
  () => {
    const fs = require("node:fs");
    const path = require("node:path");

    const sourcePath = path.resolve(
      __dirname,
      "../scripts/utils/polygonV4ProspectiveSignerIdentityEvidence.js"
    );

    if (!fs.existsSync(sourcePath)) {
      return;
    }

    const source = fs.readFileSync(sourcePath, "utf8");

    const forbidden = [
      "PRIVATE_KEY",
      "process.env",
      "new ethers.Wallet",
      "new Wallet",
      "signTransaction",
      "sendTransaction",
      "sendRawTransaction",
      "broadcastTransaction",
      ".wait(",
      "initiateFlashloan"
    ];

    for (const pattern of forbidden) {
      assert.equal(
        source.includes(pattern),
        false,
        `forbidden production ownership: ${pattern}`
      );
    }
  }
);

test(
  "1S.35 rejects missing signer-address acquisition capability",
  async () => {
    const {
      acquireProspectiveSignerIdentityEvidence
    } = require(MODULE_PATH);

    const preSendSimulationEvidence = Object.freeze({
      transactionEnvelope: Object.freeze({
        from:
          "0x1B786608D3F073e44910bB975413f97A11Dd7bcA"
      }),
      currentTransactionPreSendSimulationReady: true,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

    await assert.rejects(
      acquireProspectiveSignerIdentityEvidence({
        preSendSimulationEvidence
      }),
      /getSignerAddress|function/i
    );
  }
);

test(
  "1S.35 rejects malformed prospective signer address",
  async () => {
    const {
      acquireProspectiveSignerIdentityEvidence
    } = require(MODULE_PATH);

    const preSendSimulationEvidence = Object.freeze({
      transactionEnvelope: Object.freeze({
        from:
          "0x1B786608D3F073e44910bB975413f97A11Dd7bcA"
      }),
      currentTransactionPreSendSimulationReady: true,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

    const getSignerAddress = async () => "not-an-address";

    await assert.rejects(
      acquireProspectiveSignerIdentityEvidence({
        preSendSimulationEvidence,
        getSignerAddress
      })
    );
  }
);

test(
  "1S.35 propagates signer-address acquisition failure without producing evidence",
  async () => {
    const {
      acquireProspectiveSignerIdentityEvidence
    } = require(MODULE_PATH);

    const expectedFailure =
      new Error("synthetic signer-address acquisition failure");

    const getSignerAddress = async () => {
      throw expectedFailure;
    };

    const preSendSimulationEvidence = Object.freeze({
      transactionEnvelope: Object.freeze({
        from:
          "0x1B786608D3F073e44910bB975413f97A11Dd7bcA"
      }),
      currentTransactionPreSendSimulationReady: true,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

    await assert.rejects(
      acquireProspectiveSignerIdentityEvidence({
        preSendSimulationEvidence,
        getSignerAddress
      }),
      expectedFailure
    );
  }
);

test(
  "1S.35 rejects evidence that is not pre-send-simulation ready before address acquisition",
  async () => {
    const {
      acquireProspectiveSignerIdentityEvidence
    } = require(MODULE_PATH);

    let calls = 0;

    const getSignerAddress = async () => {
      calls += 1;
      return "0x1B786608D3F073e44910bB975413f97A11Dd7bcA";
    };

    const preSendSimulationEvidence = Object.freeze({
      transactionEnvelope: Object.freeze({
        from:
          "0x1B786608D3F073e44910bB975413f97A11Dd7bcA"
      }),
      currentTransactionPreSendSimulationReady: false,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

    await assert.rejects(
      acquireProspectiveSignerIdentityEvidence({
        preSendSimulationEvidence,
        getSignerAddress
      })
    );

    assert.equal(calls, 0);
  }
);

test(
  "1S.35 rejects malformed transaction envelope before address acquisition",
  async () => {
    const {
      acquireProspectiveSignerIdentityEvidence
    } = require(MODULE_PATH);

    let calls = 0;

    const getSignerAddress = async () => {
      calls += 1;
      return "0x1B786608D3F073e44910bB975413f97A11Dd7bcA";
    };

    const preSendSimulationEvidence = Object.freeze({
      transactionEnvelope: null,
      currentTransactionPreSendSimulationReady: true,
      liveExecutionAuthorized: false,
      signerAuthorized: false,
      broadcastAuthorized: false
    });

    await assert.rejects(
      acquireProspectiveSignerIdentityEvidence({
        preSendSimulationEvidence,
        getSignerAddress
      })
    );

    assert.equal(calls, 0);
  }
);
