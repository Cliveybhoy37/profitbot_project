const hre = require("hardhat");
const { ethers } = hre;
require("dotenv").config();

const PROFITBOT_ADDRESS = "0x2B6C245344ED69D83868F77d003F253CDB99777a"; // ✅ Updated
const WETH = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"; // Polygon WETH

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🔁 Using deployer:", deployer.address);

  const weth = await ethers.getContractAt(
    "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
    WETH
  );

  const amount = ethers.parseUnits("0.005", 18);
  const tx = await weth.transfer(PROFITBOT_ADDRESS, amount);
  await tx.wait();

  console.log(`✅ Sent ${ethers.formatUnits(amount, 18)} WETH to ProfitBot`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

