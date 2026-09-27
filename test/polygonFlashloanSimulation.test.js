const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  buildInitiateFlashloanCalldata
} = require("../scripts/utils/polygonFlashloanSimulation");

const TOKEN = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const PARAMS = "0x1234";

test("builds exact initiateFlashloan calldata", () => {
  const amount = ethers.BigNumber.from("1000000");

  const data = buildInitiateFlashloanCalldata(
    TOKEN,
    amount,
    PARAMS
  );

  const iface = new ethers.utils.Interface([
    "function initiateFlashloan(address token,uint256 amount,bytes params)"
  ]);

  const expected = iface.encodeFunctionData(
    "initiateFlashloan",
    [TOKEN, amount, PARAMS]
  );

  assert.equal(data, expected);

  const decoded = iface.decodeFunctionData(
    "initiateFlashloan",
    data
  );

  assert.equal(decoded.token, TOKEN);
  assert.equal(decoded.amount.toString(), "1000000");
  assert.equal(decoded.params, PARAMS);
});

test("rejects unsafe initiateFlashloan calldata inputs", () => {
  const {
    buildInitiateFlashloanCalldata
  } = require("../scripts/utils/polygonFlashloanSimulation");

  assert.throws(
    () =>
      buildInitiateFlashloanCalldata(
        ethers.constants.AddressZero,
        ethers.BigNumber.from("1000000"),
        "0x1234"
      ),
    /Flashloan token must be a valid nonzero address/
  );

  assert.throws(
    () =>
      buildInitiateFlashloanCalldata(
        TOKEN,
        ethers.constants.Zero,
        "0x1234"
      ),
    /Flashloan amount must be positive/
  );

  assert.throws(
    () =>
      buildInitiateFlashloanCalldata(
        TOKEN,
        ethers.BigNumber.from("1000000"),
        "not-hex"
      ),
    /Flashloan params must be valid hex data/
  );
});

test("simulates initiateFlashloan with explicit from and bot addresses", async () => {
  const {
    simulateInitiateFlashloan
  } = require("../scripts/utils/polygonFlashloanSimulation");

  const from = "0x1111111111111111111111111111111111111111";
  const bot = "0x2222222222222222222222222222222222222222";
  const data = "0xabcdef";

  const provider = {
    async call(transaction) {
      assert.equal(transaction.from, from);
      assert.equal(transaction.to, bot);
      assert.equal(transaction.data, data);
      return "0x";
    }
  };

  const result = await simulateInitiateFlashloan(
    provider,
    from,
    bot,
    data
  );

  assert.equal(result, "0x");
});

test("builds a guarded flashloan simulation request from a scanner candidate", () => {
  const TOKENS = require("../scripts/utils/polygonScannerTokens");
  const {
    buildFlashloanSimulationRequest
  } = require("../scripts/utils/polygonFlashloanSimulation");

  const candidate = {
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

  const request = buildFlashloanSimulationRequest({
    candidate,
    tokens: TOKENS,
    amount: ethers.BigNumber.from("1000000"),
    slippageBps: 50
  });

  assert.equal(request.token, TOKENS.USDC_E.address);
  assert.equal(request.amount.toString(), "1000000");
  assert.equal(request.legs.length, 3);

  assert.equal(request.legs[0].minAmountOut.toString(), "1175");
  assert.equal(
    request.legs[1].minAmountOut.toString(),
    "9274424841347568268"
  );
  assert.equal(request.legs[2].minAmountOut.toString(), "997126");

  assert.ok(ethers.utils.isHexString(request.params));
  assert.ok(ethers.utils.isHexString(request.data));

  const iface = new ethers.utils.Interface([
    "function initiateFlashloan(address token,uint256 amount,bytes params)"
  ]);

  const decoded = iface.decodeFunctionData(
    "initiateFlashloan",
    request.data
  );

  assert.equal(decoded.token, TOKENS.USDC_E.address);
  assert.equal(decoded.amount.toString(), "1000000");
  assert.equal(decoded.params, request.params);
});

test("rejects zero slippage at the guarded simulation-request boundary", () => {
  const TOKENS = require("../scripts/utils/polygonScannerTokens");
  const {
    buildFlashloanSimulationRequest
  } = require("../scripts/utils/polygonFlashloanSimulation");

  const candidate = {
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

  assert.throws(
    () =>
      buildFlashloanSimulationRequest({
        candidate,
        tokens: TOKENS,
        amount: ethers.BigNumber.from("1000000"),
        slippageBps: 0
      }),
    /Live slippageBps must be an integer from 1 to 1000/
  );
});
