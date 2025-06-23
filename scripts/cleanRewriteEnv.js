// scripts/cleanRewriteEnv.js
const fs = require("fs");
const path = require("path");

const ENV_PATH = path.resolve(__dirname, "..", ".env");
let envText = fs.readFileSync(ENV_PATH, "utf8");

const REPLACE_ENTRIES = {
  USDT_POLYGON: "0xC2132D05D31c914A87C6611C10748AaCbA5E262",
  cbETH_POLYGON: "0x1e0B299207b77Eec4aD1E5D6a97a9363aE6a9Eb5",
  rETH_POLYGON: "0xEAbfAB88f209C4f9E5F4Df2dE32b32d46E4cDcC8",
};

for (const [key, newValue] of Object.entries(REPLACE_ENTRIES)) {
  const regex = new RegExp(`^${key}=.*$`, "mi");
  if (regex.test(envText)) {
    envText = envText.replace(regex, `${key}=${newValue}`);
  } else {
    envText += `\n${key}=${newValue}`;
  }
}

fs.writeFileSync(ENV_PATH, envText, { encoding: "utf8" });
console.log("✅ .env entries hard-rewritten with clean UTF-8 formatting.");

