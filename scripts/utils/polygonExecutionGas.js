"use strict";

const HISTORICAL_ROUTE = {
  order: ["USDC_E", "WBTC", "WPOL"],
  venues: ["UNISWAP_V3", "SUSHISWAP_V2", "UNISWAP_V3"],
  fees: [500, null, 500],
  loanAmount: 1_000_000n,
  blockTag: 94_374_759,
  gasUnits: 479_395n,
  source: "measured Polygon fork execution at block 94374759"
};

function findMeasuredExecutionGas(route, loanAmount, blockTag) {
  if (
    !route ||
    !Array.isArray(route.order) ||
    !Array.isArray(route.legs) ||
    route.order.length !== 3 ||
    route.legs.length !== 3 ||
    loanAmount !== HISTORICAL_ROUTE.loanAmount ||
    blockTag !== HISTORICAL_ROUTE.blockTag
  ) {
    return null;
  }

  const orderMatches = HISTORICAL_ROUTE.order.every(
    (token, index) => route.order[index] === token
  );

  const legsMatch = HISTORICAL_ROUTE.venues.every(
    (venue, index) =>
      route.legs[index] &&
      route.legs[index].venue === venue &&
      (route.legs[index].fee ?? null) === HISTORICAL_ROUTE.fees[index]
  );

  if (!orderMatches || !legsMatch) {
    return null;
  }

  return {
    gasUnits: HISTORICAL_ROUTE.gasUnits,
    source: HISTORICAL_ROUTE.source
  };
}

module.exports = {
  findMeasuredExecutionGas
};
