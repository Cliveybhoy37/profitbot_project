// scripts/utils/formatters.js
const { ethers } = require("ethers");

/**
 * Safely converts a float, string, or exponential number into a BigNumber
 * by scaling it to the specified decimal places.
 * Handles scientific notation and avoids invalid BigNumber errors.
 *
 * @param {number|string} value - e.g., "1e+21", 27.6472, "1000"
 * @param {number} decimals - Token decimals (default: 18)
 * @returns {ethers.BigNumber}
 */
function toWeiSafe(value, decimals = 18) {
  const num = Number(value);
  if (!Number.isFinite(num)) throw new Error(`Invalid number: ${value}`);

  // Convert to integer wei by avoiding scientific notation
  const scale = BigInt(10) ** BigInt(decimals);
  const scaled = BigInt(Math.floor(num * Math.pow(10, decimals)));

  return ethers.BigNumber.from(scaled.toString());
}

module.exports = { toWeiSafe };

