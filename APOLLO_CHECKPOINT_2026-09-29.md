# Apollo Checkpoint — 2026-09-29

## Purpose

This checkpoint records the durable ProfitBot state after completing the
dynamic Balancer edge observer experiment on Polygon.

It should be read together with:

- `APOLLO_CHECKPOINT_2026-09-28.md`
- current source code
- current tests
- git history

Current source code and git history remain authoritative if older prose
conflicts with the repository.

---

## Repository State at Start of This Checkpoint

Repository:

`/workspaces/profitbot_project`

Branch:

`repair/simulation-safety`

Working tree before creating this checkpoint:

`## repair/simulation-safety...origin/repair/simulation-safety`

The repository was clean and synchronized with origin.

Latest pushed commit before this checkpoint:

`72839a2 Add repeated Balancer edge observer`

No secrets belong in this checkpoint.

---

## Live ProfitBot Deployment

ProfitBot contract:

`0xDDAdb712e936f6bEE8c98452E8913f212Dcd007a`

Owner:

`0x1B786608D3F073e44910bB975413f97A11Dd7bcA`

Deployment transaction:

`0xb0e897e2c784b6a128bda6bc049c82f373a46cc5e25b54ba171c836ed03ab12c`

Deployment block:

`94566628`

Deployment status:

`1`

The deployed contract has been structurally verified.

This does NOT establish profitability.

No live flashloan was submitted during the research recorded here.

---

## Safety State

Live execution remains:

`OFF`

Current research scripts are read-only.

Do not submit a live transaction merely because a route is gross-positive.

Required progression remains:

1. Gross-positive executable quotes.
2. Cover current Aave flashloan premium.
3. Cover realistic gas and execution costs.
4. Exact ProfitBot/provider simulation.
5. Human review.
6. Explicit authorization.
7. MetaMask signing only after all previous gates pass.

Do not place private keys, seed phrases, passwords, RPC secrets, API secrets,
or `.env` contents in chat, checkpoints, source files, or git.

Do not modify or regenerate `.env` without a specific justified need.

---

## Dynamic Balancer Research Architecture

The current dynamic research path searches verified Balancer edges and
constructs three-leg cycles around them.

General route form:

`USDC_E -> token A -> token B -> USDC_E`

One Balancer leg is mandatory.

External entry/exit venues currently include supported Polygon DEX venues.

Balancer API metadata proposes candidate pools.

Balancer Vault/on-chain state verifies pool tokens and ordering.

Only supported WEIGHTED/STABLE Balancer pools are used by this research path.

The scanner performs:

market discovery
-> on-chain Balancer verification
-> external liquidity evidence
-> orientation pruning
-> executable quote evaluation
-> gross economics
-> Aave premium gate

Live execution is not part of this scanner.

---

## Multi-Size Dynamic Scanner

The dynamic scanner now supports multiple research sizes in one discovery run.

Current observer sizes:

`0.05,0.1,0.25,0.5,1,2,5,10 USDC_E`

Discovery and orientation pruning occur once.

Each size receives independent executable quote/economic evaluation.

The scanner reports:

- successful quotes
- gross-positive candidates
- premium-covered candidates
- gross edge in basis points

Gross basis-point telemetry uses integer BigNumber arithmetic.

---

## Repeated Balancer Edge Observer

Observer:

`scripts/observeBalancerDynamicEdges.js`

Committed as:

`72839a2 Add repeated Balancer edge observer`

The observer repeatedly launches the read-only dynamic scanner and records:

- pinned Polygon block
- best gross edge
- amount
- pool
- route
- premium shortfall
- complete scanner output

Research logs are written under:

`research/`

and are ignored by git.

Observer execution remains read-only.

---

## Completed 10-Observation Experiment

Command used:

`OBSERVE_RUNS=10 OBSERVE_INTERVAL_SECONDS=60 node scripts/observeBalancerDynamicEdges.js`

Completed successfully.

Log:

`research/balancer-edge-observer-2026-09-28T23-14-40-164Z.log`

Observation blocks ranged from:

`94621426`

through:

`94623754`

