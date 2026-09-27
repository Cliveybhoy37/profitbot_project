# Apollo ProfitBot Checkpoint

## Current objective

Prepare the current ProfitBot for one controlled Polygon flashloan execution through a guarded sequence:

1. proven route
2. current quotes
3. positive-slippage-protected three-leg execution data
4. exact provider-only simulation
5. current gas/economics validation
6. explicit owner authorization
7. one controlled live transaction

No live transaction has been sent in the current workflow.

## Repository state

- Branch: `repair/simulation-safety`
- Current checkpoint commit: `8c30c71`
- Current working tree was clean when this checkpoint was created.
- `contracts/ProfitBot.sol` is authoritative.
- Committed generated ProfitBot artifact is intentionally stale.
- Always run a fresh compile immediately before deployment preparation.

## Current ProfitBot constructor

Five arguments, in this exact order:

1. Aave PoolAddressesProvider
2. QuickSwap V2 router
3. SushiSwap V2 router
4. Uniswap V3 router
5. Balancer Vault

Canonical Polygon addresses are maintained in:

`scripts/utils/polygonProfitBotConfig.js`

Do not substitute the old four-argument deployment path.

## Deployment status

Legacy `scripts/deployProfitBot.js` is disabled and incompatible with the current constructor. Do not revive it.

Fresh deployment preflight has been verified after:

`npx hardhat compile --force`

The fresh artifact passed:

`node scripts/preflightPolygonProfitBotDeployment.js`

Verified Aave pool:

`0x794a61358D6845594F94dc1DB02A252b5b4814aD`

Generated `artifacts/` and `cache/` were restored afterward so the working tree remained clean.

Historical fork deployment gas evidence:

`1,784,117`

Recent current-state read-only deployment gas estimate:

`1,806,217`

These are evidence, not hard-coded deployment limits.

## Existing deployment

Old deployment:

`0x064c68eEB942A92b5c2Fb0a7413e1D31796c8435`

This deployment is incompatible with the current ProfitBot interface and must not be used for the current simulation/live path.

A fresh current-version ProfitBot deployment is required.

## Simulation path

Committed read-only simulator:

`scripts/simulatePolygonProfitBotFlashloan.js`

Interface:

`node scripts/simulatePolygonProfitBotFlashloan.js <bot> <owner> <candidate.json> <loanAmount> <slippageBps>`

Safety properties:

- provider-only
- no Wallet
- no signer
- no private key
- no sendTransaction
- no broadcast path
- verifies deployed bytecode
- verifies current ProfitBot configuration
- verifies Aave pool
- verifies supplied public owner against `owner()`
- requires positive live slippage from 1 to 1000 bps
- uses exact three-leg ProfitBot encoding
- performs final simulation with `provider.call()`

Focused simulation/candidate/route tests: 15/15 passing.

## Candidate serialization

JSON candidate `amountOut` values must be positive decimal strings.

They are hydrated into `ethers.BigNumber` before execution-route construction to avoid JavaScript integer precision loss.

CLI `loanAmount` must also be supplied as a positive decimal string in base units.

## Locked route evidence

Do not casually modify the Solidity execution path, historical route fixtures, or locked gas evidence.

Proven historical route 1:

USDC.e -> WBTC -> WPOL -> USDC.e

Venues:

Uniswap V3 (500) -> SushiSwap V2 -> Uniswap V3 (500)

Polygon block:

`94374759`

Execution gas:

`481335`

Historical profit:

`1637` USDC.e base units on a `1000000` base-unit loan.

Proven historical route 2:

USDC.e -> WETH -> WPOL -> USDC.e

Venues:

Uniswap V3 (500) -> Balancer V2 -> Uniswap V3 (500)

Polygon block:

`93974759`

Execution gas:

`480528`

Historical profit:

`2083` USDC.e base units on a `1000000` base-unit loan.

Historical output amounts/profits are not assumed to be current live opportunities.

## Environment safety

Current workflow uses the existing read-only `ALCHEMY_POLYGON` environment variable.

Do not create, replace, print, or reconstruct the old project `.env`.

Do not place credentials in this checkpoint.

Old private keys, API secrets, and other credentials should be treated as potentially compromised and must not be reused for a new live deployment.

The eventual new owner/deployer wallet must be created and controlled by the user outside ChatGPT. Only its public address is needed for deployment preparation and simulation.

## Next steps

1. User creates/selects a new owner/deployer wallet outside ChatGPT.
2. Use only its public address in this workflow.
3. Fresh-compile ProfitBot immediately before deployment preparation.
4. Re-run deployment preflight.
5. Build/estimate the unsigned deployment transaction.
6. Keep signing/broadcast authorization separate and explicit.
7. Inspect the resulting deployed contract and verify owner/configuration.
8. Obtain fresh route quotes for the intended controlled test.
9. Run exact live-state provider-only flashloan simulation.
10. Re-check premium, gas, slippage, and net economics immediately before any authorized live transaction.

Never store private keys, seed phrases, passwords, RPC URLs, or API secrets in this file.
