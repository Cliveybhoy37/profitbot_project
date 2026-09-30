# Apollo / ProfitBot Development Checkpoint

Updated: 2026-09-30

## Current Objective

Develop ProfitBot toward safe automated Polygon flashloan arbitrage.

Current phase is deliberately READ-ONLY:

- continuous Polygon V4 opportunity qualification
- provider only
- no signer
- no transaction submission
- no broadcast
- fail closed unless all protected economics pass

Long-term target:

scan -> quote -> optimise loan size -> protected economics ->
preflight/simulate -> LIVE_READY gate -> controlled flashloan execution ->
verify realised profit -> continue scanning

Automatic execution has NOT been enabled.

---

## Git State

Branch:

repair/simulation-safety

Last confirmed code commit:

42d11b8 Add heartbeat to Polygon V4 opportunity watcher

Previous commits:

603f29f Add read-only Polygon V4 opportunity watcher
980afda Generalize live Polygon V4 candidate qualification
9eb6486 Add live Polygon V4 qualification probe
08fb468 Bind V4 preflight to protected execution legs
87981a0 Enforce worst-case V4 preflight profitability
e5fc9bc Bind V4 execution profit policy to preflight
b94a8ed Enforce V4 execution deadline and minimum profit
fcd5f56 Add Polygon V4 candidate preflight safety
6035d27 Bridge Polygon V4 observations to Aave execution
bfa6ced Add candidate-driven Aave Polygon V4 fork executor
4a11831 Add isolated Aave-funded Polygon V4 fork probe

Heartbeat validation before commit:

34 tests
34 passed
0 failed
git diff --check passed
protected production boundary clean

Controlled live heartbeat test:

3 iterations
heartbeat every 2 iterations
RUN_STATUS=0
LIVE_READY=false
BROADCAST=false

---

## Protected Production Boundary

Do NOT modify without explicit review:

contracts/ProfitBot.sol
scripts/utils/polygonExecutionRoute.js
scripts/utils/polygonExecutionCandidate.js
scripts/scanAndExecute.js

These remained clean during today's watcher work.

Do NOT resurrect legacy executeFlashloan.js or scanAndExecute.js execution.

---

## Current Live Watcher

File:

scripts/research/watchPolygonV4LiveOpportunities.js

Committed at:

42d11b8

Normal configuration used:

POLYGON_V4_WATCH_POLL_MS=30000

Behaviour:

- qualifies all configured candidates every 30 seconds
- full snapshot on initial state
- full snapshot on qualification-state change
- full snapshot on LIVE_READY
- quiet heartbeat every 10 iterations (~5 minutes)
- heartbeat contains current block, gas, best candidate, gross delta,
  protected gas ceiling, LIVE_READY and BROADCAST state
- evidence JSON is written if LIVE_READY occurs
- watcher then stops
- watcher has no signer
- watcher has no transaction path
- BROADCAST=false

Codespaces suspended during the evening monitoring run.

The watcher process was therefore lost, but the committed implementation is durable.

---

## Candidate Set

Current candidates:

1. V3_075
   Start: 0.075 WPOL
   Entry: UNISWAP_V3

2. SUSHI_V2_075
   Start: 0.075 WPOL
   Entry: SUSHISWAP_V2

3. QUICK_V2_075
   Start: 0.075 WPOL
   Entry: QUICKSWAP_V2

4. V3_125_OPTIMIZED
   Start: 0.125 WPOL
   Entry: UNISWAP_V3

All use the same core route family:

WPOL -> DAI -> APEPE -> WPOL

V4 pool ID:

0x6c6627aba26b073dd60b88b472b608f4f48f4e9eb5635efbd32095a76bea6c60

V4 PoolKey:

currency0 = DAI
currency1 = APEPE
fee = 10000
tickSpacing = 100
hooks = zero address
zeroForOne = true

Exit venue:

UNISWAP_V3

V3_125_OPTIMIZED remained the best candidate throughout the observed
evening monitoring period.

---

## Current Safety Policy

Policy gas units:

700000

