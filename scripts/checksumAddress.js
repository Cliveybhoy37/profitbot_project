// scripts/checksumAddress.js
const { ethers } = require("ethers");

// Accept address from CLI
const input = process.argv[2];

if (!input) {
  console.error("❌ Please provide an address to checksum.\nUsage: node scripts/checksumAddress.js <address>");
  process.exit(1);
}

try {
  const checksummed = ethers.utils.getAddress(input); // ✅ fixed here
  console.log("✅ Checksummed Address:", checksummed);
} catch (err) {
  console.error("❌ Invalid address:", err.message);
}

