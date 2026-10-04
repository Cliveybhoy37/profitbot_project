"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const SUBJECT =
  "../scripts/utils/polygonV4ProtectedPeakQualificationOperationalComposition";

function loadSubject() {
  return require(SUBJECT)
    .runProtectedPeakQualificationOperationalComposition;
}

function harness() {
  return {
    provider: {
      id: "provider"
    },

    operationalResult: {
      complete: true,
      id: "operational-result"
    },

    gasEvidence: {
      id: "gas-evidence"
    },

    amounts: [
      "100",
      "200"
    ],

    count: 2,
    minimumBlockGap: 1,
    maxAttempts: 3,
    maxCycles: 2,
    waitMs: 5000,

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

    safetyReserveWei: {
      id: "safety-reserve"
    },

    minimumNetProfitWei: {
      id: "minimum-net-profit"
    }
  };
}

test(
  "runs operational cadence once and qualifies its exact result with the same provider",
  async () => {
    const runComposition =
      loadSubject();

    const h =
      harness();

    let cadenceCalls = 0;
    let qualificationCalls = 0;
    let cadenceArgs;
    let qualificationArgs;

    const expected = {
      qualified: true,
      stage: "QUALIFIED"
    };

    const result =
      await runComposition({
        provider: h.provider,

        count: h.count,
        minimumBlockGap:
          h.minimumBlockGap,
        maxAttempts:
          h.maxAttempts,
        maxCycles:
          h.maxCycles,
        waitMs:
          h.waitMs,
        amounts:
          h.amounts,

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

        runTimedCadenceFn:
          async args => {
            cadenceCalls += 1;
            cadenceArgs = args;
            return h.operationalResult;
          },

        qualifyWithExecutionContextFn:
          async args => {
            qualificationCalls += 1;
            qualificationArgs = args;
            return expected;
          }
      });

    assert.equal(
      cadenceCalls,
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

    assert.ok(cadenceArgs);
    assert.ok(qualificationArgs);

    assert.strictEqual(
      cadenceArgs.provider,
      h.provider
    );

    assert.strictEqual(
      qualificationArgs.provider,
      h.provider
    );

    assert.strictEqual(
      qualificationArgs.operationalResult,
      h.operationalResult
    );

    assert.strictEqual(
      qualificationArgs.gasEvidence,
      h.gasEvidence
    );

    assert.deepEqual(
      cadenceArgs,
      {
        provider:
          h.provider,
        count:
          h.count,
        minimumBlockGap:
          h.minimumBlockGap,
        maxAttempts:
          h.maxAttempts,
        maxCycles:
          h.maxCycles,
        waitMs:
          h.waitMs,
        amounts:
          h.amounts
      }
    );

    assert.equal(
      qualificationArgs.startToken,
      h.startToken
    );

    assert.equal(
      qualificationArgs.entryToken,
      h.entryToken
    );

    assert.equal(
      qualificationArgs.exitToken,
      h.exitToken
    );

    assert.equal(
      qualificationArgs.slippageBps,
      h.slippageBps
    );

    assert.equal(
      qualificationArgs.maxSlippageBps,
      h.maxSlippageBps
    );

    assert.equal(
      qualificationArgs.maxAgeBlocks,
      h.maxAgeBlocks
    );

    assert.equal(
      qualificationArgs.deadlineSeconds,
      h.deadlineSeconds
    );

    assert.strictEqual(
      qualificationArgs.safetyReserveWei,
      h.safetyReserveWei
    );

    assert.strictEqual(
      qualificationArgs.minimumNetProfitWei,
      h.minimumNetProfitWei
    );
  }
);

test(
  "does not invent omitted operational amounts",
  async () => {
    const runComposition =
      loadSubject();

    const h =
      harness();

    let cadenceArgs;

    await runComposition({
      provider:
        h.provider,

      count:
        h.count,
      minimumBlockGap:
        h.minimumBlockGap,
      maxAttempts:
        h.maxAttempts,
      maxCycles:
        h.maxCycles,
      waitMs:
        h.waitMs,

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

      runTimedCadenceFn:
        async args => {
          cadenceArgs = args;
          return h.operationalResult;
        },

      qualifyWithExecutionContextFn:
        async () => ({
          qualified: true
        })
    });

    assert.equal(
      Object.prototype
        .hasOwnProperty.call(
          cadenceArgs,
          "amounts"
        ),
      false
    );
  }
);

test(
  "operational cadence failure prevents qualification and propagates unchanged",
  async () => {
    const runComposition =
      loadSubject();

    const h =
      harness();

    const failure =
      new Error(
        "operational cadence failed"
      );

    let qualificationCalls = 0;

    await assert.rejects(
      runComposition({
        provider:
          h.provider,

        runTimedCadenceFn:
          async () => {
            throw failure;
          },

        qualifyWithExecutionContextFn:
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
  "rejects invalid dependencies before operational cadence",
  async () => {
    const runComposition =
      loadSubject();

    let cadenceCalls = 0;

    await assert.rejects(
      runComposition({
        provider: {},

        runTimedCadenceFn:
          null,

        qualifyWithExecutionContextFn:
          async () => ({})
      }),
      /runTimedCadenceFn must be a function/
    );

    await assert.rejects(
      runComposition({
        provider: {},

        runTimedCadenceFn:
          async () => {
            cadenceCalls += 1;
            return {};
          },

        qualifyWithExecutionContextFn:
          null
      }),
      /qualifyWithExecutionContextFn must be a function/
    );

    assert.equal(
      cadenceCalls,
      0
    );
  }
);

test(
  "rejects missing operational result before qualification",
  async () => {
    const runComposition =
      loadSubject();

    const h =
      harness();

    let qualificationCalls = 0;

    await assert.rejects(
      runComposition({
        provider:
          h.provider,

        runTimedCadenceFn:
          async () => undefined,

        qualifyWithExecutionContextFn:
          async () => {
            qualificationCalls += 1;
            return {};
          }
      }),
      /operational result/i
    );

    assert.equal(
      qualificationCalls,
      0
    );
  }
);

test(
  "rejects non-object operational result before qualification",
  async () => {
    const runComposition =
      loadSubject();

    const h =
      harness();

    let qualificationCalls = 0;

    await assert.rejects(
      runComposition({
        provider:
          h.provider,

        runTimedCadenceFn:
          async () => "invalid",

        qualifyWithExecutionContextFn:
          async () => {
            qualificationCalls += 1;
            return {};
          }
      }),
      /operational result/i
    );

    assert.equal(
      qualificationCalls,
      0
    );
  }
);
