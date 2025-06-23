const hre = require("hardhat");
const { ethers } = hre;

const WETH_ADDRESS = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
const PROFITBOT_ADDRESS = "0x788F7Fb347f1cBCE6f675d89792992133c98E782";

async function main() {
  const [deployer] = await ethers.getSigners();
  const weth = await ethers.getContractAt(
    "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
    WETH_ADDRESS
  );

  const balance = await weth.balanceOf(PROFITBOT_ADDRESS);
  console.log(`✅ ProfitBot WETH balance: ${ethers.formatUnits(balance, 18)} WETH`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

