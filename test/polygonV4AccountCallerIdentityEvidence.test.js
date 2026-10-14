"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { ethers } = require("ethers");

const {
  buildAccountCallerIdentityEvidence
} = require("../scripts/utils/polygonV4AccountCallerIdentityEvidence");

const OWNER =
  "0x1111111111111111111111111111111111111111";

const EXECUTOR =
  "0x2222222222222222222222222222222222222222";

function fixture() {
  const candidate = Object.freeze({
    amountIn: ethers.BigNumber.from("125000000000000000")
  });

  const executionLegs = Object.freeze([
    Object.freeze({ id: "leg-1" }),
    Object.freeze({ id: "leg-2" }),
    Object.freeze({ id: "leg-3" })
  ]);

  const executionPlan = Object.freeze({
    id: "exact-plan"
  });

  const executorContext = Object.freeze({
    executorCodeHash:
      "0x347dca910e2d4b7dd6b4ba19151fc2cd28e33c268cbb38511169a0b4a753facc"
  });

  const gasEvidence = Object.freeze({
    gasUnits: ethers.BigNumber.from("652106"),
    executorContext
  });

  const qualificationPolicySnapshot = Object.freeze({
    minimumNetProfitWei:
      ethers.utils.parseEther("0.005")
  });

  const qualifiedContext = Object.freeze({
    candidate,
    executionLegs,
    executionPlan,
    gasEvidence,
    policySnapshot:
      qualificationPolicySnapshot
  });

  const readinessEvidence = Object.freeze({
    executionEvidenceReady: true,
    gasEvidence,
    qualificationPolicySnapshot,
    qualifiedContext,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  });

  const chainEvidence = Object.freeze({
    chainId: 137
  });

  const deploymentEvidence = Object.freeze({
    executorAddress: EXECUTOR,
    executorCodeHash:
      executorContext.executorCodeHash
  });

  const currentStateEvidence = Object.freeze({
    chainEvidence,
    deploymentEvidence
  });

  const currentStatePreflightEvidence = Object.freeze({
    readinessEvidence,
    currentStateEvidence,
    candidate,
    executionLegs,
    executionPlan,
    gasEvidence,
    qualificationPolicySnapshot,
    qualifiedContext,
    currentStatePreflightReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  });

  const accountIdentityEvidence = Object.freeze({
    callerAddress: OWNER,
    ownerAddress: OWNER,
    executorAddress: EXECUTOR
  });

  return {
    candidate,
    executionLegs,
    executionPlan,
    gasEvidence,
    qualificationPolicySnapshot,
    qualifiedContext,
    readinessEvidence,
    currentStateEvidence,
    currentStatePreflightEvidence,
    accountIdentityEvidence
  };
}

