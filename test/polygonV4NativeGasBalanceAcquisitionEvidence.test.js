"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  acquireNativeGasBalanceEvidence
} = require("../scripts/utils/polygonV4NativeGasBalanceAcquisitionEvidence");

const BN = (value) => ethers.BigNumber.from(value);
const SENDER = "0x1111111111111111111111111111111111111111";

function fixture({
  chainId = 137,
  balanceWei = BN(200),
  rejectBalance = false
} = {}) {
  const envelope = {
    chainId: 137,
    from: SENDER,
    gasLimit: BN(100),
    maxFeePerGas: BN(2),
    value: BN(0)
  };

  const economics = {
    finalTransactionEconomicsReady: true,
    transactionEnvelope: envelope,
    maximumGasExposure: BN(200),
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  };

  const calls = [];

  const provider = {
    async getNetwork() {
      calls.push(["getNetwork"]);
      return { chainId };
    },

    async getBalance(address, blockTag) {
      calls.push(["getBalance", address, blockTag]);

      if (rejectBalance) {
        throw new Error("mock provider balance failure");
      }

      return balanceWei;
    }
  };

  return { economics, envelope, provider, calls };
}

test("acquires exact sender pending POL balance", async () => {
  const f = fixture();

  const result = await acquireNativeGasBalanceEvidence({
    finalTransactionEconomicsEvidence: f.economics,
    provider: f.provider
  });

  assert.equal(result.nativeGasBalanceAcquisitionReady, true);
  assert.equal(
    result.nativeGasAffordabilityEvidence.nativeGasAffordabilityReady,
    true
  );
  assert.deepEqual(f.calls, [
    ["getNetwork"],
    ["getBalance", SENDER, "pending"]
  ]);
  assert.equal(result.signerAuthorized, false);
  assert.equal(result.broadcastAuthorized, false);
});

test("rejects insufficient pending POL balance", async () => {
  const f = fixture({ balanceWei: BN(199) });

  await assert.rejects(
    acquireNativeGasBalanceEvidence({
      finalTransactionEconomicsEvidence: f.economics,
      provider: f.provider
    }),
    /Insufficient native POL/
  );
});

test("rejects wrong provider network before balance query", async () => {
  const f = fixture({ chainId: 1 });

  await assert.rejects(
    acquireNativeGasBalanceEvidence({
      finalTransactionEconomicsEvidence: f.economics,
      provider: f.provider
    }),
    /must be Polygon chain 137/
  );

  assert.deepEqual(f.calls, [["getNetwork"]]);
});

test("rejects malformed pending balance", async () => {
  const f = fixture({ balanceWei: "200" });

  await assert.rejects(
    acquireNativeGasBalanceEvidence({
      finalTransactionEconomicsEvidence: f.economics,
      provider: f.provider
    }),
    /nonnegative BigNumber/
  );
});

test("propagates provider balance failures", async () => {
  const f = fixture({ rejectBalance: true });

  await assert.rejects(
    acquireNativeGasBalanceEvidence({
      finalTransactionEconomicsEvidence: f.economics,
      provider: f.provider
    }),
    /mock provider balance failure/
  );
});

test("rejects unauthorized economics before RPC", async () => {
  const f = fixture();
  f.economics.signerAuthorized = true;

  await assert.rejects(
    acquireNativeGasBalanceEvidence({
      finalTransactionEconomicsEvidence: f.economics,
      provider: f.provider
    }),
    /must remain unauthorized/
  );

  assert.deepEqual(f.calls, []);
});

test("rejects missing provider balance method", async () => {
  const f = fixture();
  delete f.provider.getBalance;

  await assert.rejects(
    acquireNativeGasBalanceEvidence({
      finalTransactionEconomicsEvidence: f.economics,
      provider: f.provider
    }),
    /Provider network and balance methods required/
  );
});
