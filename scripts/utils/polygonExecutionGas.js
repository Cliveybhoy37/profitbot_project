"use strict";

const HISTORICAL_ROUTES = [
  {
    order: ["USDC_E", "WBTC", "WPOL"],
    venues: ["UNISWAP_V3", "SUSHISWAP_V2", "UNISWAP_V3"],
    fees: [500, null, 500],
    poolIds: [null, null, null],
    loanAmount: 1_000_000n,
    blockTag: 94_374_759,
    gasUnits: 481_396n,
    source: "measured Polygon fork execution at block 94374759"
  },
  {
    order: ["USDC_E", "WETH", "WPOL"],
    venues: ["UNISWAP_V3", "BALANCER_V2", "UNISWAP_V3"],
    fees: [500, null, 500],
    poolIds: [
      null,
      "0x32fc95287b14eaef3afa92cccc48c285ee3a280a000100000000000000000005",
      null
    ],
    loanAmount: 1_000_000n,
    blockTag: 93_974_759,
    gasUnits: 480_589n,
    source: "measured Polygon fork Balancer execution at block 93974759"
  }
];

function findMeasuredExecutionGas(route, loanAmount, blockTag) {
  if (
    !route ||
    !Array.isArray(route.order) ||
    !Array.isArray(route.legs) ||
    route.order.length !== 3 ||
    route.legs.length !== 3
  ) {
    return null;
  }

  for (const evidence of HISTORICAL_ROUTES) {
    if (
      loanAmount !== evidence.loanAmount ||
      blockTag !== evidence.blockTag
    ) {
      continue;
    }

    const orderMatches = evidence.order.every(
      (token, index) => route.order[index] === token
    );

    const legsMatch = evidence.venues.every((venue, index) => {
      const leg = route.legs[index];

      return (
        leg &&
        leg.venue === venue &&
        (leg.fee ?? null) === evidence.fees[index] &&
        (leg.poolId ?? null) === evidence.poolIds[index]
      );
    });

    if (orderMatches && legsMatch) {
      return {
        gasUnits: evidence.gasUnits,
        source: evidence.source
      };
    }
  }

  return null;
}

module.exports = {
  findMeasuredExecutionGas
};
