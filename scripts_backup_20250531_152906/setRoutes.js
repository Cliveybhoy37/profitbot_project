const fs = require("fs");

const routes = [
  ["DAI", "USDC", "wstETH"],
  ["wstETH", "DAI", "USDC"],
  ["USDC", "wstETH", "DAI"]
];

fs.writeFileSync("./arb_routes.json", JSON.stringify(routes, null, 2));
console.log("✅ arb_routes.json updated with wstETH routes.");

