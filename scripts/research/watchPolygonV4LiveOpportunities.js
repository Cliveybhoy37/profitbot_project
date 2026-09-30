"use strict";

// Read-only Polygon V4 opportunity watcher.
//
// Repeatedly runs the existing live candidate-set qualification.
// This file NEVER creates a signer, sends a transaction, approves
// tokens, or broadcasts.
//
// LIVE_READY is authoritative only when returned by the existing
// qualification/preflight pipeline.
//
// The gas ceiling calculated here is diagnostic only.

const fs = require("fs");
const path = require("path");

const { ethers } =
  require("ethers");

const {
  CHAIN_ID,
  POLICY_GAS_UNITS,
  SAFETY_RESERVE,
  MINIMUM_NET_PROFIT
} = require(
  "./runPolygonV4LiveQualification"
);

const {
  qualifyCandidateSet
} = require(
  "./runPolygonV4LiveCandidateSet"
);

const DEFAULT_POLL_MS =
  30000;

const DEFAULT_EVIDENCE_DIR =
  path.join(
    "research",
    "runtime",
    "polygon-v4",
    "live-opportunities"
  );

function requirePositiveInteger(
  value,
  label
) {
  if (
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `${label} must be a positive safe integer`
    );
  }

  return value;
}

function requireBigNumber(
  value,
  label
) {
  if (
    !ethers.BigNumber.isBigNumber(
      value
    )
  ) {
    throw new Error(
      `${label} must be a BigNumber`
    );
  }

  return value;
}

function calculateGasCeiling({
  amountIn,
  protectedFinalOutput,
  premiumBps,
  policyGasUnits =
    POLICY_GAS_UNITS,
  safetyReserve =
    SAFETY_RESERVE,
  minimumNetProfit =
    MINIMUM_NET_PROFIT
}) {
  const start =
    requireBigNumber(
      amountIn,
      "amountIn"
    );

  const protectedOutput =
    requireBigNumber(
      protectedFinalOutput,
      "protectedFinalOutput"
    );

  const gasUnits =
    requireBigNumber(
      policyGasUnits,
      "policyGasUnits"
    );

  const reserve =
    requireBigNumber(
      safetyReserve,
      "safetyReserve"
    );

  const minimumProfit =
    requireBigNumber(
      minimumNetProfit,
      "minimumNetProfit"
    );

  if (
    !Number.isSafeInteger(
      premiumBps
    ) ||
    premiumBps < 0 ||
    premiumBps >= 10000
  ) {
    throw new Error(
      "premiumBps must be a safe integer from 0 to 9999"
    );
  }

  if (start.lte(0)) {
    throw new Error(
      "amountIn must be positive"
    );
  }

  if (protectedOutput.lte(0)) {
    throw new Error(
      "protectedFinalOutput must be positive"
    );
  }

  if (gasUnits.lte(0)) {
    throw new Error(
      "policyGasUnits must be positive"
    );
  }

  const premium =
    start
      .mul(premiumBps)
      .div(10000);

  const fixedCosts =
    start
      .add(premium)
      .add(reserve)
      .add(minimumProfit);

  if (
    protectedOutput.lte(
      fixedCosts
    )
  ) {
    return {
      affordable: false,
      premium,
      gasBudget:
        ethers.constants.Zero,
      maxGasPriceWei:
        ethers.constants.Zero
    };
  }

  const gasBudget =
    protectedOutput.sub(
      fixedCosts
    );

  const maxGasPriceWei =
    gasBudget.div(
      gasUnits
    );

  return {
    affordable:
      maxGasPriceWei.gt(0),
    premium,
    gasBudget,
    maxGasPriceWei
  };
}

