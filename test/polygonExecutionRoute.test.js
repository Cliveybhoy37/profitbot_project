const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  LEG_TYPE,
  buildExecutionLegs,
  encodeExecutionLegs
} = require("../scripts/utils/polygonExecutionRoute");

const USDC_E = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const WBTC = "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6";
const WPOL = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";

test("builds the historical V3 -> Sushi V2 -> V3 execution route", () => {
  const discovered = [
    {
      venue: "UNISWAP_V3",
      tokenIn: USDC_E,
      tokenOut: WBTC,
      amountOut: ethers.BigNumber.from("1181"),
      fee: 500,
      poolId: null
    },
    {
      venue: "SUSHISWAP_V2",
      tokenIn: WBTC,
      tokenOut: WPOL,
      amountOut: ethers.BigNumber.from("9321029991304088712"),
      fee: null,
      poolId: null
    },
    {
      venue: "UNISWAP_V3",
      tokenIn: WPOL,
      tokenOut: USDC_E,
      amountOut: ethers.BigNumber.from("1002137"),
      fee: 500,
      poolId: null
    }
  ];

  const legs = buildExecutionLegs(discovered, 0);

  assert.deepEqual(
    legs.map(leg => ({
      venue: leg.venue,
      tokenIn: leg.tokenIn,
      tokenOut: leg.tokenOut,
      minAmountOut: leg.minAmountOut.toString(),
      venueData: leg.venueData
    })),
    [
      {
        venue: 2,
        tokenIn: USDC_E,
        tokenOut: WBTC,
        minAmountOut: "1181",
        venueData: ethers.utils.hexZeroPad(ethers.utils.hexlify(500), 32)
      },
      {
        venue: 1,
        tokenIn: WBTC,
        tokenOut: WPOL,
        minAmountOut: "9321029991304088712",
        venueData: ethers.constants.HashZero
      },
      {
        venue: 2,
        tokenIn: WPOL,
        tokenOut: USDC_E,
        minAmountOut: "1002137",
        venueData: ethers.utils.hexZeroPad(ethers.utils.hexlify(500), 32)
      }
    ]
  );

  const encoded = encodeExecutionLegs(legs);

  const canonicalType =
    "tuple(uint8 venue,address tokenIn,address tokenOut,uint256 minAmountOut,bytes32 venueData)[]";

  const expected = ethers.utils.defaultAbiCoder.encode(
    [canonicalType],
    [[
      [2, USDC_E, WBTC, "1181", ethers.utils.hexZeroPad(ethers.utils.hexlify(500), 32)],
      [1, WBTC, WPOL, "9321029991304088712", ethers.constants.HashZero],
      [2, WPOL, USDC_E, "1002137", ethers.utils.hexZeroPad(ethers.utils.hexlify(500), 32)]
    ]]
  );

  assert.equal(encoded, expected);
});

test("builds the historical V3 -> Balancer V2 -> V3 execution route", () => {
  const WETH = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
  const BALANCER_POOL_ID =
    "0x32fc95287b14eaef3afa92cccc48c285ee3a280a000100000000000000000005";

  const discovered = [
    {
      venue: "UNISWAP_V3",
      tokenIn: USDC_E,
      tokenOut: WETH,
      amountOut: ethers.BigNumber.from("405700159370346"),
      fee: 500,
      poolId: null
    },
    {
      venue: "BALANCER_V2",
      tokenIn: WETH,
      tokenOut: WPOL,
      amountOut: ethers.BigNumber.from("9910152638245722736"),
      fee: null,
      poolId: BALANCER_POOL_ID
    },
    {
      venue: "UNISWAP_V3",
      tokenIn: WPOL,
      tokenOut: USDC_E,
      amountOut: ethers.BigNumber.from("1002583"),
      fee: 500,
      poolId: null
    }
  ];

  const legs = buildExecutionLegs(discovered, 0);

  assert.equal(legs[0].venue, 2);
  assert.equal(
    legs[0].venueData,
    ethers.utils.hexZeroPad(ethers.utils.hexlify(500), 32)
  );

  assert.equal(legs[1].venue, 3);
  assert.equal(legs[1].venueData, BALANCER_POOL_ID);
  assert.equal(legs[1].minAmountOut.toString(), "9910152638245722736");

  assert.equal(legs[2].venue, 2);
  assert.equal(legs[2].minAmountOut.toString(), "1002583");

  const encoded = encodeExecutionLegs(legs);

  const decoded = ethers.utils.defaultAbiCoder.decode(
    [LEG_TYPE],
    encoded
  )[0];

  assert.equal(decoded.length, 3);
  assert.equal(decoded[1].venue, 3);
  assert.equal(decoded[1].venueData, BALANCER_POOL_ID);
});

