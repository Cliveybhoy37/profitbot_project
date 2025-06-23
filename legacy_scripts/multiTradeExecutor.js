const { exec } = require("child_process");

async function executeTrades(trades) {
  const promises = trades.map((trade) => {
    return new Promise((resolve) => {
      console.log(`🚀 Executing trade on ${trade.network}`);

      exec(`npx hardhat run scripts/${trade.script} --network ${trade.network}`, (err, stdout, stderr) => {
        if (err) {
          console.error(`❌ Trade failed on ${trade.network}:`, err.message);
          return resolve();
        }

        console.log(`✅ Success on ${trade.network}:\n${stdout}`);
        resolve();
      });
    });
  });

  await Promise.all(promises);
}

module.exports = { executeTrades };

