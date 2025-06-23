#!/bin/bash

PID_FILE="multichain_monitor.pid"

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if ps -p "$PID" > /dev/null; then
    echo "🛑 Stopping multichain profit monitor (PID: $PID)..."
    kill "$PID" && rm "$PID_FILE"
    echo "✅ Multichain monitor stopped."
  else
    echo "⚠️  Process $PID not running. Removing stale PID file..."
    rm "$PID_FILE"
  fi
else
  echo "⚠️  No PID file found for multichain monitor."
fi

