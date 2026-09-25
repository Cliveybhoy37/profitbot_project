"use strict";

const { ethers } = require("ethers");
const { flashloanFeeRaw, maxAffordableGasUnits, nativeGasCostInTokenRaw } = require("./polygonNetEconomics");

const POOL_ADDRESSES_PROVIDER_POLYGON =
  "0xa97684ead0e402dc232d5a977953df7ecbab3cdb";

const PROVIDER_ABI = [
  "function getPool() view returns (address)",
  "function getPriceOracle() view returns (address)"
];

const POOL_ABI = [
  "function FLASHLOAN_PREMIUM_TOTAL() view returns (uint128)"
];

const ORACLE_ABI = [
  "function BASE_CURRENCY_UNIT() view returns (uint256)",
  "function getAssetPrice(address asset) view returns (uint256)"
];

function requireAddress(value, name) {
  if (!ethers.utils.isAddress(value)) {
    throw new TypeError(`${name} must be a valid address`);
  }
}

async function resolveAaveEconomics(
  provider,
  providerAddress = POOL_ADDRESSES_PROVIDER_POLYGON,
  blockTag
) {
  if (!provider) throw new Error("provider required");
  requireAddress(providerAddress, "providerAddress");

  const addressesProvider = new ethers.Contract(
    providerAddress,
    PROVIDER_ABI,
    provider
  );

  const callOverrides = blockTag === undefined ? {} : { blockTag };

  const [poolAddress, oracleAddress] = await Promise.all([
    addressesProvider.getPool(callOverrides),
    addressesProvider.getPriceOracle(callOverrides)
  ]);

  requireAddress(poolAddress, "poolAddress");
  requireAddress(oracleAddress, "oracleAddress");

  const pool = new ethers.Contract(poolAddress, POOL_ABI, provider);
  const oracle = new ethers.Contract(oracleAddress, ORACLE_ABI, provider);

  const [premiumBps, baseCurrencyUnit] = await Promise.all([
    pool.FLASHLOAN_PREMIUM_TOTAL(callOverrides),
    oracle.BASE_CURRENCY_UNIT(callOverrides)
  ]);

  return {
    providerAddress,
    poolAddress,
    oracleAddress,
    premiumBps: BigInt(premiumBps.toString()),
    baseCurrencyUnit: BigInt(baseCurrencyUnit.toString())
  };
}

async function readTokenPrices({
  provider,
  oracleAddress,
  nativeToken,
  token,
  blockTag
}) {
  if (!provider) throw new Error("provider required");

  requireAddress(oracleAddress, "oracleAddress");
  requireAddress(nativeToken, "nativeToken");
  requireAddress(token, "token");

  const oracle = new ethers.Contract(
    oracleAddress,
    ORACLE_ABI,
    provider
  );

  const callOverrides = blockTag === undefined ? {} : { blockTag };

  const [nativePrice, tokenPrice] = await Promise.all([
    oracle.getAssetPrice(nativeToken, callOverrides),
    oracle.getAssetPrice(token, callOverrides)
  ]);

  return {
    nativePrice: BigInt(nativePrice.toString()),
    tokenPrice: BigInt(tokenPrice.toString())
  };
}

function calculateFlashloanFee(amount, premiumBps) {
  return flashloanFeeRaw(amount, premiumBps);
}

function calculateMaxAffordableGasUnits({
  tokenBudget,
  maxFeePerGasWei,
  nativePrice,
  tokenPrice,
  tokenDecimals
}) {
  return maxAffordableGasUnits({
    tokenBudget,
    maxFeePerGasWei,
    nativePrice,
    tokenPrice,
    tokenDecimals
  });
}

function calculateGasCostInToken({
  gasUnits,
  maxFeePerGasWei,
  nativePrice,
  tokenPrice,
  tokenDecimals
}) {
  return nativeGasCostInTokenRaw({
    gasUnits,
    maxFeePerGasWei,
    nativePrice,
    tokenPrice,
    tokenDecimals
  });
}

module.exports = {
  POOL_ADDRESSES_PROVIDER_POLYGON,
  resolveAaveEconomics,
  readTokenPrices,
  calculateFlashloanFee,
  calculateMaxAffordableGasUnits,
  calculateGasCostInToken
};
