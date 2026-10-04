"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const fs =
  require("node:fs");

const path =
  require("node:path");

const {
  PROTECTED_QUALIFICATION_RUNTIME_POLICY
} = require(
  "../scripts/utils/polygonV4ProtectedQualificationRuntimePolicy"
);

const SUBJECT =
  "../scripts/utils/polygonV4ProtectedQualificationRuntimeComposition";

function loadSubject() {
  return require(SUBJECT)
    .runProtectedQualificationRuntimeComposition;
}

test(
  "binds exact runtime policy to operational qualification while preserving provider and gas evidence identity",
  async () => {
    const runComposition =
      loadSubject();

    const provider = {
      id: "provider"
    };

    const gasEvidence = {
      id: "exact-gas-evidence"
    };

    const amounts = [
      "100",
      "200"
    ];

    const expected = {
      qualified: true
    };

    let calls = 0;
    let received;

    const result =
      await runComposition({
        provider,
        gasEvidence,
        amounts,

        runOperationalQualificationFn:
          async args => {
            calls += 1;
            received = args;
            return expected;
          }
      });

    assert.equal(
      calls,
      1
    );

    assert.strictEqual(
      result,
      expected
    );

    assert.strictEqual(
      received.provider,
      provider
    );

    assert.strictEqual(
      received.gasEvidence,
      gasEvidence
    );

    assert.strictEqual(
      received.amounts,
      amounts
    );

    const {
      route,
      qualification,
      operational
    } =
      PROTECTED_QUALIFICATION_RUNTIME_POLICY;

    assert.equal(
      received.startToken,
      route.startToken
    );

    assert.equal(
      received.entryToken,
      route.entryToken
    );

    assert.equal(
      received.exitToken,
      route.exitToken
    );

    assert.equal(
      received.count,
      operational.count
    );

    assert.equal(
      received.minimumBlockGap,
      operational.minimumBlockGap
    );

    assert.equal(
      received.maxAttempts,
      operational.maxAttempts
    );

    assert.equal(
      received.maxCycles,
      operational.maxCycles
    );

    assert.equal(
      received.waitMs,
      operational.waitMs
    );

    assert.equal(
      received.slippageBps,
      qualification.slippageBps
    );

    assert.equal(
      received.maxSlippageBps,
      qualification.maxSlippageBps
    );

    assert.equal(
      received.maxAgeBlocks,
      qualification.maxAgeBlocks
    );

    assert.equal(
      received.deadlineSeconds,
      qualification.deadlineSeconds
    );

    assert.strictEqual(
      received.safetyReserveWei,
      qualification.safetyReserveWei
    );

    assert.strictEqual(
      received.minimumNetProfitWei,
      qualification.minimumNetProfitWei
    );
  }
);

test(
  "does not invent omitted operational amounts",
  async () => {
    const runComposition =
      loadSubject();

    let received;

    await runComposition({
      provider: {
        id: "provider"
      },

      gasEvidence: {
        id: "gas-evidence"
      },

      runOperationalQualificationFn:
        async args => {
          received = args;
          return {
            qualified: true
          };
        }
    });

    assert.equal(
      Object.prototype
        .hasOwnProperty.call(
          received,
          "amounts"
        ),
      false
    );
  }
);

test(
  "keeps conservative policy gas separate from exact execution gas evidence",
  async () => {
    const runComposition =
      loadSubject();

    const gasEvidence = {
      gasUnits: {
        id: "measured-gas"
      }
    };

    let received;

    await runComposition({
      provider: {
        id: "provider"
      },

      gasEvidence,

      runOperationalQualificationFn:
        async args => {
          received = args;
          return {};
        }
    });

    assert.strictEqual(
      received.gasEvidence,
      gasEvidence
    );

    assert.equal(
      Object.prototype
        .hasOwnProperty.call(
          received,
          "estimatedGas"
        ),
      false
    );

    assert.equal(
      Object.prototype
        .hasOwnProperty.call(
          received,
          "policyGasUnits"
        ),
      false
    );

    assert.equal(
      PROTECTED_QUALIFICATION_RUNTIME_POLICY
        .qualification
        .policyGasUnits
        .toString(),
      "700000"
    );
  }
);

test(
  "rejects invalid composition dependency before delegation",
  async () => {
    const runComposition =
      loadSubject();

    await assert.rejects(
      runComposition({
        provider: {},
        gasEvidence: {},

        runOperationalQualificationFn:
          null
      }),
      /runOperationalQualificationFn must be a function/
    );
  }
);

test(
  "source contains no provider construction, historical evidence, legacy live qualification, signer, transaction, flashloan, or broadcast behavior",
  () => {
    const source =
      fs.readFileSync(
        path.join(
          __dirname,
          "../scripts/utils/polygonV4ProtectedQualificationRuntimeComposition.js"
        ),
        "utf8"
      );

    const forbidden = [
      "JsonRpcProvider",
      "WebSocketProvider",
      "getBlock(",
      "getBlockNumber(",
      "getGasPrice(",
      "getSigners(",
      "new ethers.Wallet",
      "sendTransaction(",
      "initiateFlashloan(",
      "HISTORICAL_EXECUTION_GAS_EVIDENCE",
      "validateHistoricalExecutionGasEvidence",
      "runPolygonV4LiveQualification",
      "runPolygonV4LiveCandidateSet"
    ];

    for (
      const token of forbidden
    ) {
      assert.equal(
        source.includes(token),
        false,
        `forbidden token present: ${token}`
      );
    }
  }
);
