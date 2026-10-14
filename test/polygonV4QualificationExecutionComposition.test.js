"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const { ethers } =
  require("ethers");

const SUBJECT =
  "../scripts/utils/polygonV4QualificationExecutionComposition";

function loadSubject() {
  return require(SUBJECT)
    .qualifyWithExecutionContext;
}

function harness() {
  const provider = {
    id: "provider"
  };

  const operationalResult = {
    id: "operational-result"
  };

  const gasEvidence = {
    id: "gas-evidence"
  };

  const policySnapshot = {
    currentBlock: 94709817,
    gasPriceWei:
      ethers.BigNumber.from(
        "30000000000"
      ),
    premiumBps: 9
  };

  const context = {
    policySnapshot,
    policyBlockTimestamp:
      2000000000,
    deadline:
      2000000300
  };

  return {
    provider,
    operationalResult,
    gasEvidence,
    policySnapshot,
    context,

    startToken:
      "0x0000000000000000000000000000000000000001",
    entryToken:
      "0x0000000000000000000000000000000000000002",
    exitToken:
      "0x0000000000000000000000000000000000000003",

    slippageBps: 50,
    maxSlippageBps: 100,
    maxAgeBlocks: 3,
    deadlineSeconds: 300,

    safetyReserveWei:
      ethers.utils.parseEther(
        "0.001"
      ),

    minimumNetProfitWei:
      ethers.utils.parseEther(
        "0.005"
      )
  };
}

test(
  "acquires one authoritative context and forwards its exact snapshot and deadline",
  async () => {
    const qualifyWithExecutionContext =
      loadSubject();

    const h =
      harness();

    let contextCalls = 0;
    let qualificationCalls = 0;
    let received = null;

    const expected = {
      qualified: true,
      stage: "QUALIFIED"
    };

    const result =
      await qualifyWithExecutionContext({
        provider: h.provider,
        operationalResult:
          h.operationalResult,
        startToken:
          h.startToken,
        entryToken:
          h.entryToken,
        exitToken:
          h.exitToken,
        slippageBps:
          h.slippageBps,
        maxSlippageBps:
          h.maxSlippageBps,
        maxAgeBlocks:
          h.maxAgeBlocks,
        deadlineSeconds:
          h.deadlineSeconds,
        gasEvidence:
          h.gasEvidence,
        safetyReserveWei:
          h.safetyReserveWei,
        minimumNetProfitWei:
          h.minimumNetProfitWei,

        acquireQualificationExecutionContextFn:
          async args => {
            contextCalls += 1;

            assert.strictEqual(
              args.provider,
              h.provider
            );

            assert.equal(
              args.deadlineSeconds,
              h.deadlineSeconds
            );

            return h.context;
          },

        qualifyExecutionPolicyPlanFn:
          async args => {
            qualificationCalls += 1;
            received = args;
            return expected;
          }
      });

    assert.equal(
      contextCalls,
      1
    );

    assert.equal(
      qualificationCalls,
      1
    );

    assert.strictEqual(
      result,
      expected
    );

    assert.ok(received);

    assert.strictEqual(
      received.provider,
      h.provider
    );

    assert.strictEqual(
      received.operationalResult,
      h.operationalResult
    );

    assert.strictEqual(
      received.gasEvidence,
      h.gasEvidence
    );

    assert.strictEqual(
      received.policySnapshot,
      h.context.policySnapshot,
      "exact context snapshot must be forwarded"
    );

    assert.equal(
      received.deadline,
      h.context.deadline
    );

    assert.equal(
      received.startToken,
      h.startToken
    );

    assert.equal(
      received.entryToken,
      h.entryToken
    );

    assert.equal(
      received.exitToken,
      h.exitToken
    );

    assert.equal(
      received.slippageBps,
      h.slippageBps
    );

    assert.equal(
      received.maxSlippageBps,
      h.maxSlippageBps
    );

    assert.equal(
      received.maxAgeBlocks,
      h.maxAgeBlocks
    );

    assert.strictEqual(
      received.safetyReserveWei,
      h.safetyReserveWei
    );

    assert.strictEqual(
      received.minimumNetProfitWei,
      h.minimumNetProfitWei
    );
  }
);