All 10 observations completed.

No live execution occurred.

---

## Dominant Route Across All 10 Observations

Pool:

`Balancer TUSD Stablepool`

Pool ID:

`0x0d34e5dd4d8f043557145598e4e2dc286b35fd4f000000000000000000000068`

Route:

`USDC_E -> TUSD -> USDT -> USDC_E`

Venues:

`SUSHISWAP_V2 -> BALANCER_V2 -> UNISWAP_V3`

Best observed size:

`0.05 USDC_E`

Best gross edge:

`4.40 bps`

Current research Aave flashloan premium:

`5.00 bps`

Premium shortfall:

`0.60 bps`

Premium-covered candidates:

`0`

This same 4.40 bps best edge persisted through all 10 observer snapshots.

---

## Persistent TUSD Size Curve

During the later observations the TUSD route repeatedly produced approximately:

`0.05 USDC_E -> 4.40 bps`

`0.10 USDC_E -> 4.40 bps`

`0.25 USDC_E -> 4.16 bps`

`0.50 USDC_E -> 3.52 bps`

`1.00 USDC_E -> 2.22 bps`

At larger tested sizes the route ceased to be gross-positive.

This shows increasing price impact with size.

The small-size edge was persistent but remained below the Aave premium before
gas.

---

## Secondary Gross-Positive Route

Pool:

`Balancer Polygon Stable Pool`

Pool ID:

`0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000012`

Route:

`USDC_E -> miMATIC -> USDT -> USDC_E`

Venues:

`SUSHISWAP_V2 -> BALANCER_V2 -> UNISWAP_V3`

Observed small-size gross edges were much weaker than the TUSD route.

Examples:

`0.05 USDC_E -> 1.20 bps`

`0.10 USDC_E -> 1.20 bps`

`0.25 USDC_E -> 0.76 bps`

This route also did not cover the flashloan premium.

---

## Conclusion From the Observer Experiment

The observer experiment succeeded as research even though it did not identify
an executable opportunity.

The current automatically discovered Balancer-edge universe repeatedly found a
real gross-positive TUSD route, but its best observed edge remained around
4.40 bps.

That is below the 5 bps flashloan premium used by the current research gate,
before gas or other execution costs.

Therefore:

- do NOT execute this route;
- do NOT keep probing progressively smaller notionals merely to chase the
  premium threshold;
- do NOT weaken the premium gate;
- do NOT rerun the same unchanged research repeatedly expecting a different
  economic result;
- preserve the observer for future market monitoring.

A materially different market state may make the route interesting later.

---

## Development Time / Capital Constraint

Development time and available personal capital are now important constraints.

ProfitBot must not consume money required for normal living expenses.

Do not spend transaction funds, subscription money, deployment money, or other
capital merely to keep experimentation moving.

Prefer short, read-only experiments that can quickly answer whether an
opportunity class has meaningful economics.

Research/simulation evidence must come before capital risk.

If an avenue does not show credible economics quickly, preserve the repository
state and move on rather than endlessly optimizing it.

---

## Next Research Track A — Curated / Exotic Three-Leg Routes

Keep the existing automatic scanner intact.

Add a separate candidate-generation research lane using external market
intelligence to identify deliberately selected Polygon token/pool combinations.

Potential research sources include:

- DEX Screener
- GeckoTerminal
- DeFiLlama
- Dune Analytics
- direct DEX/pool state

External/indexer data is candidate intelligence only.

Executable on-chain quotes and verified contract state remain authoritative.

Target route form:

`USDC_E -> token A -> token B -> USDC_E`

Research objective:

Find markets where liquidity is real but fragmented enough across venues that
larger temporary pricing discrepancies may exist.

Do not automatically add exotic tokens to the trusted six-token registry.

Before considering a token/route, validate:

- token contract/address
- decimals
- liquidity
- relevant pools
- quoteability
- transfer-tax/rebase/restriction behavior where relevant
- route continuity
- realistic trade size

Reject obvious fake-liquidity, honeypot, broken-token, negligible-depth, or
non-executable candidates.

