#!/bin/bash

LOG_FILE="logs/paraswap_profitability.csv"

if [ "$1" == "--profits" ]; then
  echo "📈 Live: Profitable trades only (delta > 0)"
  tail -f "$LOG_FILE" | awk -F, '$5+0 > 0'
elif [ "$1" == "--all" ]; then
  echo "📊 Live: All log entries"
  tail -f "$LOG_FILE"
else
  echo "Usage:"
  echo "  ./scripts/viewProfitLogsLive.sh --profits   # Only positive deltas"
  echo "  ./scripts/viewProfitLogsLive.sh --all       # All logs"
fi

