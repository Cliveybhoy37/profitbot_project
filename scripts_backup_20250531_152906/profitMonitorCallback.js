const { addToQueue } = require("./taskQueue");

function enqueueProfitableTrade({ network = "polygon", script = "interact_flashloan.js", delta = 0 }) {
  console.log(`🚨 Enqueuing profitable trade | Δ = ${delta} DAI`);

  addToQueue({
    network,
    script,
    metadata: { delta }
  });
}

module.exports = { enqueueProfitableTrade };

