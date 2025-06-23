#!/bin/bash
nohup npx hardhat run scripts/checkAllTokensBidirectional.js --network polygon > logs/all_tokens_monitor.log 2>&1 &
echo "📡 All-tokens monitor started in background. Check logs/all_tokens_monitor.log"

