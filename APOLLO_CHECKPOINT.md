# Apollo / ProfitBot Development Checkpoint

Updated: 2026-10-02

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

0ba0ef2 Add Polygon V4 qualification envelope analysis

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

---

## 2026-10-01 Persistent Observation Logging Milestone

Repository state at completion:

Branch:

repair/simulation-safety

Code commit:

cf56677 Add persistent Polygon V4 watcher observations

Persistent observation logging is now implemented in:

scripts/research/watchPolygonV4LiveOpportunities.js

The watcher appends one JSON object per completed qualification cycle to:

research/runtime/polygon-v4/live-opportunities/observations.jsonl

The runtime directory is already excluded by `.gitignore`.

This means completed observations survive terminal scroll and watcher
process termination while remaining outside normal Git commits.

The logger reuses the existing `serializableSummary()` representation.

Logging occurs only after a qualification cycle has completed and a
summary has been constructed.

It does not modify:

- candidate qualification
- slippage policy
- gas policy
- minimum-profit policy
- freshness policy
- worst-case profitability policy
- LIVE_READY authority
- execution parameters

The watcher remains:

provider only
NO SIGNER
NO TRANSACTION
NO BROADCAST

BROADCAST=false

Protected production files remained unchanged:

contracts/ProfitBot.sol
scripts/utils/polygonExecutionRoute.js
scripts/utils/polygonExecutionCandidate.js
scripts/scanAndExecute.js

### Regression Validation

Focused V4 regression suite:

35 tests
35 passed
0 failed

Included:

- watcher
- live candidate set
- live qualification
- candidate preflight
- observed candidate
- execution route

`git diff --check` passed.

### Controlled Live Polygon Validation

Provider:

ALCHEMY_POLYGON

No RPC credential value was printed or stored in this checkpoint.

Controlled run:

3 iterations
30-second polling
heartbeat every 2 iterations

Result:

RUN_STATUS=0
LIVE_READY=false
BROADCAST=false

Three JSONL observations were successfully persisted.

Observed blocks:

94767807
94767829
94767851

Observation 1:

block 94767807
gas 275.707044585 gwei
best candidate V3_125_OPTIMIZED
gross 0.015487101534649177 WPOL
protected gas ceiling 12.460237181 gwei
LIVE_READY=false
BROADCAST=false

Observation 2:

block 94767829
gas 277.439228614 gwei
best candidate V3_125_OPTIMIZED
gross 0.015444545977764108 WPOL
protected gas ceiling 12.399747496 gwei
LIVE_READY=false
BROADCAST=false

Observation 3:

block 94767851
gas 273.994804609 gwei
best candidate V3_125_OPTIMIZED
gross 0.015512403142962512 WPOL
protected gas ceiling 12.49620161 gwei
LIVE_READY=false
BROADCAST=false

Current conclusion:

The historical route family remains gross-positive, and
V3_125_OPTIMIZED remained the best candidate during this controlled
sample.

Current Polygon gas remained far above the protected profitability
ceiling.

The current blocker remains gas economics rather than absence of gross
route spread.

Do not weaken profitability, slippage, gas, freshness, or worst-case
safety policy to force LIVE_READY.

### Runtime Evidence

Controlled validation file:

research/runtime/polygon-v4/live-opportunities/controlled-observations.jsonl

Record count at validation:

3

This file is intentionally Git-ignored.

The normal long-running watcher uses:

research/runtime/polygon-v4/live-opportunities/observations.jsonl

### Next Work

Immediate next step:

Run the committed persistent watcher and accumulate a larger observation
sample.

Then add read-only summary statistics over the JSONL observations,
including:

- observation count
- minimum gas
- maximum gas
- maximum gross delta
- maximum protected gas ceiling
- closest gas-to-ceiling ratio
- candidate changes
- qualification-state changes

Do not introduce a signer or broadcast capability during this stage.

If LIVE_READY is ever observed:

1. Stop/freeze the relevant evidence.
2. Do not broadcast.
3. Requalify against current head and current gas.
4. Run the final fork/execution-path simulation.
5. Preserve evidence.
6. Only consider signer/execution work as a separate reviewed stage.

### Updated Recovery Anchor

Current durable code anchor:

cf56677 Add persistent Polygon V4 watcher observations

