const { ethers } = require('hardhat');
const assert = require('node:assert/strict');

describe('Three-leg venue execution', function () {
  let loan, bridge, middle, pool, bot, v3, sushi, balancer;
  const unit = ethers.utils.parseUnits('1', 18);
  const feeData = ethers.utils.hexZeroPad(ethers.utils.hexlify(3000), 32);

  beforeEach(async function () {
    const Token = await ethers.getContractFactory('TestToken');
    loan = await Token.deploy('Loan');
    bridge = await Token.deploy('Bridge');
    middle = await Token.deploy('Middle');

    const Pool = await ethers.getContractFactory('TestPool');
    pool = await Pool.deploy();

    const Provider = await ethers.getContractFactory('TestProvider');
    const provider = await Provider.deploy(pool.address);

    const V3 = await ethers.getContractFactory('TestV3Router');
    v3 = await V3.deploy(11000);

    const V2 = await ethers.getContractFactory('TestRouter');
    sushi = await V2.deploy(10000);

    const Balancer = await ethers.getContractFactory('TestBalancerVault');
    balancer = await Balancer.deploy(10000);

    const Bot = await ethers.getContractFactory('ProfitBot');
    bot = await Bot.deploy(
      provider.address,
      sushi.address,
      sushi.address,
      v3.address,
      balancer.address
    );

    await loan.mint(pool.address, unit.mul(100));
    await bridge.mint(v3.address, unit.mul(100));
    await middle.mint(sushi.address, unit.mul(100));
    await middle.mint(balancer.address, unit.mul(100));
    await loan.mint(v3.address, unit.mul(100));
  });

  function params() {
    const legType =
      'tuple(uint8 venue,address tokenIn,address tokenOut,uint256 minAmountOut,bytes32 venueData)[]';

    return ethers.utils.defaultAbiCoder.encode(
      [legType],
      [[
        [2, loan.address, bridge.address, unit, feeData],
        [1, bridge.address, middle.address, unit.mul(105).div(100), ethers.constants.HashZero],
        [2, middle.address, loan.address, unit.mul(115).div(100), feeData]
      ]]
    );
  }

  it('executes V3 -> Sushi V2 -> V3 using each actual output as the next input', async function () {
    await bot.initiateFlashloan(loan.address, unit, params());

    assert((await loan.balanceOf(bot.address)).gt(0));
    assert((await loan.balanceOf(pool.address)).gt(unit.mul(100)));
  });

  it('rejects routes that do not contain exactly three legs', async function () {
    const legType =
      'tuple(uint8 venue,address tokenIn,address tokenOut,uint256 minAmountOut,bytes32 venueData)[]';

    const twoLegParams = ethers.utils.defaultAbiCoder.encode(
      [legType],
      [[
        [2, loan.address, bridge.address, unit, feeData],
        [2, bridge.address, loan.address, unit, feeData]
      ]]
    );

    let failed = false;

    try {
      await bot.initiateFlashloan(loan.address, unit, twoLegParams);
    } catch (e) {
      failed = true;
      assert.match(e.message, /Exactly three legs required/);
    }

    assert(failed);
  });


  it('rejects a route that does not start with the loan asset', async function () {
    const legType =
      'tuple(uint8 venue,address tokenIn,address tokenOut,uint256 minAmountOut,bytes32 venueData)[]';

    const badParams = ethers.utils.defaultAbiCoder.encode(
      [legType],
      [[
        [2, bridge.address, middle.address, unit, feeData],
        [1, middle.address, bridge.address, unit, ethers.constants.HashZero],
        [2, bridge.address, loan.address, unit, feeData]
      ]]
    );

    let failed = false;

    try {
      await bot.initiateFlashloan(loan.address, unit, badParams);
    } catch (e) {
      failed = true;
      assert.match(e.message, /Route must start with loan asset/);
    }

    assert(failed);
  });


  it('rejects a route that does not close back to the loan asset', async function () {
    const legType =
      'tuple(uint8 venue,address tokenIn,address tokenOut,uint256 minAmountOut,bytes32 venueData)[]';

    const badParams = ethers.utils.defaultAbiCoder.encode(
      [legType],
      [[
        [2, loan.address, bridge.address, unit, feeData],
        [1, bridge.address, middle.address, unit, ethers.constants.HashZero],
        [2, middle.address, bridge.address, unit, feeData]
      ]]
    );

    let failed = false;

    try {
      await bot.initiateFlashloan(loan.address, unit, badParams);
    } catch (e) {
      failed = true;
      assert.match(e.message, /Route not closed/);
    }

    assert(failed);
  });


  it('rejects a route whose adjacent legs are not contiguous', async function () {
    const legType =
      'tuple(uint8 venue,address tokenIn,address tokenOut,uint256 minAmountOut,bytes32 venueData)[]';

    const badParams = ethers.utils.defaultAbiCoder.encode(
      [legType],
      [[
        [2, loan.address, bridge.address, unit, feeData],
        [1, middle.address, bridge.address, unit, ethers.constants.HashZero],
        [2, bridge.address, loan.address, unit, feeData]
      ]]
    );

    let failed = false;

    try {
      await bot.initiateFlashloan(loan.address, unit, badParams);
    } catch (e) {
      failed = true;
      assert.match(e.message, /Route not contiguous/);
    }

    assert(failed);
  });


  it('rejects unexpected venue data on a V2 leg', async function () {
    const legType =
      'tuple(uint8 venue,address tokenIn,address tokenOut,uint256 minAmountOut,bytes32 venueData)[]';

    const badParams = ethers.utils.defaultAbiCoder.encode(
      [legType],
      [[
        [2, loan.address, bridge.address, unit, feeData],
        [1, bridge.address, middle.address, unit, feeData],
        [2, middle.address, loan.address, unit, feeData]
      ]]
    );

    let failed = false;

    try {
      await bot.initiateFlashloan(loan.address, unit, badParams);
    } catch (e) {
      failed = true;
      assert.match(e.message, /Unexpected V2 data/);
    }

    assert(failed);
  });


  it('rejects a V3 leg with a zero fee', async function () {
    const legType =
      'tuple(uint8 venue,address tokenIn,address tokenOut,uint256 minAmountOut,bytes32 venueData)[]';

    const badParams = ethers.utils.defaultAbiCoder.encode(
      [legType],
      [[
        [2, loan.address, bridge.address, unit, ethers.constants.HashZero],
        [1, bridge.address, middle.address, unit, ethers.constants.HashZero],
        [2, middle.address, loan.address, unit, feeData]
      ]]
    );

    let failed = false;

    try {
      await bot.initiateFlashloan(loan.address, unit, badParams);
    } catch (e) {
      failed = true;
      assert.match(e.message, /Invalid V3 fee/);
    }

    assert(failed);
  });


  it('rejects a Balancer leg with a zero pool id', async function () {
    const legType =
      'tuple(uint8 venue,address tokenIn,address tokenOut,uint256 minAmountOut,bytes32 venueData)[]';

    const badParams = ethers.utils.defaultAbiCoder.encode(
      [legType],
      [[
        [2, loan.address, bridge.address, unit, feeData],
        [3, bridge.address, middle.address, unit, ethers.constants.HashZero],
        [2, middle.address, loan.address, unit, feeData]
      ]]
    );

    let failed = false;

    try {
      await bot.initiateFlashloan(loan.address, unit, badParams);
    } catch (e) {
      failed = true;
      assert.match(e.message, /Invalid Balancer pool/);
    }

    assert(failed);
  });


  it('rejects a leg that swaps a token to itself', async function () {
    const legType =
      'tuple(uint8 venue,address tokenIn,address tokenOut,uint256 minAmountOut,bytes32 venueData)[]';

    const badParams = ethers.utils.defaultAbiCoder.encode(
      [legType],
      [[
        [2, loan.address, bridge.address, unit, feeData],
        [1, bridge.address, bridge.address, unit, ethers.constants.HashZero],
        [2, bridge.address, loan.address, unit, feeData]
      ]]
    );

    let failed = false;

    try {
      await bot.initiateFlashloan(loan.address, unit, badParams);
    } catch (e) {
      failed = true;
      assert.match(e.message, /Invalid self swap/);
    }

    assert(failed);
  });


  it('rejects a leg containing a zero token address', async function () {
    const legType =
      'tuple(uint8 venue,address tokenIn,address tokenOut,uint256 minAmountOut,bytes32 venueData)[]';

    const badParams = ethers.utils.defaultAbiCoder.encode(
      [legType],
      [[
        [2, loan.address, bridge.address, unit, feeData],
        [1, bridge.address, ethers.constants.AddressZero, unit, ethers.constants.HashZero],
        [2, ethers.constants.AddressZero, loan.address, unit, feeData]
      ]]
    );

    let failed = false;

    try {
      await bot.initiateFlashloan(loan.address, unit, badParams);
    } catch (e) {
      failed = true;
      assert.match(e.message, /Invalid leg token/);
    }

    assert(failed);
  });


  it('executes V3 -> Balancer V2 -> V3', async function () {
    const legType =
      'tuple(uint8 venue,address tokenIn,address tokenOut,uint256 minAmountOut,bytes32 venueData)[]';

    const poolId = ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32);

    const balancerParams = ethers.utils.defaultAbiCoder.encode(
      [legType],
      [[
        [2, loan.address, bridge.address, unit, feeData],
        [3, bridge.address, middle.address, unit, poolId],
        [2, middle.address, loan.address, unit, feeData]
      ]]
    );

    await bot.initiateFlashloan(
      loan.address,
      unit,
      balancerParams
    );

    assert((await loan.balanceOf(bot.address)).gt(0));
    assert((await bridge.balanceOf(balancer.address)).gt(0));
    assert((await loan.balanceOf(pool.address)).gt(unit.mul(100)));
  });

});
