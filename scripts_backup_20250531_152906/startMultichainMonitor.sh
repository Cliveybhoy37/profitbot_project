#!/bin/bash

SCRIPT="scripts/checkAllTokensMultichain.js"
LOG="logs/multichain_monitor.log"

echo "📡 Multichain monitor started in background. Logging to $LOG"
nohup npx hardhat run "$SCRIPT" --network polygon > "$LOG" 2>&1 &
echo $! > multichain_monitor.pid

