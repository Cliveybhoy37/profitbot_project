// utils/paraswapTokens.js
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const CACHE_FILE = path.resolve(__dirname, "../.cache/paraswap_tokens.json");
const API_URL = "https://api.paraswap.io/tokens/137"; // ✅ Polygon network

let tokenMap = {};

async function fetchParaswapTokens() {
  try {
    const res = await axios.get(API_URL);
    const tokens = res.data.tokens;

    // Save only symbol → address and address → symbol
    tokenMap = tokens.reduce((acc, token) => {
      const checksum = ethers.utils.getAddress(token.address);
      acc[token.symbol.toUpperCase()] = checksum;
      acc[checksum] = token.symbol.toUpperCase();
      return acc;
    }, {});

    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(tokenMap, null, 2));
    console.log(`✅ Cached ${Object.keys(tokenMap).length / 2} Paraswap tokens`);
  } catch (err) {
    console.error("❌ Failed to fetch Paraswap tokens:", err.message);
  }
}

function isParaswapSupported(symbolOrAddress) {
  if (!tokenMap || Object.keys(tokenMap).length === 0) {
    try {
      const cached = fs.readFileSync(CACHE_FILE, "utf8");
      tokenMap = JSON.parse(cached);
    } catch (e) {
      console.warn("⚠️ Paraswap token cache missing. Run fetchParaswapTokens() first.");
      return false;
    }
  }
  const key = ethers.utils.isAddress(symbolOrAddress)
    ? ethers.utils.getAddress(symbolOrAddress)
    : symbolOrAddress.toUpperCase();
  return tokenMap[key] !== undefined;
}

module.exports = {
  fetchParaswapTokens,
  isParaswapSupported
};

