// makePairs.js  ── generate all 2-token round-trip routes

const fs = require("fs");
// this honors USE_0X_ENV and loads .env.auto or .env.auto.0x
const { tokenMap } = require("./helpers/tokenMap");

const symbols = Object.keys(tokenMap);
const routes  = [];

for (const a of symbols) {
  for (const b of symbols) {
    if (a === b) continue;          // skip identical pairs
    routes.push([a, b, a]);         // e.g. ["USDC","WETH","USDC"]
  }
}

const outFile = "arb_routes_all2.json";
fs.writeFileSync(
  outFile,
  JSON.stringify(routes, null, 2)
);

console.log(`✅ wrote ${routes.length} routes to ${outFile}`);

