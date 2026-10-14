"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  PROTECTED_QUALIFICATION_RUNTIME_POLICY
} = require(
  "../scripts/utils/polygonV4ProtectedQualificationRuntimePolicy"
);

test(
  "exports exact protected qualification runtime policy",
  () => {
    const policy =
      PROTECTED_QUALIFICATION_RUNTIME_POLICY;

    assert.equal(policy.chainId, 137);

    assert.equal(
      policy.route.startToken,
      "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"
    );

    assert.equal(
      policy.route.entryToken,
      "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"
    );

    assert.equal(
      policy.route.exitToken,
      "0xA3f751662e282E83EC3cBc387d225Ca56dD63D3A"
    );

    assert.equal(
      policy.qualification.slippageBps,
      50
    );

    assert.equal(
      policy.qualification.maxSlippageBps,
      100
    );

    assert.equal(
      policy.qualification.maxAgeBlocks,
      3
    );

    assert.equal(
      policy.qualification.deadlineSeconds,
      300
    );

    assert.equal(
      policy.qualification.policyGasUnits.toString(),
      "700000"
    );

    assert.equal(
      policy.qualification.safetyReserveWei.toString(),
      "1000000000000000"
    );

    assert.equal(
      policy.qualification.minimumNetProfitWei.toString(),
      "5000000000000000"
    );
  }
);

test(
  "exports exact protected operational cadence policy",
  () => {
    const operational =
      PROTECTED_QUALIFICATION_RUNTIME_POLICY
        .operational;

    assert.deepEqual(
      operational,
      {
        count: 2,
        minimumBlockGap: 1,
        maxAttempts: 3,
        maxCycles: 2,
        waitMs: 5000
      }
    );
  }
);

test(
  "keeps conservative policy gas distinct from execution gas evidence",
  () => {
    const policy =
      PROTECTED_QUALIFICATION_RUNTIME_POLICY;

    assert.equal(
      policy.provenance.policyGasUnits,
      "CONSERVATIVE_QUALIFICATION_POLICY"
    );

    assert.equal(
      policy.provenance.executionGasEvidence,
      "REQUIRED_SEPARATELY"
    );

    assert.equal(
      policy.qualification.policyGasUnits.toString(),
      "700000"
    );

    assert.notEqual(
      policy.qualification.policyGasUnits.toString(),
      "652106"
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        policy,
        "gasEvidence"
      ),
      false
    );
  }
);

test(
  "exports structurally immutable runtime policy",
  () => {
    const policy =
      PROTECTED_QUALIFICATION_RUNTIME_POLICY;

    assert.equal(
      Object.isFrozen(policy),
      true
    );

    assert.equal(
      Object.isFrozen(policy.route),
      true
    );

    assert.equal(
      Object.isFrozen(policy.qualification),
      true
    );

    assert.equal(
      Object.isFrozen(policy.operational),
      true
    );

    assert.equal(
      Object.isFrozen(policy.provenance),
      true
    );

    assert.throws(
      () => {
        policy.chainId = 1;
      },
      TypeError
    );

    assert.throws(
      () => {
        policy.qualification.slippageBps = 100;
      },
      TypeError
    );
  }
);

test(
  "contains no provider signer transaction broadcast or gas-evidence acquisition behavior",
  () => {
    const source =
      fs.readFileSync(
        path.join(
          __dirname,
          "../scripts/utils/polygonV4ProtectedQualificationRuntimePolicy.js"
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
      "validateForkReceiptGasEvidence"
    ];

    for (const token of forbidden) {
      assert.equal(
        source.includes(token),
        false,
        `runtime policy must not contain ${token}`
      );
    }
  }
);
