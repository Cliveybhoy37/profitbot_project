"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  validateNativeGasAffordabilityEvidence
} = require("../scripts/utils/polygonV4NativeGasAffordabilityEvidence");

const BN = (value) => ethers.BigNumber.from(value);
const SENDER = "0x1111111111111111111111111111111111111111";
const OTHER = "0x2222222222222222222222222222222222222";

function fixture({
  balanceWei = BN(201),
  nativeValue = BN(0)
} = {}) {
  const envelope = {
    chainId: 137,
    from: SENDER,
    gasLimit: BN(100),
    maxFeePerGas: BN(2),
    value: nativeValue
  };

  const economics = {
    finalTransactionEconomicsReady: true,
    transactionEnvelope: envelope,
    maximumGasExposure: BN(200),
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  };

  const balance = {
    chainId: 137,
    address: SENDER,
    nativeBalanceWei: balanceWei,
    balanceSource: "PENDING_NATIVE_BALANCE",
    nativeBalanceReady: true
  };

  return { economics, balance, envelope };
}

function validate(f) {
  return validateNativeGasAffordabilityEvidence({
    finalTransactionEconomicsEvidence: f.economics,
    nativeBalanceEvidence: f.balance
  });
}

test("accepts sufficient native POL balance", () => {
  const f = fixture();
  const result = validate(f);

  assert.equal(result.nativeGasAffordabilityReady, true);
  assert.equal(result.maximumNativeExposure.toString(), "200");
  assert.equal(result.signerAuthorized, false);
  assert.equal(Object.isFrozen(result), true);
});

test("accepts exact native POL affordability equality", () => {
  const f = fixture({ balanceWei: BN(200) });
  assert.equal(validate(f).nativeGasAffordabilityReady, true);
});

test("rejects insufficient native POL balance", () => {
  const f = fixture({ balanceWei: BN(199) });
  assert.throws(() => validate(f), /Insufficient native POL/);
});

test("includes native transaction value", () => {
  const f = fixture({
    balanceWei: BN(200),
    nativeValue: BN(1)
  });
  assert.throws(() => validate(f), /Insufficient native POL/);
});

test("rejects a different balance owner", () => {
  const f = fixture();
  f.balance.address = OTHER;
  assert.throws(() => validate(f), /sender or chain mismatch/);
});

test("rejects wrong balance network", () => {
  const f = fixture();
  f.balance.chainId = 1;
  assert.throws(() => validate(f), /sender or chain mismatch/);
});

test("rejects non-pending balance provenance", () => {
  const f = fixture();
  f.balance.balanceSource = "LATEST_NATIVE_BALANCE";
  assert.throws(() => validate(f), /provenance must be pending/);
});

test("rejects altered gas exposure", () => {
  const f = fixture();
  f.economics.maximumGasExposure = BN(199);
  assert.throws(() => validate(f), /gas exposure evidence mismatch/);
});

test("rejects unauthorized upstream economics", () => {
  const f = fixture();
  f.economics.signerAuthorized = true;
  assert.throws(() => validate(f), /must remain unauthorized/);
});

test("rejects negative native balance", () => {
  const f = fixture();
  f.balance.nativeBalanceWei = BN(-1);
  assert.throws(() => validate(f), /valid nonnegative amount/);
});
