const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const TOKENS = require("../scripts/utils/polygonScannerTokens");
const {
  normalizeDiscoveredLegs
} = require("../scripts/utils/polygonExecutionCandidate");
const {
  buildExecutionLegs,
  encodeExecutionLegs
} = require("../scripts/utils/polygonExecutionRoute");

test("normalizes scanner discovery legs into execution-address legs", () => {
  const result = {
    legs: [
      {
        from: "USDC_E",
        to: "WBTC",
        venue: "UNISWAP_V3",
        amountOut: ethers.BigNumber.from("1181"),
        fee: 500,
        poolId: null
      },
      {
        from: "WBTC",
        to: "WPOL",
        venue: "SUSHISWAP_V2",
        amountOut: ethers.BigNumber.from("9321029991304088712"),
        fee: null,
        poolId: null
      },
      {
        from: "WPOL",
        to: "USDC_E",
        venue: "UNISWAP_V3",
        amountOut: ethers.BigNumber.from("1002137"),
        fee: 500,
        poolId: null
      }
    ]
  };

  const normalized = normalizeDiscoveredLegs(result, TOKENS);

  assert.deepEqual(normalized, [
    {
      venue: "UNISWAP_V3",
      tokenIn: TOKENS.USDC_E.address,
      tokenOut: TOKENS.WBTC.address,
      amountOut: ethers.BigNumber.from("1181"),
      fee: 500,
      poolId: null
    },
    {
      venue: "SUSHISWAP_V2",
      tokenIn: TOKENS.WBTC.address,
      tokenOut: TOKENS.WPOL.address,
      amountOut: ethers.BigNumber.from("9321029991304088712"),
      fee: null,
      poolId: null
    },
    {
      venue: "UNISWAP_V3",
      tokenIn: TOKENS.WPOL.address,
      tokenOut: TOKENS.USDC_E.address,
      amountOut: ethers.BigNumber.from("1002137"),
      fee: 500,
      poolId: null
    }
  ]);
});

test("rejects malformed discovery candidates", () => {
  assert.throws(
    () => normalizeDiscoveredLegs({ legs: [] }, TOKENS),
    /Execution candidate requires exactly three discovery legs/
  );

  const result = {
    legs: [
      {
        from: "UNKNOWN_TOKEN",
        to: "WBTC",
        venue: "UNISWAP_V3",
        amountOut: ethers.BigNumber.from("1181"),
        fee: 500,
        poolId: null
      },
      {
        from: "WBTC",
        to: "WPOL",
        venue: "SUSHISWAP_V2",
        amountOut: ethers.BigNumber.from("9321029991304088712"),
        fee: null,
        poolId: null
      },
      {
        from: "WPOL",
        to: "USDC_E",
        venue: "UNISWAP_V3",
        amountOut: ethers.BigNumber.from("1002137"),
        fee: 500,
        poolId: null
      }
    ]
  };

  assert.throws(
    () => normalizeDiscoveredLegs(result, TOKENS),
    /Unknown scanner token: UNKNOWN_TOKEN/
  );
});

test("converts a scanner candidate into slippage-protected encoded execution legs", () => {
  const result = {
    legs: [
      {
        from: "USDC_E",
        to: "WBTC",
        venue: "UNISWAP_V3",
        amountOut: ethers.BigNumber.from("1181"),
        fee: 500,
        poolId: null
      },
      {
        from: "WBTC",
        to: "WPOL",
        venue: "SUSHISWAP_V2",
        amountOut: ethers.BigNumber.from("9321029991304088712"),
        fee: null,
        poolId: null
      },
      {
        from: "WPOL",
        to: "USDC_E",
        venue: "UNISWAP_V3",
        amountOut: ethers.BigNumber.from("1002137"),
        fee: 500,
        poolId: null
      }
    ]
  };

  const normalized = normalizeDiscoveredLegs(result, TOKENS);
  const executionLegs = buildExecutionLegs(normalized, 50);
  const encoded = encodeExecutionLegs(executionLegs);

  assert.equal(executionLegs[0].minAmountOut.toString(), "1175");
  assert.equal(
    executionLegs[1].minAmountOut.toString(),
    "9274424841347568268"
  );
  assert.equal(executionLegs[2].minAmountOut.toString(), "997126");

  assert.ok(ethers.utils.isHexString(encoded));

  const legType =
    "tuple(uint8 venue,address tokenIn,address tokenOut,uint256 minAmountOut,bytes32 venueData)[]";

  const decoded = ethers.utils.defaultAbiCoder.decode(
    [legType],
    encoded
  )[0];

  assert.equal(decoded.length, 3);
  assert.equal(decoded[0].venue, 2);
  assert.equal(decoded[0].tokenIn, TOKENS.USDC_E.address);
  assert.equal(decoded[0].tokenOut, TOKENS.WBTC.address);
  assert.equal(decoded[1].venue, 1);
  assert.equal(decoded[2].venue, 2);
  assert.equal(decoded[2].tokenOut, TOKENS.USDC_E.address);
});

test("requires positive bounded slippage for live execution candidates", () => {
  const {
    validateLiveSlippageBps
  } = require("../scripts/utils/polygonExecutionCandidate");

  assert.equal(validateLiveSlippageBps(50), 50);
  assert.equal(validateLiveSlippageBps(1), 1);
  assert.equal(validateLiveSlippageBps(1000), 1000);

  assert.throws(
    () => validateLiveSlippageBps(0),
    /Live slippageBps must be an integer from 1 to 1000/
  );

  assert.throws(
    () => validateLiveSlippageBps(1001),
    /Live slippageBps must be an integer from 1 to 1000/
  );

  assert.throws(
    () => validateLiveSlippageBps(50.5),
    /Live slippageBps must be an integer from 1 to 1000/
  );
});
