// scripts/forcePatchChecksums.js
const fs = require("fs");
const path = require("path");

const ENV_PATH = path.resolve(__dirname, "..", ".env");
let env = fs.readFileSync(ENV_PATH, "utf8");

const patchMap = {
  USDT_POLYGON: "0xC2132D05D31c914A87C6611C10748AaCbA5E262",
  cbETH_POLYGON: "0x1e0B299207b77Eec4aD1E5D6a97a9363aE6a9Eb5",
  rETH_POLYGON: "0xEAbfAB88f209C4f9E5F4Df2dE32b32d46E4cDcC8",
};

for (const [key, value] of Object.entries(patchMap)) {
  const regex = new RegExp(`${key}=.*`, "i");
  env = env.replace(regex, `${key}=${value}`);
}

fs.writeFileSync(ENV_PATH, env, "utf8");
console.log("✅ .env patched cleanly with enforced values.");

