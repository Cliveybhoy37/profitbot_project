"use strict";

const { ethers } = require("ethers");
const {
  normalizeDiscoveredLegs,
  validateLiveSlippageBps
} = require("./polygonExecutionCandidate");
const {
  buildExecutionLegs,
  encodeExecutionLegs
} = require("./polygonExecutionRoute");

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

function hydrateFlashloanSimulationCandidate(candidate) {
  if (
    !candidate ||
    !Array.isArray(candidate.legs) ||
    candidate.legs.length !== 3
  ) {
    throw new Error("Simulation candidate requires exactly three legs");
  }

  return {
    ...candidate,
    legs: candidate.legs.map((leg) => {
      if (
        typeof leg.amountOut !== "string" ||
        !/^[0-9]+$/.test(leg.amountOut)
      ) {
        throw new Error(
          "Simulation candidate amountOut must be a positive decimal string"
        );
      }

      const amountOut = ethers.BigNumber.from(leg.amountOut);

      if (amountOut.lte(0)) {
        throw new Error(
          "Simulation candidate amountOut must be a positive decimal string"
        );
      }

      return {
        ...leg,
        amountOut
      };
    })
  };
}

function buildFlashloanSimulationRequest({
  candidate,
  tokens,
  amount,
  slippageBps
}) {
  const liveSlippageBps = validateLiveSlippageBps(slippageBps);
  const normalized = normalizeDiscoveredLegs(candidate, tokens);
  const legs = buildExecutionLegs(normalized, liveSlippageBps);
  const params = encodeExecutionLegs(legs);
  const token = legs[0].tokenIn;
  const data = buildInitiateFlashloanCalldata(
    token,
    amount,
    params
  );

  return {
    token,
    amount,
    legs,
    params,
    data
  };
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
  hydrateFlashloanSimulationCandidate,
  buildFlashloanSimulationRequest,
  simulateInitiateFlashloan
};
