🛠 NPM Compatibility Note:
To maintain ethers@5.x (required by Aave tools), use legacy peer dependency installs.

Example:
npm install --legacy-peer-deps <package-name>

Avoid auto-upgrading to ethers@6.x, which will break Aave integration and flashloan helpers.

📦 Hardhat Plugin Compatibility (Ethers v5 Safe Mode):

✅ Use @nomiclabs/hardhat-ethers@2.0.6 for ethers@5 compatibility
⛔️ Avoid @nomicfoundation/hardhat-toolbox unless upgrading to ethers@6
🧼 Minimal plugins for Hardhat setup to keep flashloan pipeline clean

📦 Clean package.json
✔️ ethers@5.8.0
✔️ @aave/contract-helpers
✔️ dotenv + hardhat only
🚫 no toolbox / ethers@6

📦 Solidity Contract Dependency:
Installed @aave/core-v3 to access Aave V3 interfaces like IPool, FlashLoanReceiverBase
Safe with ethers@5 and Hardhat 2.x

📦 Solidity Dependency:
Installed @uniswap/v2-periphery for Uniswap V2 router interface access.
Required for ProfitBot.sol to execute token swaps.
Safe with ethers@5 and Hardhat v2.

✅ Upgraded testAaveCall.js to use direct reserve reads from Aave V3
🔄 Replaced V2 mainnet contract with V3 Polygon Data Provider
✅ Queries real liquidity from Pool (aToken.balanceOf)
📊 Outputs now reflect live token liquidity

## ✅ Milestone: Flashloan-Ready Token Scanner (Aave V3 - Polygon)

**Script:** `scripts/scanFlashloanReadyTokens.js`  
**Created:** `May 2025`  
**Status:** ✅ Working (Verified with live data)

---

### 🔍 Purpose

This script analyzes all reserves on **Aave V3 (Polygon)** and identifies tokens with enough **available liquidity** to support a flashloan — based on caps defined in `.env`.

---

### 🧠 Functionality

- 📡 Connects to Aave V3 using `UiPoolDataProvider` helper
- 🔌 Uses Polygon Mainnet RPC (`POLYGON_RPC`)
- 🧾 Reads `.env` flashloan caps:
  - `FLASHLOAN_CAP_DAI`
  - `FLASHLOAN_CAP_USDC`
  - `FLASHLOAN_CAP_WETH`
- 📊 Filters only `borrowingEnabled == true` and `availableLiquidity > cap`
- 🧮 Converts raw BigNumbers to human-readable values
- ✅ Returns a clean, actionable list of flashloan-ready tokens

---

### 📄 Sample Output


