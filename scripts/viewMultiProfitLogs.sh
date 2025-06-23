#!/bin/bash

LOG_FILE="logs/paraswap_multi_profitability.csv"

if [ ! -f "$LOG_FILE" ]; then
  echo "❌ Log file not found: $LOG_FILE"
  exit 1
fi

echo "📊 Multi-Token Profitability Viewer"

# Optional filters
TOKEN_FILTER="$1"      # e.g., DAI or USDC or WETH
MIN_DELTA=${2:-0.0}    # e.g., 0.0 for positive delta
MAX_SLIPPAGE=${3:-100} # e.g., 0.3 for 0.3%

echo "🔍 Filtering: Token=${TOKEN_FILTER:-ALL}, Δ > $MIN_DELTA, Slippage < $MAX_SLIPPAGE%"

# Header
echo "Timestamp               | Token | Input     | Out       | Back      | Δ         | Slippage"
echo "------------------------+-------+-----------+-----------+-----------+-----------+----------"

# Apply filtering (BSD-compatible awk using gsub instead of gensub)
awk -F',' -v token="$TOKEN_FILTER" -v minDelta="$MIN_DELTA" -v maxSlip="$MAX_SLIPPAGE" '
  BEGIN { count=0 }
  {
    slip = $7
    gsub(/%%/, "", slip)
    if ($2 ~ token && $6+0 > minDelta && slip+0 < maxSlip) {
      printf "%-24s | %-5s | %-9s | %-9s | %-9s | %+9s | %s%%\n", $1, $2, $3, $4, $5, $6, slip;
      count++;
    }
  }
  END {
    if (count == 0) print "⚠️  No matching profitable rows found."
  }
' "$LOG_FILE" | sort -k6 -n -r | head -n 5

