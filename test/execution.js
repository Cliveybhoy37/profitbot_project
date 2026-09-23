const { ethers } = require('hardhat');
const assert = require('node:assert/strict');
describe('Two-router loan simulation', function () {
  let token, bridge, pool, bot, first, second, owner;
  const unit = ethers.utils.parseUnits('1',18);
  beforeEach(async () => {
    [owner] = await ethers.getSigners();
    const Token = await ethers.getContractFactory('TestToken');
    token = await Token.deploy('Loan'); bridge = await Token.deploy('Bridge');
    const Pool = await ethers.getContractFactory('TestPool'); pool = await Pool.deploy();
    const Provider = await ethers.getContractFactory('TestProvider'); const provider = await Provider.deploy(pool.address);
    const Router = await ethers.getContractFactory('TestRouter');
    first = await Router.deploy(11000); second = await Router.deploy(10000);
    const Bot = await ethers.getContractFactory('ProfitBot');
    bot = await Bot.deploy(provider.address, first.address, second.address, owner.address);
    await token.mint(pool.address, unit.mul(100));
    await bridge.mint(first.address, unit.mul(100));
    await token.mint(second.address, unit.mul(100));
  });
  function params(min1, min2) {
    return ethers.utils.defaultAbiCoder.encode(
      ['address','uint256','address[]','address[]','uint256','uint256'],
      [token.address,unit,[token.address,bridge.address],[bridge.address,token.address],min1,min2]);
  }
  it('repays loan and retains incremental profit after two hops', async () => {
    await bot.initiateFlashloan(token.address,unit,params(unit,unit));
    assert((await token.balanceOf(bot.address)).gt(0));
    assert((await token.balanceOf(pool.address)).gt(unit.mul(100)));
  });
  it('reverts if the second hop cannot meet minimum output', async () => {
    await second.deployed();
    let failed=false;
    try { await bot.initiateFlashloan(token.address,unit,params(unit,unit.mul(2))); }
    catch(e) { failed=true; assert.match(e.message,/slippage/); }
    assert(failed);
    assert((await token.balanceOf(bot.address)).isZero());
  });
  it('rejects an unprofitable route despite an existing token balance', async () => {
    await token.mint(bot.address, unit.mul(10));
    await second.deployed();
    const Router = await ethers.getContractFactory('TestRouter');
    // A 0.9 second hop would lose loan tokens; use a new bot wired to that router.
    const lossRouter = await Router.deploy(9000);
    await token.mint(lossRouter.address,unit.mul(100));
    const Provider = await ethers.getContractFactory('TestProvider');
    const provider = await Provider.deploy(pool.address);
    const Bot = await ethers.getContractFactory('ProfitBot');
    const losingBot = await Bot.deploy(provider.address,first.address,lossRouter.address,owner.address);
    await token.mint(losingBot.address, unit.mul(10));
    let failed=false;
    try { await losingBot.initiateFlashloan(token.address,unit,params(unit.div(2),unit.div(2))); }
    catch(e) { failed=true; assert.match(e.message,/No incremental token profit/); }
    assert(failed);
    assert((await token.balanceOf(losingBot.address)).eq(unit.mul(10)));
  });
});
