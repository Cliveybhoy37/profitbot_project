"use strict";

const { ethers } = require("ethers");

const PROFITBOT_ABI = [
  "function initiateFlashloan(address token,uint256 amount,bytes params)"
];

function buildInitiateFlashloanCalldata(token, amount, params) {
  if (!ethers.utils.isAddress(token) || token === ethers.constants.AddressZero) {
    throw new Error("Flashloan token must be a valid nonzero address");
  }

  if (!ethers.BigNumber.isBigNumber(amount) || amount.lte(0)) {
    throw new Error("Flashloan amount must be positive");
  }

  if (
    typeof params !== "string" ||
    !ethers.utils.isHexString(params)
  ) {
    throw new Error("Flashloan params must be valid hex data");
  }

  const iface = new ethers.utils.Interface(PROFITBOT_ABI);

  return iface.encodeFunctionData(
    "initiateFlashloan",
    [token, amount, params]
  );
}

async function simulateInitiateFlashloan(provider, from, bot, data) {
  if (!provider || typeof provider.call !== "function") {
    throw new Error("Simulation provider with call is required");
  }

  if (
    !ethers.utils.isAddress(from) ||
    from === ethers.constants.AddressZero
  ) {
    throw new Error("Simulation from address must be valid and nonzero");
  }

  if (
    !ethers.utils.isAddress(bot) ||
    bot === ethers.constants.AddressZero
  ) {
    throw new Error("ProfitBot address must be valid and nonzero");
  }

  if (
    typeof data !== "string" ||
    data === "0x" ||
    !ethers.utils.isHexString(data)
  ) {
    throw new Error("Simulation calldata must be valid hex data");
  }

  return provider.call({
    from,
    to: bot,
    data
  });
}

module.exports = {
  PROFITBOT_ABI,
  buildInitiateFlashloanCalldata,
  simulateInitiateFlashloan
};
