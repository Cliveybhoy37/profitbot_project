const { ethers } = require("ethers");

const tokenMap = {
  USDT_POLYGON: "0xC2132D05D31c914A87C6611C10748AaCbA5E262",
  cbETH_POLYGON: "0x1E0b299207b77eEc4AD1E5D6a97A9363Ae6A9eB5",
  rETH_POLYGON: "0xEAbfAB88f209C4f9E5F4Df2dE32b32d46E4cDcC8",
};

console.log("🔎 Final atomic address validation:\n");

for (const [name, addr] of Object.entries(tokenMap)) {
  try {
    const checksummed = ethers.utils.getAddress(addr);
    console.log(`✅ ${name.padEnd(20)} → ${checksummed}`);
  } catch (err) {
    console.error(`❌ ${name.padEnd(20)} → ${addr} → ${err.message}`);
  }
}

