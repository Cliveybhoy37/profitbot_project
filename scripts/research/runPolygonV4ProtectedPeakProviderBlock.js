"use strict";

async function observeProtectedPeakProviderBlock({
  provider
}) {
  if (!provider) {
    throw new Error(
      "provider required"
    );
  }

  if (
    typeof provider.getBlockNumber !==
      "function"
  ) {
    throw new Error(
      "provider requires getBlockNumber"
    );
  }

  const blockTag =
    await provider.getBlockNumber();

  if (
    !Number.isSafeInteger(blockTag) ||
    blockTag <= 0
  ) {
    throw new Error(
      "blockTag must be a positive safe integer"
    );
  }

  return blockTag;
}

module.exports = {
  observeProtectedPeakProviderBlock
};
