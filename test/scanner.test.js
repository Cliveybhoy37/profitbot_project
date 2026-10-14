const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ethers } = require('ethers');
const { minOutput, evaluateScannerEconomics } = require('../scripts/autoScanner');
test('minOutput floors conservative hop output and rejects zero', () => {
  assert.equal(minOutput(ethers.BigNumber.from(1000000), 50).toString(), '995000');
  assert.equal(minOutput(ethers.BigNumber.from(1), 50).toString(), '0');
});

test("scanner economics subtracts flashloan fee and gas before thresholding", () => {
  const result = evaluateScannerEconomics({
    input: 100_000_000n,
    quotedOutput: 101_000_000n,
    flashloanFee: 50_000n,
    gasInToken: 250_000n,
    slippageBps: 0,
    quoteAgeMs: 1_000,
    maxQuoteAgeMs: 120_000,
    minProfitBps: 10n
  });

  assert.equal(result.net, 700_000n);
  assert.equal(result.threshold, 100_000n);
  assert.equal(result.estimatedPositive, true);
});

test("scanner economics requires net profit strictly above configured threshold", () => {
  const result = evaluateScannerEconomics({
    input: 100_000_000n,
    quotedOutput: 100_400_000n,
    flashloanFee: 50_000n,
    gasInToken: 250_000n,
    slippageBps: 0,
    quoteAgeMs: 1_000,
    maxQuoteAgeMs: 120_000,
    minProfitBps: 10n
  });

  assert.equal(result.net, 100_000n);
  assert.equal(result.threshold, 100_000n);
  assert.equal(result.estimatedPositive, false);
});

test("scanner economics rejects stale quotes from estimated-positive results", () => {
  const result = evaluateScannerEconomics({
    input: 100_000_000n,
    quotedOutput: 101_000_000n,
    flashloanFee: 50_000n,
    gasInToken: 250_000n,
    slippageBps: 0,
    quoteAgeMs: 120_001,
    maxQuoteAgeMs: 120_000,
    minProfitBps: 10n
  });

  assert.equal(result.net, 700_000n);
  assert.equal(result.accepted, false);
  assert.equal(result.estimatedPositive, false);
  assert.deepEqual(result.reasons, ["stale quote"]);
});

test("scanner economics rejects invalid minimum-profit basis points", () => {
  assert.throws(
    () => evaluateScannerEconomics({
      input: 100_000_000n,
      quotedOutput: 101_000_000n,
      flashloanFee: 50_000n,
      gasInToken: 250_000n,
      slippageBps: 0,
      quoteAgeMs: 1_000,
      maxQuoteAgeMs: 120_000,
      minProfitBps: -1n
    }),
    TypeError
  );
});
