const fs = require("fs");

const rawRoutes = JSON.parse(fs.readFileSync("./arb_routes.json"));

// ✅ Added wstETH to strongTokens
const strongTokens = ["USDC", "USDT", "WETH", "WBTC", "DAI", "WMATIC", "wstETH"];

const filtered = rawRoutes.filter(([a, b, c]) =>
  strongTokens.includes(a) &&
  strongTokens.includes(b) &&
  strongTokens.includes(c) &&
  !(a === c) // remove self-loops like DAI → USDC → DAI
);

fs.writeFileSync("./arb_routes.json", JSON.stringify(filtered, null, 2));
console.log(`✅ Pruned to ${filtered.length} strong routes`);

