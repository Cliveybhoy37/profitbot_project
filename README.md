# ProfitBot (existing Polygon prototype)

This repository contains a Solidity Aave V3 flash loan receiver, DEX quote helpers, route files, and multiple historical scanners. It is **not validated for live arbitrage**. Live submission in `scripts/autoScanner.js` and `scripts/scanAndExecute.js` is disabled pending contract, quote, fee and fork simulation verification. `bot.js` and `scripts/simulateProfit.js` are disabled because their outputs were random.

## Cloud checks

GitHub Actions runs on Node 22 with `npm ci`, deterministic unit tests, syntax checks and Hardhat compilation. Locally in a modern isolated environment, run `npm ci && npm test && npx hardhat compile`. No wallet or RPC credentials are needed for these checks. Never commit `.env` files or wallet secrets.

## Architecture and known limits

`arb_routes.json` and `scripts/arb_routes.json` feed separate scanners. The quote helper checks V2 routers and falls back to 0x/ParaSwap, but `ProfitBot.sol` executes only a fixed Uniswap V2 style router followed by a fixed Sushi V2 style router, or a single Balancer swap. A successful API quote is therefore not proof of an executable route. The Balancer single swap cannot by itself return a different borrowed asset for loan repayment. Aave V3 flash loan premium must be read from the configured Pool for live estimates; hard-coded values are unsafe.

Quote comparisons must use the borrow token's decimals and include DEX pool fees and price impact at the actual size, flash loan premium, gas converted into borrow token units using current prices, slippage, and a successful transaction simulation at current state. `scripts/utils/netProfit.js` provides a deterministic final arithmetic gate and rejection reasons but is not wired to unverified scanner data. No live candidate is approved by the current pipeline.

Historical scripts and vendored Balancer sources are preserved for review. This branch does not claim supported live Aave, Balancer, Uniswap, Sushi, 0x or ParaSwap routes. Do not run other legacy transaction scripts with funded wallets.
