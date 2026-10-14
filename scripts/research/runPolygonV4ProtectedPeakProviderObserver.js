"use strict";

const {
  observeProtectedPeakProviderBlock
} = require(
  "./runPolygonV4ProtectedPeakProviderBlock"
);

function createProtectedPeakProviderObserver({
  provider,
  observeProviderBlockFn =
    observeProtectedPeakProviderBlock
}) {
  if (
    typeof observeProviderBlockFn !==
      "function"
  ) {
    throw new Error(
      "observeProviderBlockFn must be a function"
    );
  }

  return async function observeBlockFn() {
    return observeProviderBlockFn({
      provider
    });
  };
}

module.exports = {
  createProtectedPeakProviderObserver
};