Safety reserve:

0.001 WPOL

Minimum net profit:

0.005 WPOL

Deadline:

300 seconds

Aave premium observed:

5 bps

Maximum observation age:

3 blocks

Qualification protects both optimistic and execution-floor economics.

Protected final output is derived from the actual final execution leg's
minAmountOut.

The route must cover:

principal
+ Aave premium
+ modeled gas
+ safety reserve
+ minimum net profit

Worst-case protected profit must also satisfy the minimum-profit policy.

LIVE_READY may only come from the authoritative qualification/preflight
pipeline.

The watcher must never independently invent LIVE_READY.

Do NOT weaken these policies merely to force qualification.

---

## On-Chain Execution Safety

Isolated fork-stage executor:

PolygonV4CandidateExecutor.sol

ExecutionPlan contains:

deadline
minimumProfit
legs

The executor:

- validates deadline
- requires nonzero minimumProfit
- validates route
- revalidates in callback
- requires debt coverage
- calculates incremental profit
- requires realised incremental profit >= minimumProfit

Incremental accounting prevents prefunded balances from masking losses.

Production ProfitBot.sol has NOT been modified for V4.

---

## Proven Aave + V4 Fork Execution

Pinned historical block:

94709817

Flashloan:

0.125 WPOL

Aave premium:

0.0000625 WPOL
5 bps

Observed route output:

0.141808483715718886 WPOL

Debt:

0.1250625 WPOL

Retained after debt:

0.016745983715718886 WPOL

Hard-coded probe gas:

618122

Generic observed-candidate fork gas was approximately:

652106

Current live policy deliberately remains conservative at:

700000 gas units

---

## Historical Route Optimisation

Historical fine sweep tested approximately:

0.100 through 0.150 WPOL

Best observed gross point was:

0.125 WPOL

This is NOT established as the maximum possible flashloan size.

Future work should optimise protected NET profit over a broader loan-size
curve rather than assume 0.125 WPOL is permanently optimal.

---

## Evening Live Monitoring Results

The watcher ran successfully for many heartbeat cycles before Codespaces
suspended.

V3_125_OPTIMIZED remained the best candidate throughout the observed run.

Observed gross profit stayed approximately in the range:

0.01781 to 0.01955 WPOL

Observed protected gas ceiling stayed approximately in the range:

15.76 to 18.24 gwei

Lowest heartbeat gas observed in pasted watcher output:

140.952118233 gwei

Additional manually observed gas shortly before Codespaces suspension:

approximately 147 gwei, then approximately 159 gwei

Those last two values were seen by the operator but were not preserved in
the pasted heartbeat log.

Gas also repeatedly traded around approximately:

230 to 284 gwei

No observed candidate became LIVE_READY.

No transaction was submitted.

BROADCAST remained false.

Main current blocker:

Polygon gas price is substantially above the protected economic ceiling.

Important observation:

The gross V3_125_OPTIMIZED opportunity remained comparatively persistent
while network gas moved dramatically.

---

## Best Observed Heartbeat During Monitoring

Highest pasted gross observation:

Block:
94729543

Candidate:
V3_125_OPTIMIZED

Gross:
0.019552731696097667 WPOL

Protected gas ceiling:
18.239240053 gwei

Gas:
277.350033644 gwei

LIVE_READY=false

Lowest pasted gas heartbeat:

Block:
94728065

Gas:
140.952118233 gwei

Candidate:
V3_125_OPTIMIZED

Gross:
0.018279582355096607 WPOL

Protected gas ceiling:
16.429549204 gwei

LIVE_READY=false

The best gross conditions and lowest gas conditions did not occur at the
same observation.

---

## If LIVE_READY Is Ever Detected

DO NOT immediately broadcast.

Required sequence:

1. Freeze/save the watcher evidence.
2. Independently requalify against current head/current gas.
3. Verify candidate freshness.
4. Run final fork/execution-path simulation.
5. Verify protected slippage.
6. Verify Aave premium.
7. Verify gas economics.
8. Verify minimum protected net profit.
9. Only after explicit review consider introducing signer/broadcast.