The watcher process itself remains transient.

Codespaces suspension can terminate it.

Persisted project files and Git commits survive independently of the
watcher process.

Runtime JSONL files persist only for as long as the Codespace filesystem
itself remains available and should not be treated as a substitute for
Git or external durable storage.

## 2026-10-01 Polygon V4 Observation Analyzer Milestone

### Source milestone

Observation analysis was added in:

- `9629a87 Add Polygon V4 observation analysis`

Files added:

- `scripts/research/analyzePolygonV4Observations.js`
- `test/polygonV4ObservationAnalyzer.test.js`

The analyzer is read-only research tooling. It consumes persistent Polygon V4 watcher JSONL observations and does not create or alter qualification readiness.

It does not add a signer, submit transactions, broadcast, or modify production execution.

### Analyzer capabilities

The analyzer reports:

- observation count
- monitoring period and duration
- first and last quote blocks
- minimum, average, and maximum observed gas price
- minimum, average, and maximum best-candidate gross delta
- minimum, average, and maximum protected gas ceiling
- candidate win frequency
- candidate changes
- qualification-state changes
- LIVE_READY event count
- qualification failure reasons
- closest protected gas-ceiling-to-actual-gas observation
- best historical gross observation
- contiguous economics trend periods classified as:
  - `IMPROVING`
  - `DETERIORATING`
  - `FLAT`

Economics trend direction is based on the protected gas-ceiling / actual gas-price ratio. A higher ratio moves toward executable economics; a lower ratio moves away.

### Validation

Analyzer unit tests:

- 9 tests
- 9 passed
- 0 failed

Focused Polygon V4 regression after analyzer changes:

- 44 tests
- 44 passed
- 0 failed

`git diff --check` was clean.

Protected execution files were unchanged.

The regression was run under:

- Node `v24.21.0`

Repository `.nvmrc` still specifies:

- Node `18.20.8`

The restarted Codespace did not have Node 18.20.8 installed. No Node installation, dependency installation, dependency upgrade, or environment migration was performed during this milestone.

### 744-observation research sample

Persistent Mac/Codespace observation data survived the Codespace restart and contained:

- observations: `744`
- period: `2026-10-01T12:21:35.456Z -> 2026-10-01T19:11:09.203Z`
- blocks: `94768101 -> 94784484`
- duration: `6h 49m 33s`

Observed gas:

- minimum: `239.124478139 gwei`
- average: `275.880224531 gwei`
- maximum: `290.266772552 gwei`

Best-candidate gross delta:

- minimum: `0.014028934154687933 WPOL`
- average: `0.016716184249653561 WPOL`
- maximum: `0.019998569388452416 WPOL`

Best protected gas ceiling:

- minimum: `10.387556405 gwei`
- average: `14.207290468 gwei`
- maximum: `18.872966487 gwei`

Candidate results:

- `V3_125_OPTIMIZED` won `744 / 744`
- candidate changes: `0`
- qualification-state changes: `0`
- LIVE_READY events: `0`

Qualification failures:

- `Candidate has negative expected net profit`: `2976`

This is `744 observations * 4 candidates`.

Economics trend periods:

- total: `418`
- improving: `209`
- deteriorating: `208`
- flat: `1`

These are contiguous direction periods, not individual observation counts. The near-even improving/deteriorating split indicates frequent oscillation rather than a sustained move toward executable economics.

Closest observation to the protected gas ceiling:

- capturedAt: `2026-10-01T17:04:13.939Z`
- block: `94779407`
- candidate: `V3_125_OPTIMIZED`
- actual gas: `266.30043875 gwei`
- protected gas ceiling: `18.872966487 gwei`
- ceiling / actual gas: `7.0870%`

Best historical gross observation:

- capturedAt: `2026-10-01T17:01:28.301Z`
- block: `94779297`
- candidate: `V3_125_OPTIMIZED`
- gross: `0.019998569388452416 WPOL`
- actual gas: `273.269376763 gwei`
- protected gas ceiling: `18.872966487 gwei`
- stage: `PREFLIGHT`
- reason: `Candidate has negative expected net profit`

Interpretation:

The monitored route continued to show positive gross spread, but observed Polygon gas remained far above the protected execution ceiling. No observation qualified for LIVE_READY. The safety policy was not weakened to manufacture readiness.