Use a tightly limited candidate set first, roughly 10-20 high-quality
candidates rather than hundreds of random tokens.

For each candidate:

candidate intelligence
-> on-chain verification
-> three-leg route construction
-> venue permutation sweep
-> size sweep
-> gross gate
-> Aave premium
-> gas
-> exact ProfitBot simulation

---

## Next Research Track B — Lending Liquidations

Investigate liquidations as a separate opportunity class because protocol
liquidation incentives may provide a larger gross margin than tightly
arbitraged DEX routes.

Initial work must be READ-ONLY.

Protocols discussed for investigation:

- Spark / SparkLend
- Compound

Do not assume the same liquidation mechanism across protocols.

For repay-and-seize style liquidation flows, the conceptual atomic path is:

Aave flashloan
-> repay eligible borrower debt
-> receive/seize collateral according to protocol rules
-> swap collateral into flashloan repayment asset
-> repay flashloan principal + premium
-> retain positive remainder

Approximate economic test:

`collateral value received`
`- debt repaid`
`- flashloan premium`
`- swap losses/slippage`
`- gas`
`> 0`

Compound III must be researched separately because its liquidation/absorb
mechanics differ from a simple Aave-style repay-and-receive-collateral model.

Before writing execution code:

1. Verify current Polygon protocol deployments.
2. Verify liquidation mechanics from current contracts/documentation.
3. Determine how liquidatable accounts can be discovered.
4. Build a read-only unhealthy-position scanner.
5. Calculate actionable debt/collateral amounts.
6. Calculate theoretical liquidation incentive/discount.
7. Include flashloan premium.
8. Include collateral conversion/slippage.
9. Include realistic gas.
10. Only proceed toward execution architecture if credible positive economics
    remain.

No liquidation transaction should be attempted merely because an account is
underwater.

---

## Priority After This Checkpoint

Do NOT spend another session squeezing the existing 4.40 bps TUSD route.

The next work should maximize useful information per development hour.

Preferred immediate approach:

1. Preserve this checkpoint in git and push it.
2. Keep the existing Balancer observer unchanged for future monitoring.
3. Run a short read-only investigation of lending-liquidation opportunity
   availability/economics.
4. In parallel or immediately afterward, curate a small set of exotic/manual
   three-leg candidates from market-data sources.
5. Feed promising manual candidates through existing verification and economic
   gates rather than trusting external displayed prices.
6. Stop an avenue quickly if it cannot demonstrate economics comfortably above
   premium + gas.

If either research lane produces a credible candidate:

gross positive
-> premium covered
-> gas covered
-> exact ProfitBot/provider simulation
-> review
-> explicit authorization
-> signed execution

---

## Things Not To Change Casually

Do not casually modify:

- deployed ProfitBot Solidity
- locked historical route evidence
- locked gas evidence
- trusted token registry
- safety/profitability gates
- deployment addresses
- `.env`

The deployed Solidity should only be changed if a concrete defect or required
new execution capability is identified.

Liquidation execution, if pursued, may require separate architecture rather
than forcing liquidation logic into the existing three-swap ProfitBot.

---

## Recovery Instructions

If chat/session context is lost:

1. Read this file.
2. Read `APOLLO_CHECKPOINT_2026-09-28.md`.
3. Run `git status -sb`.
4. Run `git --no-pager log --oneline -15`.
5. Inspect current source/tests before trusting older README prose.
6. Never paste secrets while reconstructing state.

Remember:

Git/files persist when committed/pushed.

A running terminal process, dev server, unsaved editor buffer, Codespace
runtime state, and chat context are not guaranteed to persist.

---

## Current Stopping Point

The 10-run Balancer observer experiment is complete.

Result:

Persistent best gross edge = `4.40 bps`.

Aave premium gate = `5.00 bps`.

Premium-covered opportunities = `0`.

Live execution = `OFF`.

Immediate next task after recovery:

Choose the shortest read-only investigation between:

1. lending liquidation discovery/economics; and
2. curated exotic/manual three-leg route discovery.

Do not return to progressively smaller TUSD notionals without new evidence that
market conditions have materially changed.

Profit first. Lambo second.
