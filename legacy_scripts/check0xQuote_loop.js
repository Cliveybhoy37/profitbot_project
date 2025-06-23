const fetch = require('node-fetch');
const fs = require('fs');

const API_URL = "https://polygon.api.0x.org/swap/v1/quote";
const API_KEY = "YOUR_0X_API_KEY"; // Replace this when available

const DAI = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
const WETH = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";

const AMOUNT_IN = "500000000000000000000"; // 500 DAI (18 decimals)
const LOG_FILE = "logs/0x_dai_weth_quotes.log";

async function fetchQuote() {
  try {
    const res = await fetch(`${API_URL}?buyToken=${WETH}&sellToken=${DAI}&sellAmount=${AMOUNT_IN}`, {
      headers: {
        "0x-api-key": API_KEY
      }
    });

    if (!res.ok) throw new Error(`0x API error: ${res.statusText}`);
    const data = await res.json();

    const sellDAI = parseFloat(data.sellAmount) / 1e18;
    const buyWETH = parseFloat(data.buyAmount) / 1e18;
    const rate = sellDAI / buyWETH;

    const now = new Date().toISOString();
    const line = `${now},${sellDAI},${buyWETH.toFixed(6)},${rate.toFixed(4)}\n`;

    console.log(`[${now}] 💱 0x Quote: 500 DAI → ${buyWETH.toFixed(6)} WETH (Rate: ${rate.toFixed(4)} DAI/WETH)`);

    fs.appendFile(LOG_FILE, line, (err) => {
      if (err) console.error("❌ Log error:", err.message);
    });

  } catch (err) {
    console.error("❌ Error fetching quote:", err.message);
  }
}

// Initial run and every 5 minutes
fetchQuote();
setInterval(fetchQuote, 5 * 60 * 1000);