function diagnosticForRow({
  spec,
  result
}) {
  const observation =
    result?.observation;

  const executionLegs =
    result?.executionLegs;

  if (
    !observation ||
    observation.status !==
      "QUOTE_OK" ||
    !Array.isArray(
      executionLegs
    ) ||
    executionLegs.length !== 3 ||
    !result.gasPriceWei ||
    !Number.isSafeInteger(
      result.premiumBps
    )
  ) {
    return {
      id:
        spec.id,
      liveReady:
        Boolean(
          result?.liveReady
        ),
      stage:
        result?.stage ||
        "UNKNOWN",
      reason:
        result?.reason ||
        result?.status ||
        result?.failedLeg ||
        "NO_DIAGNOSTIC"
    };
  }

  const amountIn =
    ethers.BigNumber.from(
      observation.amounts.start
    );

  const finalAmount =
    ethers.BigNumber.from(
      observation.amounts.final
    );

  const grossDelta =
    finalAmount.sub(
      amountIn
    );

  const protectedFinalOutput =
    ethers.BigNumber.from(
      executionLegs[2]
        .minAmountOut
    );

  const ceiling =
    calculateGasCeiling({
      amountIn,
      protectedFinalOutput,
      premiumBps:
        result.premiumBps
    });

  const gasPriceWei =
    ethers.BigNumber.from(
      result.gasPriceWei
    );

  const aboveCeilingWei =
    gasPriceWei.gt(
      ceiling.maxGasPriceWei
    )
      ? gasPriceWei.sub(
          ceiling.maxGasPriceWei
        )
      : ethers.constants.Zero;

  return {
    id:
      spec.id,
    amountIn,
    finalAmount,
    grossDelta,
    protectedFinalOutput,
    premiumBps:
      result.premiumBps,
    gasPriceWei,
    gasBudget:
      ceiling.gasBudget,
    maxGasPriceWei:
      ceiling.maxGasPriceWei,
    aboveCeilingWei,
    liveReady:
      Boolean(
        result.liveReady
      ),
    stage:
      result.stage,
    reason:
      result.liveReady
        ? null
        : (
            result.reason ||
            result.status ||
            result.failedLeg ||
            "NOT_QUALIFIED"
          )
  };
}

function summarizeQualification(
  qualification
) {
  const diagnostics =
    qualification.rows.map(
      diagnosticForRow
    );

  const comparable =
    diagnostics.filter(
      row =>
        row.grossDelta &&
        row.maxGasPriceWei
    );

  let best = null;

  for (const row of comparable) {
    if (
      !best ||
      row.grossDelta.gt(
        best.grossDelta
      )
    ) {
      best = row;
    }
  }

  const ready =
    diagnostics.filter(
      row =>
        row.liveReady
    );

  return {
    quoteBlock:
      qualification.quoteBlock,
    policySnapshot:
      qualification.policySnapshot,
    diagnostics,
    best,
    ready
  };
}

function stateFingerprint(
  summary
) {
  return JSON.stringify({
    ready:
      summary.ready.map(
        row => row.id
      ),
    stages:
      summary.diagnostics.map(
        row => [
          row.id,
          row.stage,
          row.reason
        ]
      )
  });
}

function serializableSummary(
  summary
) {
  function bn(value) {
    if (
      ethers.BigNumber
        .isBigNumber(value)
    ) {
      return value.toString();
    }

    return value;
  }

  return {
    capturedAt:
      new Date().toISOString(),

    quoteBlock:
      summary.quoteBlock,

    policySnapshot: {
      currentBlock:
        summary.policySnapshot
          .currentBlock,
      gasPriceWei:
        bn(
          summary.policySnapshot
            .gasPriceWei
        ),
      premiumBps:
        summary.policySnapshot
          .premiumBps
    },

    diagnostics:
      summary.diagnostics.map(
        row => ({
          ...row,
          amountIn:
            bn(row.amountIn),
          finalAmount:
            bn(row.finalAmount),
          grossDelta:
            bn(row.grossDelta),
          protectedFinalOutput:
            bn(
              row.protectedFinalOutput
            ),
          gasPriceWei:
            bn(row.gasPriceWei),
          gasBudget:
            bn(row.gasBudget),
          maxGasPriceWei:
            bn(
              row.maxGasPriceWei
            ),
          aboveCeilingWei:
            bn(
              row.aboveCeilingWei
            )
        })
      ),

    liveReadyIds:
      summary.ready.map(
        row => row.id
      ),

    broadcast:
      false
  };
}

