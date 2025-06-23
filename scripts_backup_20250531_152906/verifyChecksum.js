// scripts/verifyChecksum.js
require("dotenv").config();
const { ethers } = require("ethers");

const providerAddress = process.env.USDT_POLYGON;

try {
  const checksummed = ethers.utils.getAddress(providerAddress);
  console.log("✅ Checksummed Address (runtime):", checksummed);
} catch (err) {
  console.error("❌ Invalid address:", providerAddress);
}

