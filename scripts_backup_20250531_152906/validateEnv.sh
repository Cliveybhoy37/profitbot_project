#!/bin/bash

REQUIRED_VARS=(
  PRIVATE_KEY
  TELEGRAM_BOT_TOKEN
  TELEGRAM_CHAT_ID
  AAVE_ORACLE_POLYGON
  PROFIT_THRESHOLD
  MAX_SLIPPAGE
  FLASHLOAN_AMOUNT_DAI
  FLASHLOAN_AMOUNT_USDC
  DATA_PROVIDER_POLYGON
)

echo "🔍 Validating required environment variables..."

MISSING=0
for VAR in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!VAR}" ]]; then
    echo "❌ Missing: $VAR"
    MISSING=1
  fi
done

if [[ "$MISSING" == 1 ]]; then
  echo "⛔ Please update your .env file with the missing values above."
  exit 1
else
  echo "✅ All required environment variables are set."
fi

