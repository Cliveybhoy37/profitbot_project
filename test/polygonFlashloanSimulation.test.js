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
