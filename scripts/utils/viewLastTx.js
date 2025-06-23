require("dotenv").config();
const { ethers } = require("ethers");
const axios = require("axios");

const address = new ethers.Wallet(process.env.PRIVATE_KEY).address;
const apiKey = process.env.ETHERSCAN_API_KEY;
const baseUrl = `https://api.polygonscan.com/api`;

async function main() {
  try {
    const res = await axios.get(baseUrl, {
      params: {
        module: "account",
        action: "txlist",
        address,
        startblock: 0,
        endblock: 99999999,
        page: 1,
        offset: 1,
        sort: "desc",
        apikey: apiKey,
      },
    });

    const txs = res.data.result;
    if (!txs.length) {
      return console.log("⚠️ No transactions found.");
    }

    const tx = txs[0];
    console.log(`🔍 Last TX Hash: ${tx.hash}`);
    console.log(`📦 Block: ${tx.blockNumber}`);
    console.log(`🎯 To: ${tx.to}`);
    console.log(`💰 Value: ${ethers.utils.formatEther(tx.value)} MATIC`);
    console.log(`⏱ Timestamp: ${new Date(tx.timeStamp * 1000).toLocaleString()}`);
    console.log(`🔗 View on Polygonscan: https://polygonscan.com/tx/${tx.hash}`);
  } catch (err) {
    console.error("❌ Failed to fetch TX history:", err.message);
  }
}

main();

