"use strict";

module.exports = Object.freeze({
  QUICKSWAP_V2: Object.freeze({
    type: "V2",
    router: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
    factory: "0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32"
  }),

  SUSHISWAP_V2: Object.freeze({
    type: "V2",
    router: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    factory: "0xc35DADB65012eC5796536bD9864eD8773aBc74C4"
  }),

  UNISWAP_V3: Object.freeze({
    type: "V3",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    quoter: "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6"
  })
});
