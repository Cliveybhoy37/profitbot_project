# Apollo Checkpoint — 2026-09-28 — Dynamic Balancer Edge Research

Continues from: APOLLO_CHECKPOINT.md

Repository: /workspaces/profitbot_project
Branch: repair/simulation-safety
Starting HEAD: 4ec5255 — Collect external liquidity evidence for Balancer edges

## Live ProfitBot state

Contract: 0xDDAdb712e936f6bEE8c98452E8913f212Dcd007a
Owner: 0x1B786608D3F073e44910bB975413f97A11Dd7bcA
Deployment tx: 0xb0e897e2c784b6a128bda6bc049c82f373a46cc5e25b54ba171c836ed03ab12c
Deployment block: 94566628
Deployment gas used: 1790837
Runtime bytecode: 7822 bytes

Deployment and configuration were verified.
Deployment success does NOT establish current profitability.
No live flashloan has been authorized or submitted during the current discovery phase.

## Execution safety boundary

Discovery and research remain read-only and signerless.
No private key is required in Codespaces.
MetaMask remains the signing boundary for any explicitly authorized future live transaction.

Before live execution a candidate must pass:
1. Fresh route discovery.
2. Gross-positive route economics.
3. Current Aave flashloan premium.
4. Current gas economics.
5. Exact provider-only ProfitBot simulation.
6. Human review of route and parameters.
7. Explicit authorization.
8. MetaMask signing.

Historical profitable routes are evidence only, not current opportunities.

## Monster Junior baseline

Latest completed dynamic Balancer scan:
- Block: 94608425
- Start asset: USDC_E
- Research amount: 10 USDC_E
- Balancer minimum API liquidity: $10,000
- Current Aave premium at scan block: 5 bps
- API pools: 1538
- Dynamic pool candidates: 26
- On-chain verified pools: 26
- Verified Balancer edges: 111
- Successful complete route quotes: 480
- Gross-positive candidates: 0
- Premium-covered candidates: 0

Each verified edge can have 2 Balancer orientations.
Each orientation can have 3 entry venues x 3 exit venues = 9 combinations.
Unpruned theoretical workload: 111 x 2 x 9 = 1998 route combinations.

Only 480 complete route quotes succeeded.
This identified external entry/exit availability as a major pruning opportunity.
It does NOT prove there are no profitable routes at other blocks, sizes or market conditions.

Current Balancer research support remains WEIGHTED and STABLE pools only.
The $10,000 liquidity threshold is a research priority filter, not a profitability rule.

## External-liquidity pruning work completed

22e4b7e — Add external liquidity availability probe
- Added probeExternalTokenLiquidity().
- Read-only directional entry/exit availability evidence.
- Raw reverse amount is route-existence evidence only.

ad3e002 — Add normalized external round-trip probe
- Added probeExternalRoundTrips().
- Exit probes consume the exact output of the entry quote.
- Handles token decimal/value differences naturally.

dc20436 — Add external round-trip delta evidence
- Added roundTripDelta to normalized external research results.
- This is market-quality evidence, NOT ProfitBot arbitrage profit.

7ba0129 — Add Balancer edge orientation research filter
- Added selectSupportedEdgeOrientations().
- Orientation 0 requires tokenA entry support plus tokenB exit support.
- Orientation 1 requires tokenB entry support plus tokenA exit support.
- A token does not need standalone round-trip support for an edge direction to survive.

fc540b6 — Deduplicate Balancer edge research tokens
- Added collectUniqueEdgeTokens().
- Deduplicates tokenA/tokenB endpoints by lowercase address.
- Preserves first-seen token object and order.
- Prevents probing the same endpoint once per edge.

4ec5255 — Collect external liquidity evidence for Balancer edges
- Added collectExternalLiquidityEvidence().
- Probes each supplied unique token once.
- Forwards provider, pinned blockTag, startToken and amountIn.
- Returns a Map keyed by lowercase token address.
- Default probe is probeExternalTokenLiquidity().
- Probe function remains injectable for unit tests.

Current polygonBalancerEdgeResearch test status at checkpoint: 5/5 passing.

## Exact next development step

Do NOT modify ProfitBot.sol.
Do NOT start live execution.
Do NOT rerun the unpruned Monster scan.

Next objective: integrate optional orientation pruning into polygonBalancerDynamicEdgeScanner.js.

Continue test-first.

First integration test must prove:
1. Discovery returns a known Balancer edge.
2. Orientation builder returns both orientations.
3. External evidence supports only one orientation.
4. Only that surviving orientation reaches evaluateBalancerEdgeCombinations().
5. Existing scanner behavior remains unchanged when pruning evidence is not supplied.

Pruning must happen BEFORE expensive 3x3 external venue combination evaluation.
Keep the integration injectable and read-only.

After implementation, measure:
- verified edge count
- unique endpoint token count
- tokens with entry support
- tokens with exit support
- edges with at least one viable orientation
- viable orientation count
- maximum venue combinations after pruning
- successful route quotes
- gross-positive candidates
- premium-covered candidates

Target pipeline:
verified Balancer edges -> unique tokens -> probe once per token -> evidence Map -> orientation pruning -> route combinations -> gross gate -> Aave premium -> gas -> exact simulation -> review -> explicit authorization

Multi-size probing comes after pruning/ranking, not before.

## Recovery and security

ALCHEMY_POLYGON may be used by read-only research without printing its value.
Never place private keys, seed phrases, passwords, RPC URLs or API secrets in checkpoints or chat.
Codespaces can stop independently; saved files and git history persist, running processes and transient terminal state may not.

GitHub currently reports 228 dependency vulnerabilities on the default branch.
Treat dependency remediation as a separate audit; do not perform blind upgrades during discovery work.

Core rule: Profit first, Lambo second.
A green test proves software behavior, not arbitrage profit.