test("applies execution slippage in basis points", () => {
  const discovered = [
    {
      venue: "UNISWAP_V3",
      tokenIn: USDC_E,
      tokenOut: WBTC,
      amountOut: ethers.BigNumber.from("1000000"),
      fee: 500,
      poolId: null
    },
    {
      venue: "SUSHISWAP_V2",
      tokenIn: WBTC,
      tokenOut: WPOL,
      amountOut: ethers.BigNumber.from("2000000"),
      fee: null,
      poolId: null
    },
    {
      venue: "UNISWAP_V3",
      tokenIn: WPOL,
      tokenOut: USDC_E,
      amountOut: ethers.BigNumber.from("3000000"),
      fee: 500,
      poolId: null
    }
  ];

  const legs = buildExecutionLegs(discovered, 50);

  assert.equal(legs[0].minAmountOut.toString(), "995000");
  assert.equal(legs[1].minAmountOut.toString(), "1990000");
  assert.equal(legs[2].minAmountOut.toString(), "2985000");
});

test("rejects unsafe execution route inputs", () => {
  const baseLegs = [
    {
      venue: "UNISWAP_V3",
      tokenIn: USDC_E,
      tokenOut: WBTC,
      amountOut: ethers.BigNumber.from("1000000"),
      fee: 500,
      poolId: null
    },
    {
      venue: "SUSHISWAP_V2",
      tokenIn: WBTC,
      tokenOut: WPOL,
      amountOut: ethers.BigNumber.from("2000000"),
      fee: null,
      poolId: null
    },
    {
      venue: "UNISWAP_V3",
      tokenIn: WPOL,
      tokenOut: USDC_E,
      amountOut: ethers.BigNumber.from("3000000"),
      fee: 500,
      poolId: null
    }
  ];

  assert.throws(
    () => buildExecutionLegs(baseLegs.slice(0, 2), 50),
    /Exactly three discovered legs required/
  );

  assert.throws(
    () => buildExecutionLegs(baseLegs, -1),
    /slippageBps must be an integer from 0 to 9999/
  );

  assert.throws(
    () => buildExecutionLegs(baseLegs, 10000),
    /slippageBps must be an integer from 0 to 9999/
  );

  assert.throws(
    () => buildExecutionLegs(
      [{ ...baseLegs[0], venue: "UNKNOWN" }, ...baseLegs.slice(1)],
      50
    ),
    /Unsupported execution venue/
  );

  assert.throws(
    () => buildExecutionLegs(
      [{ ...baseLegs[0], fee: 0 }, ...baseLegs.slice(1)],
      50
    ),
    /Uniswap V3 execution leg requires a valid fee/
  );

  assert.throws(
    () => buildExecutionLegs(
      [
        baseLegs[0],
        {
          ...baseLegs[1],
          venue: "BALANCER_V2",
          poolId: ethers.constants.HashZero
        },
        baseLegs[2]
      ],
      50
    ),
    /Balancer execution leg requires a valid poolId/
  );

  assert.throws(
    () => buildExecutionLegs(
      [{ ...baseLegs[0], amountOut: ethers.constants.Zero }, ...baseLegs.slice(1)],
      50
    ),
    /Execution leg requires positive amountOut/
  );

  assert.throws(
    () => buildExecutionLegs(
      [{ ...baseLegs[0], tokenIn: undefined }, ...baseLegs.slice(1)],
      50
    ),
    /Execution leg requires distinct valid token addresses/
  );

  assert.throws(
    () => buildExecutionLegs(
      [baseLegs[0], { ...baseLegs[1], tokenIn: USDC_E }, baseLegs[2]],
      50
    ),
    /Execution route is not contiguous/
  );

  assert.throws(
    () => buildExecutionLegs(
      [baseLegs[0], baseLegs[1], { ...baseLegs[2], tokenOut: WBTC }],
      50
    ),
    /Execution route must close to the starting token/
  );
});
