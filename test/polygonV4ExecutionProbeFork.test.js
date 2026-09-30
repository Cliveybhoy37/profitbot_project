const { ethers } = require("hardhat");
const assert = require("node:assert/strict");

describe("Polygon V4 isolated execution probe", function () {
  const BLOCK = 94709817;

  const WPOL =
    "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";

  const DAI =
    "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";

  const APEPE =
    "0xA3f751662e282E83EC3cBc387d225Ca56dD63D3A";

  const START =
    ethers.BigNumber.from("125000000000000000");

  // Frozen sequential-quote observations at block 94709817.
  const EXPECTED_DAI =
    ethers.BigNumber.from("14481764747850506");

  const EXPECTED_APEPE =
    ethers.BigNumber.from("12592522662788687883109");

  const EXPECTED_FINAL =
    ethers.BigNumber.from("141808483715718886");

  const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address,address) view returns (uint256)",
    "function transfer(address,uint256) returns (bool)"
  ];

  const WPOL_ABI = [
    ...ERC20_ABI,
    "function deposit() payable"
  ];

  before(async function () {
    const network = await ethers.provider.getNetwork();

    assert.equal(
      network.chainId,
      137,
      "expected Polygon chainId 137"
    );

    const block = await ethers.provider.getBlockNumber();

    assert.equal(
      block,
      BLOCK,
      `expected fork block ${BLOCK}, got ${block}`
    );
  });

  it("executes WPOL -> DAI -> V4 APEPE -> WPOL atomically", async function () {
    const [owner] = await ethers.getSigners();

    const Probe =
      await ethers.getContractFactory(
        "PolygonV4ExecutionProbe",
        owner
      );

    const probe = await Probe.deploy();
    await probe.deployed();

    const wpol = await ethers.getContractAt(
      WPOL_ABI,
      WPOL,
      owner
    );

    const dai = await ethers.getContractAt(
      ERC20_ABI,
      DAI,
      owner
    );

    const apepe = await ethers.getContractAt(
      ERC20_ABI,
      APEPE,
      owner
    );

    // Test setup only:
    // wrap exactly 0.125 fork-native POL, then transfer
    // exactly that WPOL into the isolated probe.
    await (
      await wpol.deposit({
        value: START
      })
    ).wait();

    await (
      await wpol.transfer(
        probe.address,
        START
      )
    ).wait();

    assert.equal(
      (await wpol.balanceOf(probe.address)).toString(),
      START.toString(),
      "probe funding mismatch"
    );

    assert(
      (await dai.balanceOf(probe.address)).isZero(),
      "probe starts with DAI"
    );

    assert(
      (await apepe.balanceOf(probe.address)).isZero(),
      "probe starts with APEPE"
    );

    const staticResult =
      await probe.callStatic.execute();

    console.log(
      "callStatic DAI:",
      staticResult.daiAfterEntry.toString()
    );

    console.log(
      "callStatic APEPE:",
      staticResult.apepeAfterV4.toString()
    );

    console.log(
      "callStatic final WPOL:",
      staticResult.finalWpol.toString()
    );

    // These exact comparisons deliberately test whether atomic
    // execution reproduces the frozen sequential quote observations.
    assert.equal(
      staticResult.daiAfterEntry.toString(),
      EXPECTED_DAI.toString(),
      "entry execution != frozen quote"
    );

    assert.equal(
      staticResult.apepeAfterV4.toString(),
      EXPECTED_APEPE.toString(),
      "V4 execution != frozen quote"
    );

    assert.equal(
      staticResult.finalWpol.toString(),
      EXPECTED_FINAL.toString(),
      "final execution != frozen quote"
    );

    const tx = await probe.execute();
    const receipt = await tx.wait();

    const finalWpol =
      await wpol.balanceOf(probe.address);

    const finalDai =
      await dai.balanceOf(probe.address);

    const finalApepe =
      await apepe.balanceOf(probe.address);

    const gross =
      finalWpol.sub(START);

    console.log(
      "fork gasUsed:",
      receipt.gasUsed.toString()
    );

    console.log(
      "start WPOL:",
      START.toString()
    );

    console.log(
      "final WPOL:",
      finalWpol.toString()
    );

    console.log(
      "gross WPOL:",
      gross.toString()
    );

    console.log(
      "residual DAI:",
      finalDai.toString()
    );

    console.log(
      "residual APEPE:",
      finalApepe.toString()
    );

    assert.equal(
      finalWpol.toString(),
      EXPECTED_FINAL.toString(),
      "atomic final WPOL mismatch"
    );

    assert(
      finalWpol.gt(START),
      "route was not gross profitable"
    );

    assert(
      finalDai.isZero(),
      "unexpected residual DAI"
    );

    assert(
      finalApepe.isZero(),
      "unexpected residual APEPE"
    );

    console.log(
      "ATOMIC_V4_ROUTE_OK"
    );
  });
});
