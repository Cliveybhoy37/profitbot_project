#!/bin/bash

echo "🔧 Applying tokenMap normalization patch..."

# 1. Patch helpers/tokenMap.js with addressToTokenMap export
TOKENMAP="helpers/tokenMap.js"
if ! grep -q "module.exports.addressToTokenMap" "$TOKENMAP"; then
  cat <<'EOF' >> "$TOKENMAP"

const addressToTokenMap = {};
for (const token of Object.values(module.exports)) {
  if (token?.address) {
    addressToTokenMap[token.address.toLowerCase()] = token;
  }
}
module.exports.addressToTokenMap = addressToTokenMap;
EOF
  echo "✅ tokenMap.js patched with addressToTokenMap"
else
  echo "✅ addressToTokenMap already present in tokenMap.js"
fi

# 2. Patch multiDexQuote.js
MULTIDEX="scripts/utils/multiDexQuote.js"
sed -i.bak 's|const { tokenMap } = require("../../helpers/tokenMap");|const { addressToTokenMap } = require("../../helpers/tokenMap");\n\nconst resolveToken = (addr) => addressToTokenMap[addr?.toLowerCase?.()] || { symbol: "UNKNOWN", decimals: 18 };|' "$MULTIDEX"
echo "✅ multiDexQuote.js patched"

# 3. Patch loopFlashloan.js
LOOPFLASH="scripts/loopFlashloan.js"
sed -i.bak 's|const tokenMap = require("../helpers/tokenMap");|const { addressToTokenMap } = require("../helpers/tokenMap");\n\nconst resolveToken = (addr) => addressToTokenMap[addr?.toLowerCase?.()] || { symbol: "UNKNOWN", decimals: 18 };|' "$LOOPFLASH"
echo "✅ loopFlashloan.js patched"

echo "🧹 Cleaning up backup files..."
rm -f scripts/utils/multiDexQuote.js.bak scripts/loopFlashloan.js.bak

echo "🚀 Patch complete. Rerun your test commands:"
echo "node scripts/simulateProfit.js"
echo "DRY_RUN=true node scripts/loopFlashloan.js"