---

## Infrastructure / Addresses

Canonical WPOL:

0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270

Polygon V4 PoolManager:

0x67366782805870060151383f4bbff9dab53e5cd6

Polygon V4 StateView:

0x5ea1bd7974c8a611cbab0bdcafcb1d9cc9b3ba5a

Polygon V4 Quoter:

0xb3d5c3dfc3a7aebff71895a7191796bffc2c81b9

Universal Router:

0xDc264714F68d84CF29BC605589405E78bDBE7C9f

Permit2:

0x000000000022D473030F116dDEE9F6B43aC78BA3

Uniswap V3 Router:

0xE592427A0AEce92De3Edee1F18E0157C05861564

Aave PoolAddressesProvider:

0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb

Known-good deployed production ProfitBot:

0xDDAdb712e936f6bEE8c98452E8913f212Dcd007a

Do not change deployment addresses during research work.

---

## Environment / Secret Rules

Never put any of the following in this checkpoint, git, terminal output,
or chat:

private keys
seed phrases
passwords
API secrets
RPC URLs containing credentials
verification codes

Known environment situation during today's work:

- INFURA_POLYGON was available in the original watcher terminal.
- A new terminal did not inherit INFURA_POLYGON.
- ALCHEMY_POLYGON was available there.
- No project-root .env file was present.
- Controlled heartbeat test successfully used the configured Alchemy
  Polygon RPC provider.

Do not print credential values.

---

## Codespaces Limitation

Git files and commits persist.

These are transient and can disappear when Codespaces suspends:

running watcher
terminal processes
shell exports
unsaved editor buffers
dev servers
temporary environment state

Do not rely on Codespaces as an always-on monitoring host.

---

## Planned Next Work

Priority 1:

Add persistent read-only watcher observation logging.

Suggested format:

JSONL and/or CSV

Record at least:

timestamp
block
gas price
candidate
gross delta
protected gas ceiling
qualification stage
reason
LIVE_READY
BROADCAST=false

Then add summary statistics:

minimum gas
maximum gas
maximum gross
maximum protected ceiling
closest gas-to-ceiling ratio
candidate changes
qualification-state changes
observation count

Priority 2:

Set up the newer HP laptop using WSL2 + Ubuntu.

Do not reproduce the project directly in ordinary Windows PowerShell if
avoidable.

Target environment:

Windows
-> WSL2
-> Ubuntu
-> Git / Node / npm / Hardhat
-> ProfitBot

Verify GitHub SSH access from inside WSL without exposing private keys.

Clone the repository rather than manually copying the Codespace.

Run tests before starting Bugs.

Priority 3:

Run the read-only watcher on the HP for longer unattended observation
periods.

No signer is required for this stage.

Priority 4:

Expand Bugs' discovery surface beyond the current four candidate routes.

Potential future work:

- broader token/pool discovery
- additional V2/V3/V4/Balancer combinations
- both route directions
- dynamic loan-size optimisation
- protected NET-profit ranking
- selective expensive simulation only after cheap filters pass

Priority 5:

Only after repeated real LIVE_READY/requalification/fork evidence,
design the separately controlled automatic execution stage.

---

## Recovery Commands

After any reset/session loss:

cd /workspaces/profitbot_project || exit 1

git status --short
git --no-pager log -5 --oneline

Expected durable code anchor before this checkpoint commit:

42d11b8 Add heartbeat to Polygon V4 opportunity watcher

Then inspect this file:

APOLLO_CHECKPOINT.md

Do not assume any watcher process survived a Codespaces suspension.

---

## Immediate Morning Plan

1. Recover repository state.
2. Confirm branch and clean worktree.
3. Read this checkpoint.
4. Decide whether to restart the current watcher temporarily.
5. Add persistent observation logging + tests.
6. Commit logging independently.
7. Begin HP / WSL2 setup.
8. Verify GitHub SSH inside WSL.
9. Clone ProfitBot and reproduce the tested read-only environment.
10. Run Bugs from a more persistent machine.
