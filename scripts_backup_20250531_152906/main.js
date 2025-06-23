// scripts/main.js

require("dotenv").config();

const { executeTrades } = require("./multiTradeExecutor");
const { getNextTrade, hasPendingTrades, addToQueue } = require("./taskQueue");
const { monitorMempool } = require("./mempoolMonitor");
const { networks, scriptName } = require("./scripts/queueConfig");

// 🔁 Load trade queue and watchers from config
networks.forEach((network) => {
  addToQueue({ network, script: scriptName });
  monitorMempool(network); // Optional: Mempool monitoring
});

async function processQueue() {
  const batch = [];

  while (hasPendingTrades()) {
    batch.push(getNextTrade());
  }

  if (batch.length > 0) {
    console.log(`🚀 Executing ${batch.length} trade(s)`);
    await executeTrades(batch);
  }
}

// ♻️ Run queue processor every 15 seconds
setInterval(processQueue, 15_000);

