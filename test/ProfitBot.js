const { ethers } = require('hardhat');
const assert = require('node:assert/strict');
describe('ProfitBot callback validation', function () {
  let bot, owner, other;
  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();
    const provider = await (await ethers.getContractFactory('TestAddressProvider')).deploy(owner.address);
    await provider.deployed();
    bot = await (await ethers.getContractFactory('ProfitBot')).deploy(
      provider.address, other.address, owner.address, other.address, other.address);
    await bot.deployed();
  });
  it('rejects callback not originating at Aave pool', async function () {
    try {
      await bot.connect(other).executeOperation(owner.address, 100, 1, bot.address, '0x');
      assert.fail('expected revert');
    } catch (e) { assert.match(e.message, /Only callable by Aave pool/); }
  });
  it('rejects zero minimum outputs before any swap', async function () {
    const legType =
      'tuple(uint8 venue,address tokenIn,address tokenOut,uint256 minAmountOut,bytes32 venueData)[]';

    const params = ethers.utils.defaultAbiCoder.encode(
      [legType],
      [[
        [0, owner.address, other.address, 0, ethers.constants.HashZero],
        [1, other.address, bot.address, 1, ethers.constants.HashZero],
        [0, bot.address, owner.address, 1, ethers.constants.HashZero]
      ]]
    );

    try {
      await bot.executeOperation(owner.address, 100, 1, bot.address, params);
      assert.fail('expected revert');
    } catch (e) {
      assert.match(e.message, /Zero minimum output/);
    }
  });

  it('rejects an Aave provider that returns a zero pool address', async function () {
    const provider = await (await ethers.getContractFactory('TestAddressProvider')).deploy(
      ethers.constants.AddressZero
    );
    await provider.deployed();

    try {
      await (await ethers.getContractFactory('ProfitBot')).deploy(
        provider.address, other.address, owner.address, other.address, other.address
      );
      assert.fail('expected revert');
    } catch (e) {
      assert.match(e.message, /Invalid Aave pool/);
    }
  });
});
