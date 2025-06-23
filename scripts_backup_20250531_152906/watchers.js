// scripts/watchers.js

const { spawn } = require("child_process");
const path = require("path");

const MONITOR_SCRIPTS = [
  {
    name: "ParaSwap Bidirectional",
    file: "checkParaSwapBidirectional.js",
    network: "polygon",
  },
  {
    name: "ParaSwap Quote",
    file: "checkParaSwapQuote.js",
    network: "polygon",
  },
  {
    name: "Multi-Route Arbitrage Checker",
    file: "checkAllRoutes.js",
    network: "polygon", // dummy, script handles its own networks
  }
];

function startScript({ name, file, network }) {
  const scriptPath = path.join(__dirname, file);
  console.log(`🟢 Starting watcher: ${name} (${file})`);

  const proc = spawn("npx", ["hardhat", "run", scriptPath, "--network", network], {
    stdio: "inherit",
    shell: true,
  });

  proc.on("exit", (code) => {
    console.log(`🔁 ${name} exited with code ${code}. Restarting in 5s...`);
    setTimeout(() => startScript({ name, file, network }), 5000);
  });
}

function startWatchers() {
  MONITOR_SCRIPTS.forEach(startScript);
}

module.exports = {
  startWatchers,
};

