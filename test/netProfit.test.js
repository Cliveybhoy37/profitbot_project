const { test } = require('node:test');
const assert = require('node:assert/strict');
const { evaluate } = require('../scripts/utils/netProfit');
const base = { input: 100_000_000n, quotedOutput: 102_000_000n, flashloanFee: 90_000n,
  gasInToken: 200_000n, slippageBps: 100, quoteAgeMs: 100, maxQuoteAgeMs: 1000,
  executable: true, simulationPassed: true };
test('net subtracts slippage, flashloan fee and gas in loan-token units', () => {
  const result = evaluate(base);
  assert.equal(result.net, 690_000n);
  assert.equal(result.accepted, true);
});
test('stale, unsupported and reverted trades are rejected', () => {
  const result = evaluate({ ...base, quoteAgeMs: 1001, executable: false, simulationPassed: false });
  assert.equal(result.reasons.length, 3);
});
test('nonprofitable and malformed quotes are rejected', () => {
  assert.equal(evaluate({ ...base, quotedOutput: 100_000_000n }).accepted, false);
  assert.throws(() => evaluate({ ...base, quotedOutput: NaN }), TypeError);
});
test('non-18-decimal borrowed token arithmetic remains in raw units', () => {
  const result = evaluate({ ...base, input: 1_000_000n, quotedOutput: 1_020_000n,
    flashloanFee: 900n, gasInToken: 2_000n, slippageBps: 50 });
  assert.equal(result.net, 12_000n);
});
