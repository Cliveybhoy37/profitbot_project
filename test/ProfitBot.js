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
  it('withdraws a standard ERC20 balance to the owner', async function () {
    const token = await (await ethers.getContractFactory('TestToken')).deploy('Withdrawal Token');
    await token.deployed();
    await token.mint(bot.address, 100);

    await bot.withdrawToken(token.address);

    assert.equal((await token.balanceOf(bot.address)).toString(), '0');
    assert.equal((await token.balanceOf(owner.address)).toString(), '100');
  });

  it('rejects a token withdrawal when transfer returns false', async function () {
    const token = await (await ethers.getContractFactory('TestFalseReturnToken')).deploy();
    await token.deployed();
    await token.mint(bot.address, 100);

    try {
      await bot.withdrawToken(token.address);
      assert.fail('expected revert');
    } catch (e) {
      assert.match(e.message, /SafeERC20: ERC20 operation did not succeed/);
    }
  });

  it('withdraws Ether to a contract owner with a gas-consuming receive function', async function () {
    const receiver = await (await ethers.getContractFactory('TestGasConsumingOwner')).deploy();
    await receiver.deployed();

    const amount = ethers.utils.parseEther('1');
    await owner.sendTransaction({ to: bot.address, value: amount });
    await bot.transferOwnership(receiver.address);

    await receiver.withdrawEtherFrom(bot.address);

    assert.equal((await receiver.received()).toString(), amount.toString());
    assert.equal((await ethers.provider.getBalance(bot.address)).toString(), '0');
  });

});
