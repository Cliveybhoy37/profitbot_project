const { ethers } = require('hardhat');
const assert = require('node:assert/strict');
describe('ProfitBot callback validation', function () {
  let bot, owner, other;
  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();
    const provider = await (await ethers.getContractFactory('TestAddressProvider')).deploy();
    await provider.deployed();
    bot = await (await ethers.getContractFactory('ProfitBot')).deploy(
      provider.address, other.address, owner.address, other.address);
    await bot.deployed();
  });
  it('rejects callback not originating at Aave pool', async function () {
    try {
      await bot.connect(other).executeOperation(owner.address, 100, 1, bot.address, '0x');
      assert.fail('expected revert');
    } catch (e) { assert.match(e.message, /Only callable by Aave pool/); }
  });
  it('rejects zero minimum outputs before any swap', async function () {
    const abi = ethers.utils.defaultAbiCoder;
    const path1 = [owner.address, other.address], path2 = [other.address, owner.address];
    const params = abi.encode(['address','uint256','address[]','address[]','uint256','uint256'],
      [owner.address, 100, path1, path2, 0, 1]);
    try {
      await bot.executeOperation(owner.address, 100, 1, bot.address, params);
      assert.fail('expected revert');
    } catch (e) { assert.match(e.message, /Zero minimum output/); }
  });
});
