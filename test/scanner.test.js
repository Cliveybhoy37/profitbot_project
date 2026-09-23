const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ethers } = require('ethers');
const { minOutput } = require('../scripts/autoScanner');
test('minOutput floors conservative hop output and rejects zero', () => {
  assert.equal(minOutput(ethers.BigNumber.from(1000000), 50).toString(), '995000');
  assert.equal(minOutput(ethers.BigNumber.from(1), 50).toString(), '0');
});
