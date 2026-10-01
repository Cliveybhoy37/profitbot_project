"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const fs =
  require("node:fs");

const os =
  require("node:os");

const path =
  require("node:path");

const { ethers } =
  require("ethers");

const {
  POLICY_GAS_UNITS,
  SAFETY_RESERVE,
  MINIMUM_NET_PROFIT
} = require(
  "../scripts/research/runPolygonV4LiveQualification"
);

const {
  calculateGasCeiling,
  diagnosticForRow,
  stateFingerprint,
  appendObservation,
  shouldPrintHeartbeat
} = require(
  "../scripts/research/watchPolygonV4LiveOpportunities"
);

test(
  "gas ceiling mirrors protected minimum-profit policy",
  () => {
    const amountIn =
      ethers.utils.parseEther(
        "0.125"
      );

    const protectedFinalOutput =
      ethers.utils.parseEther(
        "0.141"
      );

    const result =
      calculateGasCeiling({
        amountIn,
        protectedFinalOutput,
        premiumBps: 5
      });

    const premium =
      amountIn
        .mul(5)
        .div(10000);

    const expectedBudget =
      protectedFinalOutput
        .sub(amountIn)
        .sub(premium)
        .sub(SAFETY_RESERVE)
        .sub(
          MINIMUM_NET_PROFIT
        );

    assert.equal(
      result.gasBudget
        .toString(),
      expectedBudget
        .toString()
    );

    assert.equal(
      result.maxGasPriceWei
        .toString(),
      expectedBudget
        .div(
          POLICY_GAS_UNITS
        )
        .toString()
    );

    assert.equal(
      result.affordable,
      true
    );
  }
);

test(
  "gas ceiling fails closed when protected output cannot fund policy",
  () => {
    const result =
      calculateGasCeiling({
        amountIn:
          ethers.utils
            .parseEther(
              "0.125"
            ),
        protectedFinalOutput:
          ethers.utils
            .parseEther(
              "0.130"
            ),
        premiumBps:
          5
      });

    assert.equal(
      result.affordable,
      false
    );

    assert.equal(
      result.gasBudget
        .toString(),
      "0"
    );

    assert.equal(
      result.maxGasPriceWei
        .toString(),
      "0"
    );
  }
);

test(
  "diagnostic never invents LIVE_READY",
  () => {
    const row =
      diagnosticForRow({
        spec: {
          id:
            "TEST_ROUTE"
        },
        result: {
          liveReady:
            false,
          stage:
            "PREFLIGHT",
          reason:
            "Candidate has negative expected net profit",
          premiumBps:
            5,
          gasPriceWei:
            ethers.utils
              .parseUnits(
                "20",
                "gwei"
              ),
          observation: {
            status:
              "QUOTE_OK",
            amounts: {
              start:
                ethers.utils
                  .parseEther(
                    "0.125"
                  )
                  .toString(),
              final:
                ethers.utils
                  .parseEther(
                    "0.145"
                  )
                  .toString()
            }
          },
          executionLegs: [
            {
              minAmountOut:
                ethers.BigNumber
                  .from(1)
            },
            {
              minAmountOut:
                ethers.BigNumber
                  .from(1)
            },
            {
              minAmountOut:
                ethers.utils
                  .parseEther(
                    "0.144"
                  )
            }
          ]
        }
      });

    assert.equal(
      row.liveReady,
      false
    );

    assert.equal(
      row.stage,
      "PREFLIGHT"
    );

    assert.ok(
      row.maxGasPriceWei.gt(0)
    );
  }
);

test(
  "state fingerprint changes on qualification state, not market noise",
  () => {
    const base = {
      diagnostics: [
        {
          id: "A",
          stage:
            "PREFLIGHT",
          reason:
            "negative",
          liveReady:
            false
        }
      ],
      ready: []
    };

    const gasChanged = {
      diagnostics: [
        {
          ...base
            .diagnostics[0],
          gasPriceWei:
            ethers.BigNumber
              .from(999)
        }
      ],
      ready: []
    };

    assert.equal(
      stateFingerprint(base),
      stateFingerprint(
        gasChanged
      )
    );

    const ready = {
      diagnostics: [
        {
          id: "A",
          stage:
            "QUALIFIED",
          reason:
            null,
          liveReady:
            true
        }
      ],
      ready: [
        {
          id: "A"
        }
      ]
    };

    assert.notEqual(
      stateFingerprint(base),
      stateFingerprint(
        ready
      )
    );
  }
);