function saveEvidence(
  summary,
  evidenceDir =
    DEFAULT_EVIDENCE_DIR
) {
  fs.mkdirSync(
    evidenceDir,
    {
      recursive: true
    }
  );

  const file =
    path.join(
      evidenceDir,
      `block-${summary.quoteBlock}.json`
    );

  fs.writeFileSync(
    file,
    JSON.stringify(
      serializableSummary(
        summary
      ),
      null,
      2
    ) + "\n"
  );

  return file;
}

function formatEther(value) {
  return ethers.utils.formatEther(
    value
  );
}

function formatGwei(value) {
  return ethers.utils.formatUnits(
    value,
    "gwei"
  );
}

function printSummary(
  summary,
  {
    stateChange = false
  } = {}
) {
  console.log();

  console.log(
    stateChange
      ? "===== STATE CHANGE ====="
      : "===== WATCHER SNAPSHOT ====="
  );

  console.log(
    "Block:",
    summary.quoteBlock
  );

  console.log(
    "Gas gwei:",
    formatGwei(
      summary.policySnapshot
        .gasPriceWei
    )
  );

  console.log(
    "Aave premium bps:",
    summary.policySnapshot
      .premiumBps
  );

  if (summary.best) {
    console.log(
      "Best gross candidate:",
      summary.best.id
    );

    console.log(
      "Best gross WPOL:",
      formatEther(
        summary.best.grossDelta
      )
    );

    console.log(
      "Protected gas ceiling gwei:",
      formatGwei(
        summary.best
          .maxGasPriceWei
      )
    );

    console.log(
      "Gas above ceiling gwei:",
      formatGwei(
        summary.best
          .aboveCeilingWei
      )
    );
  }

  for (
    const row of
      summary.diagnostics
  ) {
    console.log(
      [
        row.id,
        `LIVE_READY=${row.liveReady}`,
        `stage=${row.stage}`,
        row.maxGasPriceWei
          ? `ceiling=${formatGwei(
              row.maxGasPriceWei
            )}gwei`
          : "",
        row.reason
          ? `reason=${row.reason}`
          : ""
      ]
        .filter(Boolean)
        .join(" | ")
    );
  }

  console.log(
    "BROADCAST=false"
  );
}

function sleep(ms) {
  return new Promise(
    resolve =>
      setTimeout(resolve, ms)
  );
}

function shouldPrintHeartbeat({
  iteration,
  heartbeatEvery,
  initial,
  changed,
  liveReady
}) {
  requirePositiveInteger(
    iteration,
    "iteration"
  );

  requirePositiveInteger(
    heartbeatEvery,
    "heartbeatEvery"
  );

  if (
    initial ||
    changed ||
    liveReady
  ) {
    return false;
  }

  return (
    iteration %
      heartbeatEvery ===
    0
  );
}

function printHeartbeat(
  summary
) {
  const best =
    summary.best;

  const parts = [
    "WATCHING",
    `block=${summary.quoteBlock}`,
    `gas=${formatGwei(
      summary.policySnapshot
        .gasPriceWei
    )}gwei`
  ];

  if (best) {
    parts.push(
      `best=${best.id}`
    );

    parts.push(
      `gross=${formatEther(
        best.grossDelta
      )}WPOL`
    );

    parts.push(
      `ceiling=${formatGwei(
        best.maxGasPriceWei
      )}gwei`
    );
  }

  parts.push(
    "LIVE_READY=false"
  );

  parts.push(
    "BROADCAST=false"
  );

  console.log(
    parts.join(" | ")
  );
}

