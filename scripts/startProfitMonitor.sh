#!/bin/bash

# Load .env vars safely
set -a
source .env
set +a

# Validate critical vars (like TELEGRAM_BOT_TOKEN etc.)
bash scripts/validateEnv.sh || exit 1

echo "📡 Starting profit monitor with PID tracking..."

nohup npx hardhat run scripts/checkParaSwapBidirectional.js --network polygon > logs/profit_monitor.log 2>&1 &
echo $! > profit_monitor.pid

echo "✅ Profit monitor started in background. PID: $(cat profit_monitor.pid)"

