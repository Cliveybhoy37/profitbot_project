let tradeQueue = [];

function addToQueue(trade) {
  tradeQueue.push(trade);
  console.log(`📥 Trade added: ${JSON.stringify(trade)} (queue size: ${tradeQueue.length})`);
}

function getNextTrade() {
  return tradeQueue.shift();
}

function hasPendingTrades() {
  return tradeQueue.length > 0;
}

module.exports = {
  addToQueue,
  getNextTrade,
  hasPendingTrades,
};

