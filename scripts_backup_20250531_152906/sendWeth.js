const hre = require("hardhat");
const { ethers } = hre;
require("dotenv").config();

const WETH_ADDRESS = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"; // WETH on Polygon
const PROFITBOT_ADDRESS = "0x5B552317933F63783a7cA48044ce1dFE68B37e79"; //   Updated contract address

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("💸 Using deployer:", deployer.address);

  const weth = await ethers.getContractAt(
    "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
    WETH_ADDRESS,
    deployer
  );

  const amount = ethers.parseUnits("0.005", 18); // 0.005 WETH

  const tx = await weth.transfer(PROFITBOT_ADDRESS, amount);
  await tx.wait();

  console.log(`  Sent ${ethers.formatUnits(amount, 18)} WETH to ProfitBot: ${PROFITBOT_ADDRESS}`);
}

main().catch((error) => {
  console.error("  Error sending WETH:", error);
  process.exitCode = 1;
});

