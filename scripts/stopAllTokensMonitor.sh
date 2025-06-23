#!/bin/bash

PID_FILE="all_tokens_monitor.pid"

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if ps -p "$PID" > /dev/null; then
    echo "🛑 Stopping all-tokens monitor (PID: $PID)..."
    kill "$PID" && rm "$PID_FILE"
    echo "✅ All-tokens monitor stopped."
  else
    echo "⚠️  Process $PID not running. Cleaning up stale PID file..."
    rm "$PID_FILE"
  fi
else
  echo "⚠️  No PID file found for all-tokens monitor."
fi