async function watchOpportunities({
  provider,
  pollMs =
    DEFAULT_POLL_MS,
  maxIterations =
    Infinity,
  evidenceDir =
    DEFAULT_EVIDENCE_DIR,
  heartbeatEvery = 10
}) {
  if (!provider) {
    throw new Error(
      "provider required"
    );
  }

  requirePositiveInteger(
    pollMs,
    "pollMs"
  );

  requirePositiveInteger(
    heartbeatEvery,
    "heartbeatEvery"
  );

  if (
    maxIterations !==
      Infinity &&
    (
      !Number.isSafeInteger(
        maxIterations
      ) ||
      maxIterations <= 0
    )
  ) {
    throw new Error(
      "maxIterations must be positive or Infinity"
    );
  }

  let previousFingerprint =
    null;

  for (
    let iteration = 1;
    iteration <= maxIterations;
    iteration += 1
  ) {
    const qualification =
      await qualifyCandidateSet({
        provider
      });

    const summary =
      summarizeQualification(
        qualification
      );

    const fingerprint =
      stateFingerprint(
        summary
      );

    const initial =
      previousFingerprint ===
        null;

    const changed =
      !initial &&
      fingerprint !==
        previousFingerprint;

    const liveReady =
      summary.ready.length > 0;

    if (
      initial ||
      changed ||
      liveReady
    ) {
      printSummary(
        summary,
        {
          stateChange:
            changed
        }
      );
    } else if (
      shouldPrintHeartbeat({
        iteration,
        heartbeatEvery,
        initial,
        changed,
        liveReady
      })
    ) {
      printHeartbeat(
        summary
      );
    }

    if (liveReady) {
      const file =
        saveEvidence(
          summary,
          evidenceDir
        );

      console.log();
      console.log(
        "LIVE_READY detected."
      );

      console.log(
        "Evidence:",
        file
      );

      console.log(
        "WATCHER_STOPPED=true"
      );

      console.log(
        "BROADCAST=false"
      );

      return {
        liveReady: true,
        summary,
        evidenceFile:
          file
      };
    }

    previousFingerprint =
      fingerprint;

    if (
      iteration <
        maxIterations
    ) {
      await sleep(
        pollMs
      );
    }
  }

  return {
    liveReady: false,
    summary: null,
    evidenceFile: null
  };
}

async function main() {
  const rpc =
    process.env.INFURA_POLYGON;

  if (!rpc) {
    throw new Error(
      "INFURA_POLYGON is not set"
    );
  }

  const rawPollMs =
    process.env
      .POLYGON_V4_WATCH_POLL_MS;

  const pollMs =
    rawPollMs
      ? Number(rawPollMs)
      : DEFAULT_POLL_MS;

  requirePositiveInteger(
    pollMs,
    "POLYGON_V4_WATCH_POLL_MS"
  );

  const provider =
    new ethers.providers
      .JsonRpcProvider(
        rpc,
        CHAIN_ID
      );

  console.log(
    "===== POLYGON V4 OPPORTUNITY WATCHER ====="
  );

  console.log(
    "Provider only / NO SIGNER / NO TRANSACTION"
  );

  console.log(
    "Poll interval ms:",
    pollMs
  );

  console.log(
    "Policy gas units:",
    POLICY_GAS_UNITS
      .toString()
  );

  console.log(
    "Safety reserve WPOL:",
    formatEther(
      SAFETY_RESERVE
    )
  );

  console.log(
    "Minimum net profit WPOL:",
    formatEther(
      MINIMUM_NET_PROFIT
    )
  );

  console.log(
    "BROADCAST=false"
  );

  await watchOpportunities({
    provider,
    pollMs
  });
}

if (require.main === module) {
  main().catch(error => {
    console.error(
      "WATCHER_FAILED",
      error?.code ||
      error?.name ||
      "UNKNOWN"
    );

    console.error(
      error?.message ||
      "Unknown failure"
    );

    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_POLL_MS,
  DEFAULT_EVIDENCE_DIR,
  calculateGasCeiling,
  diagnosticForRow,
  summarizeQualification,
  stateFingerprint,
  serializableSummary,
  saveEvidence,
  shouldPrintHeartbeat,
  printHeartbeat,
  watchOpportunities
};
