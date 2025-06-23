#!/bin/bash

LOG_FILE="logs/paraswap_multi_profitability.csv"

if [ ! -f "$LOG_FILE" ]; then
  echo "❌ Log file not found: $LOG_FILE"
  exit 1
fi

echo "📊 Leaderboard Summary (Token × Size)"
echo "--------------------------------------"

awk -F',' '
BEGIN {
  print "Token | Size   | Max Δ   | Min Δ    | Avg Δ   | Count | Profits"
  print "------+--------+---------+----------+---------+-------+---------"
}
NR > 1 {
  token = $2
  size = $3
  delta = $6 + 0
  key = token "_" size

  count[key]++
  sum[key] += delta
  max[key] = (count[key] == 1 || delta > max[key]) ? delta : max[key]
  min[key] = (count[key] == 1 || delta < min[key]) ? delta : min[key]
  if (delta > 0) profit[key]++
}
END {
  for (k in count) {
    split(k, parts, "_")
    printf "%-5s | %-6s | %+7.4f | %+8.4f | %+7.4f | %5d | %7d\n",
      parts[1], parts[2], max[k], min[k], sum[k]/count[k], count[k], profit[k]
  }
}
' "$LOG_FILE" | sort -k5 -n -r | head -n 20