test(
  "preserves exact 1S.27 and account identity evidence without reconstruction",
  () => {
    const f = fixture();

    const result =
      buildAccountCallerIdentityEvidence({
        currentStatePreflightEvidence:
          f.currentStatePreflightEvidence,
        accountIdentityEvidence:
          f.accountIdentityEvidence
      });

    assert.strictEqual(
      result.currentStatePreflightEvidence,
      f.currentStatePreflightEvidence
    );

    assert.strictEqual(
      result.accountIdentityEvidence,
      f.accountIdentityEvidence
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

    assert.strictEqual(
      result.gasEvidence,
      f.gasEvidence
    );

    assert.strictEqual(
      result.qualificationPolicySnapshot,
      f.qualificationPolicySnapshot
    );

    assert.strictEqual(
      result.qualifiedContext,
      f.qualifiedContext
    );
  }
);

test(
  "marks account/caller identity ready without authorizing execution, signer, or broadcast",
  () => {
    const f = fixture();

    const result =
      buildAccountCallerIdentityEvidence({
        currentStatePreflightEvidence:
          f.currentStatePreflightEvidence,
        accountIdentityEvidence:
          f.accountIdentityEvidence
      });

    assert.equal(
      result.accountCallerIdentityReady,
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
  "rejects missing current-state preflight evidence",
  () => {
    const f = fixture();

    assert.throws(
      () =>
        buildAccountCallerIdentityEvidence({
          accountIdentityEvidence:
            f.accountIdentityEvidence
        }),
      /current-state preflight/i
    );
  }
);

test(
  "rejects current-state evidence that is not ready",
  () => {
    const f = fixture();

    assert.throws(
      () =>
        buildAccountCallerIdentityEvidence({
          currentStatePreflightEvidence: {
            ...f.currentStatePreflightEvidence,
            currentStatePreflightReady: false
          },
          accountIdentityEvidence:
            f.accountIdentityEvidence
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

      assert.throws(
        () =>
          buildAccountCallerIdentityEvidence({
            currentStatePreflightEvidence: {
              ...f.currentStatePreflightEvidence,
              [field]: true
            },
            accountIdentityEvidence:
              f.accountIdentityEvidence
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
        ...f.currentStatePreflightEvidence
      };

      delete malformed[field];

      assert.throws(
        () =>
          buildAccountCallerIdentityEvidence({
            currentStatePreflightEvidence:
              malformed,
            accountIdentityEvidence:
              f.accountIdentityEvidence
          }),
        /authoriz/i
      );
    }
  );
}

test(
  "rejects missing account identity evidence",
  () => {
    const f = fixture();

    assert.throws(
      () =>
        buildAccountCallerIdentityEvidence({
          currentStatePreflightEvidence:
            f.currentStatePreflightEvidence
        }),
      /account identity/i
    );
  }
);

for (const [name, value] of [
  ["malformed caller", "not-an-address"],
  ["zero caller", ethers.constants.AddressZero]
]) {
  test(
    `rejects ${name} address`,
    () => {
      const f = fixture();

      assert.throws(
        () =>
          buildAccountCallerIdentityEvidence({
            currentStatePreflightEvidence:
              f.currentStatePreflightEvidence,
            accountIdentityEvidence: {
              ...f.accountIdentityEvidence,
              callerAddress: value
            }
          }),
        /caller/i
      );
    }
  );
}

for (const [name, value] of [
  ["malformed owner", "not-an-address"],
  ["zero owner", ethers.constants.AddressZero]
]) {
  test(
    `rejects ${name} address`,
    () => {
      const f = fixture();

      assert.throws(
        () =>
          buildAccountCallerIdentityEvidence({
            currentStatePreflightEvidence:
              f.currentStatePreflightEvidence,
            accountIdentityEvidence: {
              ...f.accountIdentityEvidence,
              ownerAddress: value
            }
          }),
        /owner/i
      );
    }
  );
}

test(
  "rejects caller that is not the deployed ProfitBot owner",
  () => {
    const f = fixture();

    assert.throws(
      () =>
        buildAccountCallerIdentityEvidence({
          currentStatePreflightEvidence:
            f.currentStatePreflightEvidence,
          accountIdentityEvidence: {
            ...f.accountIdentityEvidence,
            callerAddress:
              "0x3333333333333333333333333333333333333333"
          }
        }),
      /owner|caller/i
    );
  }
);

test(
  "accepts case differences for the same caller and owner address",
  () => {
    const f = fixture();

    const lower =
      "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";

    const upper =
      "0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD";

    const result =
      buildAccountCallerIdentityEvidence({
        currentStatePreflightEvidence:
          f.currentStatePreflightEvidence,
        accountIdentityEvidence: {
          ...f.accountIdentityEvidence,
          callerAddress: lower,
          ownerAddress: upper
        }
      });

    assert.equal(
      result.accountCallerIdentityReady,
      true
    );
  }
);

test(
  "rejects account evidence for a different executor deployment",
  () => {
    const f = fixture();

    assert.throws(
      () =>
        buildAccountCallerIdentityEvidence({
          currentStatePreflightEvidence:
            f.currentStatePreflightEvidence,
          accountIdentityEvidence: {
            ...f.accountIdentityEvidence,
            executorAddress:
              "0x4444444444444444444444444444444444444444"
          }
        }),
      /executor|deployment/i
    );
  }
);

test(
  "rejects malformed account-evidence executor address",
  () => {
    const f = fixture();

    assert.throws(
      () =>
        buildAccountCallerIdentityEvidence({
          currentStatePreflightEvidence:
            f.currentStatePreflightEvidence,
          accountIdentityEvidence: {
            ...f.accountIdentityEvidence,
            executorAddress: "bad-address"
          }
        }),
      /executor|deployment/i
    );
  }
);

test(
  "statically owns no provider, RPC, signer, wallet, transaction, or broadcast behavior",
  () => {
    const sourcePath = path.join(
      __dirname,
      "../scripts/utils/polygonV4AccountCallerIdentityEvidence.js"
    );

    const source = fs.readFileSync(
      sourcePath,
      "utf8"
    );

    const forbidden = [
      /JsonRpcProvider/,
      /WebSocketProvider/,
      /\.getCode\s*\(/,
      /\.call\s*\(/,
      /\.owner\s*\(/,
      /getSigner/,
      /privateKey/i,
      /mnemonic/i,
      /seed phrase/i,
      /new\s+ethers\.Wallet/,
      /Wallet\s*\(/,
      /populateTransaction/,
      /getTransactionCount/,
      /getFeeData/,
      /estimateGas/,
      /sendTransaction/,
      /sendRawTransaction/,
      /broadcastTransaction/,
      /\.wait\s*\(/,
      /initiateFlashloan\s*\(/,
      /hardhat_reset/,
      /evm_snapshot/,
      /evm_revert/
    ];

    for (const pattern of forbidden) {
      assert.doesNotMatch(source, pattern);
    }
  }
);
