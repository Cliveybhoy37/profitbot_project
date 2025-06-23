const fetch = require("node-fetch");

const DAI = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
const WETH = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
const baseURL = "https://apiv5.paraswap.io";
const chain = "137"; // Polygon

const testSizes = [1000, 5000, 10000, 20000, 35000]; // 💰 Sizes in DAI

async function fetchQuote(srcToken, destToken, amount) {
  const url = `${baseURL}/prices/?srcToken=${srcToken}&destToken=${destToken}&amount=${amount}&side=SELL&network=${chain}`;
  console.log("🔗 Fetching URL:", url);
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Quote error: ${res.statusText}`);
  return await res.json();
}

(async () => {
  for (const DAI_AMOUNT of testSizes) {
    const AMOUNT_IN = BigInt(Math.floor(DAI_AMOUNT * 1e18)).toString();

    try {
      const quote1 = await fetchQuote(DAI, WETH, AMOUNT_IN);
      const receivedWETH = parseFloat(quote1.priceRoute.destAmount) / 1e18;

      const reverseAmount = BigInt(Math.floor(receivedWETH * 1e18)).toString();
      const quote2 = await fetchQuote(WETH, DAI, reverseAmount);
      const receivedDAI = parseFloat(quote2.priceRoute.destAmount) / 1e18;

      const delta = receivedDAI - DAI_AMOUNT;
      const slippage = 1 - (parseFloat(quote1.priceRoute.destUSD) / parseFloat(quote1.priceRoute.srcUSD));

      console.log(`\n🧪 Test for ${DAI_AMOUNT} DAI:`);
      console.log(`→ WETH out: ${receivedWETH.toFixed(6)}`);
      console.log(`→ DAI back: ${receivedDAI.toFixed(6)}`);
      console.log(`→ Δ: ${delta.toFixed(6)} DAI`);
      console.log(`→ Slippage: ${(slippage * 100).toFixed(2)}%`);
    } catch (err) {
      console.error(`❌ Error for ${DAI_AMOUNT} DAI: ${err.message}`);
    }
  }
})();