test(
  "heartbeat prints only on quiet configured intervals",
  () => {
    assert.equal(
      shouldPrintHeartbeat({
        iteration: 10,
        heartbeatEvery: 10,
        initial: false,
        changed: false,
        liveReady: false
      }),
      true
    );

    assert.equal(
      shouldPrintHeartbeat({
        iteration: 9,
        heartbeatEvery: 10,
        initial: false,
        changed: false,
        liveReady: false
      }),
      false
    );

    assert.equal(
      shouldPrintHeartbeat({
        iteration: 10,
        heartbeatEvery: 10,
        initial: true,
        changed: false,
        liveReady: false
      }),
      false
    );

    assert.equal(
      shouldPrintHeartbeat({
        iteration: 10,
        heartbeatEvery: 10,
        initial: false,
        changed: true,
        liveReady: false
      }),
      false
    );

    assert.equal(
      shouldPrintHeartbeat({
        iteration: 10,
        heartbeatEvery: 10,
        initial: false,
        changed: false,
        liveReady: true
      }),
      false
    );
  }
);

test(
  "heartbeat policy rejects invalid intervals",
  () => {
    assert.throws(
      () =>
        shouldPrintHeartbeat({
          iteration: 1,
          heartbeatEvery: 0,
          initial: false,
          changed: false,
          liveReady: false
        }),
      /heartbeatEvery must be a positive safe integer/
    );
  }
);

test(
  "observation logger appends durable JSONL records",
  () => {
    const tempDir =
      fs.mkdtempSync(
        path.join(
          os.tmpdir(),
          "polygon-v4-watcher-"
        )
      );

    const observationLog =
      path.join(
        tempDir,
        "nested",
        "observations.jsonl"
      );

    const summary = {
      quoteBlock: 123456,
      policySnapshot: {
        currentBlock: 123456,
        gasPriceWei:
          ethers.utils.parseUnits(
            "25",
            "gwei"
          ),
        premiumBps: 5
      },
      diagnostics: [
        {
          id: "TEST_ROUTE",
          liveReady: false,
          stage: "PREFLIGHT",
          reason:
            "Candidate has negative expected net profit",
          amountIn:
            ethers.utils.parseEther(
              "0.125"
            ),
          finalAmount:
            ethers.utils.parseEther(
              "0.140"
            ),
          grossDelta:
            ethers.utils.parseEther(
              "0.015"
            ),
          protectedFinalOutput:
            ethers.utils.parseEther(
              "0.139"
            ),
          gasPriceWei:
            ethers.utils.parseUnits(
              "25",
              "gwei"
            ),
          gasBudget:
            ethers.utils.parseEther(
              "0.010"
            ),
          maxGasPriceWei:
            ethers.utils.parseUnits(
              "14",
              "gwei"
            ),
          aboveCeilingWei:
            ethers.utils.parseUnits(
              "11",
              "gwei"
            )
        }
      ],
      ready: []
    };

    try {
      appendObservation(
        summary,
        observationLog
      );

      appendObservation(
        summary,
        observationLog
      );

      const lines =
        fs.readFileSync(
          observationLog,
          "utf8"
        )
          .trim()
          .split("\n");

      assert.equal(
        lines.length,
        2
      );

      const first =
        JSON.parse(
          lines[0]
        );

      const second =
        JSON.parse(
          lines[1]
        );

      assert.equal(
        first.quoteBlock,
        123456
      );

      assert.equal(
        first.policySnapshot
          .gasPriceWei,
        ethers.utils
          .parseUnits(
            "25",
            "gwei"
          )
          .toString()
      );

      assert.equal(
        first.diagnostics[0]
          .id,
        "TEST_ROUTE"
      );

      assert.equal(
        first.diagnostics[0]
          .grossDelta,
        ethers.utils
          .parseEther(
            "0.015"
          )
          .toString()
      );

      assert.deepEqual(
        first.liveReadyIds,
        []
      );

      assert.equal(
        first.broadcast,
        false
      );

      assert.equal(
        second.quoteBlock,
        123456
      );
    } finally {
      fs.rmSync(
        tempDir,
        {
          recursive: true,
          force: true
        }
      );
    }
  }
);