### HP / watcher operational boundary

HP Bugs remains the primary persistent monitoring machine.

The Mac/Codespace watcher was retired after HP persistence was proven.

The analyzer milestone did not modify or restart the HP watcher service.

Current operational policy remains:

- provider-only monitoring
- no signer
- no transaction submission
- no broadcast
- `LIVE_READY=false` unless all existing qualification and safety-policy checks pass

Do not weaken profitability, slippage, gas, freshness, minimum-profit, or worst-case policy to create readiness.

### Current development boundary

Continue to keep production integration isolated.

Do not modify without a separately reviewed production-integration stage:

- `ProfitBot.sol`
- `ThreeLegExecution`
- production execution route helpers
- frontend / MetaMask integration
- deployment addresses
- `.env`

Do not resurrect legacy `scanAndExecute.js`.

Do not submit a live-network transaction during research/qualification work.

### Recovery anchor

Current analyzer code milestone:

- `9629a87 Add Polygon V4 observation analysis`

Before further development, verify branch, HEAD, origin state, and worktree status from Git.

Next immediate repository action after this checkpoint update:

1. inspect the checkpoint diff
2. verify only `APOLLO_CHECKPOINT.md` changed
3. commit the checkpoint separately if clean
4. push the analyzer and checkpoint milestones to GitHub
5. leave HP Bugs running unchanged

## 2026-10-02 CI Repair and Toolchain Compatibility Guardrail

### CI repair confirmed
- Repair commit: `d954213` — `Fix CI test runner separation and Node alignment`
- GitHub Actions run: `36992951559`
- Result: SUCCESS
- The CI failure was caused by the Node-native test wildcard including Hardhat/Mocha fork tests that depend on Mocha globals such as `describe` and `it`.
- Normal tests are now separated by runner:
  - Node-native tests run through `test:node`.
  - Normal Hardhat/Mocha tests run through `test:hardhat`.
- Fork-specific Polygon regression tests remain separate and must not be silently added to ordinary CI without deliberate fork/RPC gating.
- GitHub Actions now takes its Node version from `.nvmrc`.
- Local CI-equivalent validation passed under Node `18.20.8` before the repair was pushed.
- GitHub's clean CI environment independently confirmed the repaired configuration passes.

### Toolchain compatibility guardrail
The currently validated build depends on the existing toolchain combination, including:
- Node `18.20.8` via `.nvmrc`.
- ethers `5.x` (currently `^5.8.0`).
- Hardhat `2.x` (currently `^2.20.2`).
- Existing Solidity compiler configuration, including Solidity `0.8.20` and the existing `0.7.6` fallback.

Do NOT casually upgrade or change ethers, Hardhat, Solidity compiler versions, or their associated compatibility configuration.

These versions are build-sensitive compatibility boundaries. A version change is not proven to break the build in every case, but it risks breaking the currently validated contract, test, plugin, ABI, fork, or deployment behavior.

Any future ethers, Hardhat, or Solidity compiler upgrade must:
1. Be performed as a separate, deliberate compatibility task.
2. Not be bundled into unrelated ProfitBot or CI changes.
3. Preserve the existing known-good configuration until the replacement is proven.
4. Run the complete normal test and compile suite.
5. Run applicable Polygon fork/execution regression tests before acceptance.
6. Be committed separately with clear upgrade and compatibility evidence.

### Checkpoint-file preservation rule
- `APOLLO_CHECKPOINT.md` is the current/live recovery checkpoint.
- Dated `APOLLO_CHECKPOINT_*.md` files are independent historical snapshots.
- Do not merge, overwrite, rewrite, or synchronize historical checkpoint contents into each other.
- New dated checkpoints must remain separate files alongside the existing checkpoints.

---

## 2026-10-02 Polygon V4 Qualification Envelope Milestone

### Repository state

Qualification-envelope code milestone:

- `0ba0ef2 Add Polygon V4 qualification envelope analysis`
- branch: `repair/simulation-safety`
- local HEAD and `origin/repair/simulation-safety` confirmed at `0ba0ef2`
- worktree clean after push and generated Hardhat artifact/cache cleanup

GitHub Actions validation:

- workflow: `ProfitBot CI`
- run: `37000380171`
- result: SUCCESS
- elapsed: `39s`

