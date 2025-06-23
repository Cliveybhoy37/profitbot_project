#!/bin/bash

echo "🛑 Attempting to stop all instances of checkParaSwapBidirectional.js..."

# 1. Kill any PID saved in profit_monitor.pid
if [ -f profit_monitor.pid ]; then
  PID=$(cat profit_monitor.pid)
  if ps -p $PID > /dev/null; then
    echo "🔪 Killing PID from profit_monitor.pid: $PID"
    kill -9 $PID && echo "✅ Killed PID $PID"
  else
    echo "⚠️ PID in profit_monitor.pid ($PID) is not running"
  fi
  rm profit_monitor.pid
fi

# 2. Also kill any active 'npx hardhat run scripts/checkParaSwapBidirectional.js'
MATCHED=$(pgrep -f "npx hardhat run scripts/checkParaSwapBidirectional.js")
if [ -n "$MATCHED" ]; then
  echo "🔍 Found active processes:"
  echo "$MATCHED" | xargs -I{} ps -p {} -o pid,etime,cmd
  echo "$MATCHED" | xargs kill -9
  echo "✅ Killed all matching checkParaSwapBidirectional.js processes"
else
  echo "✅ No running foreground npx instances found"
fi

echo "✅ Done."

