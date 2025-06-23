const axios = require("axios");

async function fetchPolygonGas() {
  try {
    const res = await axios.get("https://gasstation.polygon.technology/v2");
    const data = res.data;

    return {
      safeGas: data?.safeLow?.maxFee || 30,
      proposeGas: data?.standard?.maxFee || 35,
      fastGas: data?.fast?.maxFee || 40,
      baseFee: data?.estimatedBaseFee || 0,
    };
  } catch (err) {
    console.error("❌ Failed to fetch gas prices:", err.message);
    return {
      safeGas: 30,
      proposeGas: 35,
      fastGas: 40,
      baseFee: 0,
    };
  }
}

module.exports = { fetchPolygonGas };