Validated local toolchain:

- Node: `18.20.8`
- npm: `10.8.2`
- ethers remains `5.x` (`^5.8.0`)
- Hardhat remains `2.x` (`^2.20.2`)
- no toolchain compatibility boundary was changed

### Qualification-envelope implementation

The observation analyzer now reports diagnostic distance from the existing
protected gas ceiling.

For the closest observation it reports:

- observed gas price
- existing protected `maxGasPriceWei`
- ceiling-to-observed-gas coverage
- gas-price deficit
- gas-price reduction required to reach that existing ceiling
- `qualifiesAtObservedGas`

`qualifiesAtObservedGas` is diagnostic only. It means the observed gas price
is at or below the already-computed protected gas ceiling. It is NOT a
replacement for, or equivalent to, the complete `LIVE_READY` qualification.

The analyzer does not alter candidate readiness and does not weaken or replace
the existing qualification policy.

### Regression validation

Focused observation-analyzer suite:

- tests: `11`
- passed: `11`
- failed: `0`

Complete normal regression:

- Node-native tests: `309`
- Hardhat tests: `29`
- total: `338`
- passed: `338`
- failed: `0`

Additional validation:

- analyzer syntax check: PASS
- `git diff --check`: PASS
- real observation analysis: PASS

The normal regression count increased from 336 to 338 because this milestone
added two deterministic qualification-envelope tests.

### Real 744-observation envelope result

Observation dataset:

- observations: `744`
- period: `2026-10-01T12:21:35.456Z -> 2026-10-01T19:11:09.203Z`
- blocks: `94768101 -> 94784484`
- duration: `6h 49m 33s`
- `V3_125_OPTIMIZED` wins: `744 / 744`
- candidate changes: `0`
- qualification-state changes: `0`
- LIVE_READY events: `0`
- negative expected-net-profit failures: `2976`

Closest observation to the existing protected gas ceiling:

- capturedAt: `2026-10-01T17:04:13.939Z`
- block: `94779407`
- candidate: `V3_125_OPTIMIZED`
- observed gas: `266.30043875 gwei`
- protected gas ceiling: `18.872966487 gwei`
- ceiling / observed gas: `7.0870%`
- gas-price deficit: `247.427472263 gwei`
- gas-price reduction required: `92.9129%`
- `qualifiesAtObservedGas=false`

This is a diagnostic statement about that observed candidate under the
existing protected policy. It does not manufacture or predict LIVE_READY.

### Safety boundary remains unchanged

This milestone did NOT change:

- the `700000` gas-unit qualification assumption
- Aave premium treatment
- safety reserve
- minimum net-profit requirement
- slippage protection
- freshness / `maxAgeBlocks`
- worst-case protected-profit checks
- candidate qualification logic
- execution contracts
- production routing
- deployment addresses
- `.env`
- signer behavior
- transaction submission
- broadcast behavior

Current research/monitoring boundary remains:

- provider only
- no signer
- no transaction
- no broadcast
- fail closed
- `LIVE_READY=false` unless every existing qualification and safety check passes

Do not reduce the safety policy to make observed opportunities appear ready.

### Machine boundary

HP Bugs remains the stable persistent monitoring machine and should remain
unchanged unless a separate monitoring change is deliberately reviewed.

The Codespace remains the development environment.

Do not assume Codespace processes survive suspension. Persist important state
in project files and Git; terminal processes and runtime state are transient.

### Recovery anchor

For recovery after chat/session loss:

1. `cd /workspaces/profitbot_project`
2. `nvm use`
3. `git status -sb`
4. `git --no-pager log -5 --oneline --decorate`
5. inspect this live `APOLLO_CHECKPOINT.md`

Expected code milestone before this checkpoint update is committed:

- branch: `repair/simulation-safety`
- code HEAD: `0ba0ef2`
- origin: `0ba0ef2`
- qualification-envelope CI: SUCCESS (`37000380171`)
- normal regression: `338 / 338`
- LIVE_READY events in analyzed 744-record dataset: `0`

`APOLLO_CHECKPOINT.md` is the live recovery checkpoint.

Dated `APOLLO_CHECKPOINT_*.md` files remain independent historical snapshots
and must not be merged, overwritten, or synchronized by this update.
