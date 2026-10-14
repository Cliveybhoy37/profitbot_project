const assert = require("assert");
const { ethers } = require("hardhat");

describe("Polygon V4 Aave-funded isolated execution probe", function () {
  const FORK_BLOCK = 94709817;

  const WPOL =
    "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";

  const START =
    ethers.BigNumber.from("125000000000000000");

  const EXPECTED_ROUTE_OUTPUT =
    ethers.BigNumber.from("141808483715718886");

  before(function () {
    if (process.env.USE_FORK_BLOCK !== "true") {
      this.skip();
    }

    const configuredBlock =
      Number(process.env.POLYGON_FORK_BLOCK || 0);

    assert.strictEqual(
      configuredBlock,
      FORK_BLOCK,
      "wrong fork block"
    );
  });

  it("borrows WPOL, executes V3 -> V4 -> V3, repays Aave, and retains profit", async function () {
    const [owner] = await ethers.getSigners();

    const Probe = await ethers.getContractFactory(
      "PolygonV4AaveExecutionProbe"
    );

    const probe = await Probe.deploy();
    await probe.deployed();

    const wpol = await ethers.getContractAt(
      [
        "function balanceOf(address) view returns (uint256)",
        "function allowance(address,address) view returns (uint256)"
      ],
      WPOL
    );

    const pool = await probe.AAVE_POOL();

    const beforeBalance =
      await wpol.balanceOf(probe.address);

    assert(
      beforeBalance.eq(0),
      "probe unexpectedly pre-funded"
    );

    console.log("probe:", probe.address);
    console.log("owner:", owner.address);
    console.log("Aave pool:", pool);
    console.log(
      "pre-flashloan WPOL:",
      beforeBalance.toString()
    );

    const tx =
      await probe.initiateFlashloan();

    const receipt =
      await tx.wait();

    const amount =
      await probe.lastAmount();

    const premium =
      await probe.lastPremium();

    const routeOutput =
      await probe.lastRouteOutput();

    const debt =
      await probe.lastDebt();

    const recordedProfit =
      await probe.lastProfitBeforeRepayment();

    const retained =
      await wpol.balanceOf(probe.address);

    const remainingPoolAllowance =
      await wpol.allowance(
        probe.address,
        pool
      );

    assert(
      amount.eq(START),
      "unexpected flashloan amount"
    );

    assert(
      routeOutput.eq(EXPECTED_ROUTE_OUTPUT),
      "route output changed"
    );

    assert(
      debt.eq(amount.add(premium)),
      "debt != amount + premium"
    );

    assert(
      recordedProfit.eq(routeOutput.sub(debt)),
      "recorded profit mismatch"
    );

    assert(
      retained.eq(recordedProfit),
      "retained WPOL mismatch"
    );

    // Aave should consume the exact repayment allowance.
    assert(
      remainingPoolAllowance.eq(0),
      "Aave repayment allowance not consumed"
    );

    assert(
      retained.gt(0),
      "no retained WPOL profit"
    );

    const premiumBps =
      premium.mul(10000).div(amount);

    const breakEvenGasPriceWei =
      retained.div(receipt.gasUsed);

    console.log(
      "amount:",
      amount.toString()
    );

    console.log(
      "premium:",
      premium.toString()
    );

    console.log(
      "premium WPOL:",
      ethers.utils.formatEther(premium)
    );

    console.log(
      "observed premium bps:",
      premiumBps.toString()
    );

    console.log(
      "route output WPOL:",
      routeOutput.toString()
    );

    console.log(
      "debt WPOL:",
      debt.toString()
    );

    console.log(
      "retained profit WPOL:",
      retained.toString()
    );

    console.log(
      "retained profit formatted:",
      ethers.utils.formatEther(retained)
    );

    console.log(
      "full flashloan gasUsed:",
      receipt.gasUsed.toString()
    );

    console.log(
      "break-even gas price wei:",
      breakEvenGasPriceWei.toString()
    );

    console.log(
      "break-even gas price gwei:",
      ethers.utils.formatUnits(
        breakEvenGasPriceWei,
        "gwei"
      )
    );

    console.log(
      "remaining Aave allowance:",
      remainingPoolAllowance.toString()
    );

    console.log("AAVE_V4_ROUTE_OK");
  });
});
