const fetch = require("node-fetch");

const BASE_URL = "https://polygon.api.0x.org/swap/v1/quote";
const SELL_TOKEN = "WETH";
const BUY_TOKEN = "DAI";
const SELL_AMOUNT_WEI = "100000000000000000"; // 0.1 WETH (in wei)

async function getQuote() {
  const url = `${BASE_URL}?sellToken=${SELL_TOKEN}&buyToken=${BUY_TOKEN}&sellAmount=${SELL_AMOUNT_WEI}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`0x API error: ${res.statusText}`);
    const data = await res.json();

    const sellAmount = Number(data.sellAmount) / 1e18;
    const buyAmount = Number(data.buyAmount) / 1e18;
    const price = buyAmount / sellAmount;

    console.log("🔁 0x Swap Quote (Polygon):");
    console.log(`- Sell: ${sellAmount} ${SELL_TOKEN}`);
    console.log(`- Buy: ${buyAmount.toFixed(6)} ${BUY_TOKEN}`);
    console.log(`- Price: ${price.toFixed(6)} ${BUY_TOKEN} per ${SELL_TOKEN}`);
    console.log(`- Min Received: ${data.guaranteedPrice}`);
    console.log(`- Estimated Gas: ${data.estimatedGas}`);
    console.log(`- Source DEXs: ${data.sources.filter(s => s.proportion > 0).map(s => s.name).join(", ")}`);
  } catch (err) {
    console.error("❌ Error fetching quote:", err.message);
  }
}

getQuote();

