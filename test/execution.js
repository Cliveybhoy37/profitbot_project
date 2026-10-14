const { ethers } = require('hardhat');
const assert = require('node:assert/strict');

describe('Three-router loan simulation', function () {
  let token, bridge, middle, pool, bot, first, second, owner;
  const unit = ethers.utils.parseUnits('1', 18);
  const legType =
    'tuple(uint8 venue,address tokenIn,address tokenOut,uint256 minAmountOut,bytes32 venueData)[]';

  beforeEach(async () => {
    [owner] = await ethers.getSigners();

    const Token = await ethers.getContractFactory('TestToken');
    token = await Token.deploy('Loan');
    bridge = await Token.deploy('Bridge');
    middle = await Token.deploy('Middle');

    const Pool = await ethers.getContractFactory('TestPool');
    pool = await Pool.deploy();

    const Provider = await ethers.getContractFactory('TestProvider');
    const provider = await Provider.deploy(pool.address);

    const Router = await ethers.getContractFactory('TestRouter');
    first = await Router.deploy(11000);
    second = await Router.deploy(10000);

    const Bot = await ethers.getContractFactory('ProfitBot');
    bot = await Bot.deploy(
      provider.address,
      first.address,
      second.address,
      owner.address,
      owner.address
    );

    await token.mint(pool.address, unit.mul(100));
    await bridge.mint(first.address, unit.mul(100));
    await middle.mint(first.address, unit.mul(100));
    await middle.mint(second.address, unit.mul(100));
    await token.mint(first.address, unit.mul(100));
  });

  function params(min1, min2, min3) {
    return ethers.utils.defaultAbiCoder.encode(
      [legType],
      [[
        [0, token.address, bridge.address, min1, ethers.constants.HashZero],
        [1, bridge.address, middle.address, min2, ethers.constants.HashZero],
        [0, middle.address, token.address, min3, ethers.constants.HashZero]
      ]]
    );
  }

  it('repays loan and retains incremental profit after three hops', async () => {
    await bot.initiateFlashloan(
      token.address,
      unit,
      params(unit, unit, unit)
    );

    assert((await token.balanceOf(bot.address)).gt(0));
    assert((await token.balanceOf(pool.address)).gt(unit.mul(100)));
  });

  it('reverts atomically if a later hop cannot meet minimum output', async () => {
    let failed = false;

    try {
      await bot.initiateFlashloan(
        token.address,
        unit,
        params(unit, unit.mul(2), unit)
      );
    } catch (e) {
      failed = true;
      assert.match(e.message, /slippage/);
    }

    assert(failed);
    assert((await token.balanceOf(bot.address)).isZero());
  });

  it('rejects an unprofitable route despite an existing token balance', async () => {
    const Router = await ethers.getContractFactory('TestRouter');
    const lossRouter = await Router.deploy(8000);
    await token.mint(lossRouter.address, unit.mul(100));

    const Provider = await ethers.getContractFactory('TestProvider');
    const provider = await Provider.deploy(pool.address);

    const Bot = await ethers.getContractFactory('ProfitBot');

    const losingParams = ethers.utils.defaultAbiCoder.encode(
      [legType],
      [[
        [0, token.address, bridge.address, unit.div(2), ethers.constants.HashZero],
        [0, bridge.address, middle.address, unit.div(2), ethers.constants.HashZero],
        [1, middle.address, token.address, unit.div(2), ethers.constants.HashZero]
      ]]
    );

    // Route the final SUSHISWAP_V2 leg through the 0.8x router.
    const losingBotWithLossRouter = await Bot.deploy(
      provider.address,
      first.address,
      lossRouter.address,
      owner.address,
      owner.address
    );

    await token.mint(losingBotWithLossRouter.address, unit.mul(10));

    let failed = false;

    try {
      await losingBotWithLossRouter.initiateFlashloan(
        token.address,
        unit,
        losingParams
      );
    } catch (e) {
      failed = true;
      assert.match(e.message, /No incremental token profit/);
    }

    assert(failed);
    assert(
      (await token.balanceOf(losingBotWithLossRouter.address)).eq(unit.mul(10))
    );
  });

  it('rejects a route that only breaks even after the flashloan premium', async () => {
    const Router = await ethers.getContractFactory('TestRouter');
    const breakEvenRouter = await Router.deploy(10009);
    await bridge.mint(second.address, unit.mul(100));
    await token.mint(breakEvenRouter.address, unit.mul(100));

    const Provider = await ethers.getContractFactory('TestProvider');
    const provider = await Provider.deploy(pool.address);

    const Bot = await ethers.getContractFactory('ProfitBot');
    const breakEvenBot = await Bot.deploy(
      provider.address,
      second.address,
      breakEvenRouter.address,
      owner.address,
      owner.address
    );

    const breakEvenParams = ethers.utils.defaultAbiCoder.encode(
      [legType],
      [[
        [0, token.address, bridge.address, unit, ethers.constants.HashZero],
        [0, bridge.address, middle.address, unit, ethers.constants.HashZero],
        [1, middle.address, token.address, unit, ethers.constants.HashZero]
      ]]
    );

    let failed = false;

    try {
      await breakEvenBot.initiateFlashloan(
        token.address,
        unit,
        breakEvenParams
      );
    } catch (e) {
      failed = true;
      assert.match(e.message, /No incremental token profit/);
    }

    assert(failed);
    assert((await token.balanceOf(breakEvenBot.address)).isZero());
  });
});
