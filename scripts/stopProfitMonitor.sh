#!/bin/bash

PID_FILE="profit_monitor.pid"

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if ps -p "$PID" > /dev/null; then
    echo "🛑 Stopping profit monitor (PID: $PID)..."
    kill "$PID" && rm "$PID_FILE"
    echo "✅ Monitor stopped cleanly."
  else
    echo "⚠️  Process $PID not running. Cleaning up PID file..."
    rm "$PID_FILE"
  fi
else
  echo "⚠️  No PID file found. Is the monitor running?"
fi

