"use strict";

// Amounts are in the borrowed token's smallest units. Quote outputs must
// already include pool trading fees and price impact at the chosen trade size.
function evaluate({ input, quotedOutput, flashloanFee, gasInToken, otherFees = 0n,
  slippageBps, quoteAgeMs, maxQuoteAgeMs, executable, simulationPassed }) {
  const values = [input, quotedOutput, flashloanFee, gasInToken, otherFees];
  if (values.some(v => typeof v !== "bigint" || v < 0n) || input === 0n ||
      !Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps > 10000)
    throw new TypeError("Invalid amount or slippage");
  if (!Number.isFinite(quoteAgeMs) || !Number.isFinite(maxQuoteAgeMs) || maxQuoteAgeMs < 0)
    throw new TypeError("Invalid quote age");
  const worstOutput = quotedOutput * BigInt(10000 - slippageBps) / 10000n;
  const net = worstOutput - input - flashloanFee - gasInToken - otherFees;
  const reasons = [];
  if (quoteAgeMs > maxQuoteAgeMs) reasons.push("stale quote");
  if (!executable) reasons.push("unsupported execution route");
  if (!simulationPassed) reasons.push("simulation not passed");
  if (net <= 0n) reasons.push("insufficient net profit after fees, gas and slippage");
  return { net, worstOutput, accepted: reasons.length === 0, reasons };
}
module.exports = { evaluate };
