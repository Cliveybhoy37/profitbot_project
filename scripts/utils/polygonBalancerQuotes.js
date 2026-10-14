const { ethers } = require("ethers");

const BALANCER_VAULT =
  "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

const TRICRYPTO_POOL_ID =
  "0x03cd191f589d12b0582a99808cf19851e468e6b500010000000000000000000a";

const VAULT_ABI = [
  "function queryBatchSwap(uint8 kind,(bytes32 poolId,uint256 assetInIndex,uint256 assetOutIndex,uint256 amount,bytes userData)[] swaps,address[] assets,(address sender,bool fromInternalBalance,address recipient,bool toInternalBalance) funds) returns (int256[] assetDeltas)"
];

function exceedsWeightedMaxInRatio(amountIn, balanceIn) {
  if (!ethers.BigNumber.isBigNumber(amountIn)) {
    throw new Error("amountIn must be BigNumber");
  }

  if (!ethers.BigNumber.isBigNumber(balanceIn)) {
    throw new Error("balanceIn must be BigNumber");
  }

  const maxAmountIn = balanceIn.mul(3).div(10);
  return amountIn.gt(maxAmountIn);
}

async function getBalancerQuote({
  provider,
  poolId = TRICRYPTO_POOL_ID,
  assets,
  tokenIn,
  tokenOut,
  amountIn,
  blockTag,
  poolType = null,
  balances = null
}) {
  if (!provider) throw new Error("provider required");
  if (!Array.isArray(assets) || assets.length < 2) {
    throw new Error("assets required");
  }
  if (!ethers.BigNumber.isBigNumber(amountIn) || amountIn.lte(0)) {
    throw new Error("positive amountIn required");
  }

  const normalized = assets.map(a => ethers.utils.getAddress(a));
  const inAddress = ethers.utils.getAddress(tokenIn);
  const outAddress = ethers.utils.getAddress(tokenOut);

  const assetInIndex = normalized.indexOf(inAddress);
  const assetOutIndex = normalized.indexOf(outAddress);

  if (assetInIndex < 0 || assetOutIndex < 0) {
    throw new Error("token not present in Balancer asset list");
  }
  if (assetInIndex === assetOutIndex) {
    throw new Error("tokenIn and tokenOut must differ");
  }

  if (
    poolType === "WEIGHTED" &&
    Array.isArray(balances) &&
    balances.length === normalized.length
  ) {
    const balanceIn = balances[assetInIndex];

    if (
      ethers.BigNumber.isBigNumber(balanceIn) &&
      exceedsWeightedMaxInRatio(amountIn, balanceIn)
    ) {
      throw new Error("Balancer weighted MAX_IN_RATIO precheck");
    }
  }

  const vault = new ethers.Contract(
    BALANCER_VAULT,
    VAULT_ABI,
    provider
  );

  const overrides =
    blockTag === undefined ? {} : { blockTag };

  const deltas = await vault.callStatic.queryBatchSwap(
    0,
    [{
      poolId,
      assetInIndex,
      assetOutIndex,
      amount: amountIn,
      userData: "0x"
    }],
    normalized,
    {
      sender: ethers.constants.AddressZero,
      fromInternalBalance: false,
      recipient: ethers.constants.AddressZero,
      toInternalBalance: false
    },
    overrides
  );

  const amountOut = deltas[assetOutIndex].mul(-1);

  if (amountOut.lte(0)) {
    throw new Error("Balancer returned non-positive output");
  }

  return {
    venue: "BALANCER_V2",
    amountIn,
    amountOut,
    poolId,
    blockTag
  };
}

module.exports = {
  BALANCER_VAULT,
  TRICRYPTO_POOL_ID,
  exceedsWeightedMaxInRatio,
  getBalancerQuote
};
