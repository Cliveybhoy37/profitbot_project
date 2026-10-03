"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  qualifyProviderProtectedPeakHandoff
} = require("../scripts/utils/polygonV4ProviderProtectedPeakQualification");

function makeInput(overrides = {}) {
  return {
    provider: { name: "provider" },
    operationalResult: { name: "operational" },
    startToken: "0x0000000000000000000000000000000000000001",
    entryToken: "0x0000000000000000000000000000000000000002",
    exitToken: "0x0000000000000000000000000000000000000003",
    slippageBps: 50,
    maxSlippageBps: 100,
    maxAgeBlocks: 3,
    estimatedGas: ethers.BigNumber.from("700000"),
    safetyReserveWei: ethers.BigNumber.from("1000000000000000"),
    minimumNetProfitWei: ethers.BigNumber.from("5000000000000000"),
    ...overrides
  };
}

test(
  "forwards exact provider to qualification policy acquisition",
  async () => {
    const input = makeInput();
    const policySnapshot = {
      currentBlock: 94834040,
      gasPriceWei: ethers.BigNumber.from("278281592114"),
      premiumBps: 5
    };
    let acquiredProvider;

    await qualifyProviderProtectedPeakHandoff({
      ...input,
      acquirePolicySnapshotFn: async ({ provider }) => {
        acquiredProvider = provider;
        return policySnapshot;
      },
      qualifyProtectedPeakHandoffFn: () => ({ qualified: true })
    });

    assert.strictEqual(acquiredProvider, input.provider);
  }
);

test(
  "forwards exact acquired policy snapshot identity to qualification",
  async () => {
    const input = makeInput();
    const policySnapshot = {
      currentBlock: 94834040,
      gasPriceWei: ethers.BigNumber.from("278281592114"),
      premiumBps: 5
    };
    let receivedPolicy;

    await qualifyProviderProtectedPeakHandoff({
      ...input,
      acquirePolicySnapshotFn: async () => policySnapshot,
      qualifyProtectedPeakHandoffFn: args => {
        receivedPolicy = args.policySnapshot;
        return { qualified: true };
      }
    });

    assert.strictEqual(receivedPolicy, policySnapshot);
  }
);

test(
  "forwards qualification inputs unchanged",
  async () => {
    const input = makeInput();
    const policySnapshot = {
      currentBlock: 94834040,
      gasPriceWei: ethers.BigNumber.from("278281592114"),
      premiumBps: 5
    };
    let received;

    await qualifyProviderProtectedPeakHandoff({
      ...input,
      acquirePolicySnapshotFn: async () => policySnapshot,
      qualifyProtectedPeakHandoffFn: args => {
        received = args;
        return { qualified: true };
      }
    });

    assert.strictEqual(received.operationalResult, input.operationalResult);
    assert.strictEqual(received.policySnapshot, policySnapshot);
    assert.strictEqual(received.startToken, input.startToken);
    assert.strictEqual(received.entryToken, input.entryToken);
    assert.strictEqual(received.exitToken, input.exitToken);
    assert.strictEqual(received.slippageBps, input.slippageBps);
    assert.strictEqual(received.maxSlippageBps, input.maxSlippageBps);
    assert.strictEqual(received.maxAgeBlocks, input.maxAgeBlocks);
    assert.strictEqual(received.estimatedGas, input.estimatedGas);
    assert.strictEqual(received.safetyReserveWei, input.safetyReserveWei);
    assert.strictEqual(received.minimumNetProfitWei, input.minimumNetProfitWei);
  }
);

test(
  "fails closed when policy acquisition rejects",
  async () => {
    const input = makeInput();
    let qualificationCalls = 0;

    await assert.rejects(
      qualifyProviderProtectedPeakHandoff({
        ...input,
        acquirePolicySnapshotFn: async () => {
          throw new Error("policy acquisition failed");
        },
        qualifyProtectedPeakHandoffFn: () => {
          qualificationCalls += 1;
          return { qualified: true };
        }
      }),
      /policy acquisition failed/
    );

    assert.equal(qualificationCalls, 0);
  }
);

test(
  "returns QUALIFIED result unchanged",
  async () => {
    const input = makeInput();
    const policySnapshot = {
      currentBlock: 94834040,
      gasPriceWei: ethers.BigNumber.from("278281592114"),
      premiumBps: 5
    };
    const expected = {
      qualified: true,
      stage: "QUALIFIED",
      marker: { preserved: true }
    };

    const result =
      await qualifyProviderProtectedPeakHandoff({
        ...input,
        acquirePolicySnapshotFn: async () => policySnapshot,
        qualifyProtectedPeakHandoffFn: () => expected
      });

    assert.strictEqual(result, expected);
  }
);

test(
  "returns PREFLIGHT rejection unchanged",
  async () => {
    const input = makeInput();
    const policySnapshot = {
      currentBlock: 94834044,
      gasPriceWei: ethers.BigNumber.from("1000000000000"),
      premiumBps: 5
    };
    const expected = {
      qualified: false,
      stage: "PREFLIGHT",
      reason: "candidate is stale"
    };

    const result =
      await qualifyProviderProtectedPeakHandoff({
        ...input,
        acquirePolicySnapshotFn: async () => policySnapshot,
        qualifyProtectedPeakHandoffFn: () => expected
      });

    assert.strictEqual(result, expected);
  }
);