test(
  "does not qualify when context acquisition fails",
  async () => {
    const qualifyWithExecutionContext =
      loadSubject();

    const h =
      harness();

    const failure =
      new Error(
        "context acquisition failed"
      );

    let qualificationCalls = 0;

    await assert.rejects(
      qualifyWithExecutionContext({
        ...h,

        acquireQualificationExecutionContextFn:
          async () => {
            throw failure;
          },

        qualifyExecutionPolicyPlanFn:
          async () => {
            qualificationCalls += 1;
            return {};
          }
      }),
      error =>
        error === failure
    );

    assert.equal(
      qualificationCalls,
      0
    );
  }
);

test(
  "propagates execution-plan qualification failure unchanged",
  async () => {
    const qualifyWithExecutionContext =
      loadSubject();

    const h =
      harness();

    const failure =
      new Error(
        "qualification failed"
      );

    let contextCalls = 0;

    await assert.rejects(
      qualifyWithExecutionContext({
        ...h,

        acquireQualificationExecutionContextFn:
          async () => {
            contextCalls += 1;
            return h.context;
          },

        qualifyExecutionPolicyPlanFn:
          async () => {
            throw failure;
          }
      }),
      error =>
        error === failure
    );

    assert.equal(
      contextCalls,
      1
    );
  }
);

test(
  "rejects invalid dependencies before context acquisition",
  async () => {
    const qualifyWithExecutionContext =
      loadSubject();

    const h =
      harness();

    let contextCalls = 0;

    await assert.rejects(
      qualifyWithExecutionContext({
        ...h,

        acquireQualificationExecutionContextFn:
          async () => {
            contextCalls += 1;
            return h.context;
          },

        qualifyExecutionPolicyPlanFn:
          null
      }),
      /qualifyExecutionPolicyPlanFn/
    );

    assert.equal(
      contextCalls,
      0
    );
  }
);

test(
  "rejects missing qualification execution context before plan qualification",
  async () => {
    const qualifyWithExecutionContext =
      loadSubject();

    const h =
      harness();

    let qualificationCalls = 0;

    await assert.rejects(
      qualifyWithExecutionContext({
        ...h,

        acquireQualificationExecutionContextFn:
          async () => null,

        qualifyExecutionPolicyPlanFn:
          async () => {
            qualificationCalls += 1;
            return {};
          }
      }),
      /qualification execution context/i
    );

    assert.equal(
      qualificationCalls,
      0
    );
  }
);

test(
  "rejects missing authoritative policy snapshot before plan qualification",
  async () => {
    const qualifyWithExecutionContext =
      loadSubject();

    const h =
      harness();

    let qualificationCalls = 0;

    await assert.rejects(
      qualifyWithExecutionContext({
        ...h,

        acquireQualificationExecutionContextFn:
          async () => ({
            policyBlockTimestamp:
              h.context.policyBlockTimestamp,
            deadline:
              h.context.deadline
          }),

        qualifyExecutionPolicyPlanFn:
          async () => {
            qualificationCalls += 1;
            return {};
          }
      }),
      /policySnapshot/i
    );

    assert.equal(
      qualificationCalls,
      0
    );
  }
);

test(
  "rejects invalid context deadline before plan qualification",
  async () => {
    const qualifyWithExecutionContext =
      loadSubject();

    const h =
      harness();

    let qualificationCalls = 0;

    await assert.rejects(
      qualifyWithExecutionContext({
        ...h,

        acquireQualificationExecutionContextFn:
          async () => ({
            ...h.context,
            deadline: 0
          }),

        qualifyExecutionPolicyPlanFn:
          async () => {
            qualificationCalls += 1;
            return {};
          }
      }),
      /deadline/i
    );

    assert.equal(
      qualificationCalls,
      0
    );
  }
);
