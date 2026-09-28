"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const intervalSeconds = Number(
  process.env.OBSERVE_INTERVAL_SECONDS || "60"
);

const maxRuns = Number(
  process.env.OBSERVE_RUNS || "10"
);

const scanSizes =
  process.env.SCAN_SIZES || "0.05,0.1,0.25,0.5,1,2,5,10";

if (!Number.isFinite(intervalSeconds) || intervalSeconds < 1) {
  throw new Error("OBSERVE_INTERVAL_SECONDS must be >= 1");
}

if (!Number.isInteger(maxRuns) || maxRuns < 1) {
  throw new Error("OBSERVE_RUNS must be a positive integer");
}

const logDir = path.join(process.cwd(), "research");
fs.mkdirSync(logDir, { recursive: true });

const logPath = path.join(
  logDir,
  `balancer-edge-observer-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.log`
);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractBestGrossEdge(output) {
  const blockMatch = output.match(
    /Polygon snapshot block:\s*(\d+)/
  );

  const signalSection =
    output.split("GROSS-POSITIVE RESEARCH SIGNALS")[1] || "";

  const candidateBlocks = signalSection.split(/\n#\d+\n/);
  const candidates = [];

  for (const block of candidateBlocks) {
    const pool = block.match(/Pool:\s*(.+)/);
    const route = block.match(/Route:\s*(.+)/);
    const amount = block.match(/Amount in:\s*(\S+)\s+USDC_E/);
    const grossBps = block.match(/Gross edge:\s*([0-9.]+)\s+bps/);

    if (!pool || !route || !amount || !grossBps) {
      continue;
    }

    candidates.push({
      pool: pool[1].trim(),
      route: route[1].trim(),
      amount: amount[1],
      grossBps: Number(grossBps[1])
    });
  }

  if (candidates.length === 0) {
    return {
      block: blockMatch ? blockMatch[1] : "unknown",
      summary: "BEST EDGE | none gross-positive"
    };
  }

  candidates.sort((a, b) => b.grossBps - a.grossBps);

  const best = candidates[0];
  const shortfall = Math.max(0, 5 - best.grossBps);

  return {
    block: blockMatch ? blockMatch[1] : "unknown",
    summary: [
      "BEST EDGE",
      `block ${blockMatch ? blockMatch[1] : "unknown"}`,
      `${best.grossBps.toFixed(2)} bps`,
      `${best.amount} USDC_E`,
      best.pool,
      best.route,
      `premium shortfall ${shortfall.toFixed(2)} bps`
    ].join(" | ")
  };
}

(async () => {
  console.log("========================================");
  console.log("BALANCER EDGE OBSERVER");
  console.log("========================================");
  console.log("Runs:", maxRuns);
  console.log("Interval:", intervalSeconds, "seconds");
  console.log("Sizes:", scanSizes, "USDC_E");
  console.log("Log:", logPath);
  console.log("Live execution: OFF");

  for (let run = 1; run <= maxRuns; run += 1) {
    const timestamp = new Date().toISOString();

    console.log("");
    console.log(
      `[${timestamp}] observation ${run}/${maxRuns}`
    );

    const result = spawnSync(
      process.execPath,
      ["scripts/discoverBalancerDynamicEdges.js"],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          SCAN_SIZES: scanSizes
        },
        encoding: "utf8"
      }
    );

    const bestEdge = extractBestGrossEdge(
      result.stdout || ""
    );

    console.log(bestEdge.summary);

    const record = [
      "",
      "========================================",
      bestEdge.summary,
      `OBSERVER TIMESTAMP: ${timestamp}`,
      `OBSERVER RUN: ${run}/${maxRuns}`,
      "========================================",
      result.stdout || "",
      result.stderr || ""
    ].join("\n");

    fs.appendFileSync(logPath, record);

    process.stdout.write(result.stdout || "");

    if (result.stderr) {
      process.stderr.write(result.stderr);
    }

    if (result.status !== 0) {
      console.error(
        `Observation ${run} failed with status ${result.status}`
      );
    }

    if (run < maxRuns) {
      await sleep(intervalSeconds * 1000);
    }
  }

  console.log("");
  console.log("Observer complete.");
  console.log("Log:", logPath);
  console.log("Live execution: OFF");
})().catch(error => {
  console.error("Balancer edge observer failed:");
  console.error(error.message);
  process.exitCode = 1;
});
