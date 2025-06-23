#!/bin/bash

LOG_FILE="logs/paraswap_profitability.csv"

if [ ! -f "$LOG_FILE" ]; then
  echo "❌ Log file not found at $LOG_FILE"
  exit 1
fi

case "$1" in
  --profitable)
    echo "💰 Profitable Trades Only (Δ > 0.00 DAI):"
    echo "Timestamp               | Input DAI | WETH Out | DAI Back | Delta    | Slippage"
    echo "------------------------+-----------+----------+----------+----------+----------"
    awk -F',' '$5 + 0 > 0 { printf "%-24s | %-9s | %-8s | %-8s | %+8s | %7s%%\n", $1, $2, $3, $4, $5, $6 }' "$LOG_FILE" | tail -n 20
    ;;
  --slippage)
    echo "🎯 Low-Slippage Trades Only (Δ > 0 && slippage < 0.3%):"
    echo "Timestamp               | Input DAI | WETH Out | DAI Back | Delta    | Slippage"
    echo "------------------------+-----------+----------+----------+----------+----------"
    awk -F',' '$5 + 0 > 0 && $6+0 < 0.3 { printf "%-24s | %-9s | %-8s | %-8s | %+8s | %7s%%\n", $1, $2, $3, $4, $5, $6 }' "$LOG_FILE" | tail -n 20
    ;;
  --all | "")
    echo "📜 Full Trade Log (latest 20 entries):"
    echo "Timestamp               | Input DAI | WETH Out | DAI Back | Delta    | Slippage"
    echo "------------------------+-----------+----------+----------+----------+----------"
    tail -n 20 "$LOG_FILE" | awk -F',' '{ printf "%-24s | %-9s | %-8s | %-8s | %+8s | %7s%%\n", $1, $2, $3, $4, $5, $6 }'
    ;;
  *)
    echo "❌ Unknown option: $1"
    echo "Usage: $0 [--all | --profitable | --slippage]"
    ;;
esac

