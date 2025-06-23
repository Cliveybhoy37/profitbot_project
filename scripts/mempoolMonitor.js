const { switchNetwork } = require("./networkManager");
const { addToQueue } = require("./taskQueue");
const { ethers } = require("ethers");

async function monitorMempool(network) {
  const provider = await switchNetwork(network);

  provider.on("pending", async (txHash) => {
    try {
      const tx = await provider.getTransaction(txHash);
      if (!tx) return;

      console.log(`🔍 TX on ${network}: ${txHash} | ${tx.to} | value: ${tx.value}`);

      // ⚠️ Very basic logic — you can implement token filters, swap signatures, etc.
      if (tx.to && tx.data) {
        const isPotentialArb = tx.data.includes("0x"); // refine this
        if (isPotentialArb) {
          console.log(`🚨 Arbitrage-suspicious TX detected on ${network}`);
          addToQueue({ network, script: "interact_flashloan.js" });
        }
      }
    } catch (err) {
      console.error(`❌ Error reading mempool TX: ${err.message}`);
    }
  });
}

module.exports = { monitorMempool };

