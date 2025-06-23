// scripts/testGas.js
const { fetchPolygonGas } = require("./utils/fetchPolygonGas");

async function main() {
  const gas = await fetchPolygonGas();
  console.log("⛽ Polygon Gas Prices:", gas);
}

main().catch((err) => {
  console.error("❌ Error running testGas script:", err);
});

