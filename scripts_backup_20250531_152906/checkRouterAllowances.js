const { ethers } = require("hardhat");

const TOKEN_HOLDING_ADDRESS = "0x5080090845FFAB362f588DE4f8537e4cCeD93360"; // your wallet
const TOKENS = {
  USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  wstETH: "0x03b54A6e9a984069379fae1a4fC4dBAE93B3bCCD"
};

const ROUTERS = {
  UNISWAP: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff", // QuickSwap
  SUSHI:   "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"  // SushiSwap
};

async function main() {
  for (const [tokenName, tokenAddr] of Object.entries(TOKENS)) {
    const token = await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
      tokenAddr
    );

    const spender = tokenName === "USDC" ? ROUTERS.UNISWAP : ROUTERS.SUSHI;
    const allowance = await token.allowance(TOKEN_HOLDING_ADDRESS, spender);
    const decimals = tokenName === "USDC" ? 6 : 18;
    const formatted = ethers.utils.formatUnits(allowance, decimals);

    console.log(`🧾 ${tokenName} allowance to ${spender} → ${formatted}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

