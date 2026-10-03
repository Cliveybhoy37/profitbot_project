# Apollo / ProfitBot Development Checkpoint

Updated: 2026-10-02

## ProfitBot Transition / Recovery Map

This section is the interpretation boundary for recovering ProfitBot from the
checkpoint history and Git history.

The repository records a continuous repair and development lineage, but that
lineage must not be interpreted as permission to merge historical
architectures into the current build.

Historical ProfitBot contracts, scanners, deployment paths, research tools,
and execution paths remain evidence of earlier project state unless later Git
history or a later checkpoint explicitly shows that they were retained,
replaced, disabled, or deliberately integrated.

A component belongs to the current build only when the current source tree and
later Git history retain it, or when a later checkpoint explicitly records its
approved integration.

When checkpoint descriptions overlap, use Git history and the current source
tree to determine the implemented state. Later recovery anchors supersede
earlier recovery state without erasing the earlier historical evidence.

Dated `APOLLO_CHECKPOINT_*.md` files are independent historical snapshots.
They must not be merged, rewritten, or synchronized merely to make them match
the current architecture.

### Development transition

The current build should be recovered as a chronological transition:

1. **2026-09-23 through 2026-09-27 — ProfitBot repair and safety foundation**
   - Unsafe execution paths were disabled or guarded.
   - Polygon quoting, discovery, economics, fork simulation, contract
     hardening, deployment inspection, and deployment validation were
     developed and tested.
   - This period establishes the repaired ProfitBot foundation; it is not a
     V4 architecture.

2. **2026-09-28 — Verified Polygon deployment and Balancer research**
   - A verified Polygon ProfitBot deployment was recorded.
   - Balancer opportunity discovery and economic research expanded.
   - The deployed/production ProfitBot remains an important historical and
     protected boundary.

3. **2026-09-29 — Opportunity research and Uniswap V3 coverage**
   - Balancer observations, broader Polygon opportunity research, and
     Uniswap V3 fee-tier coverage were checkpointed.
   - These findings form research inputs to the later transition; they do not
     imply that every researched route became part of the current execution
     architecture.

4. **2026-09-30 — Explicit Polygon V4 research transition**
   - Polygon V4 discovery, structural screening, economics, targeted sweeps,
     isolated fork probes, Aave-funded V4 execution probes, protected
     execution legs, preflight safety, live qualification, and the read-only
     V4 watcher were introduced incrementally.
   - V4 work was kept isolated from the protected production ProfitBot unless
     an explicit later integration step said otherwise.

5. **2026-10-01 — Persistent V4 observation and analysis**
   - Persistent provider-only observation logging was validated.
   - V4 observation analysis was added.
   - The HP/WSL Bugs observer became the stable monitoring appliance and was
     kept isolated from Codespace research work.

6. **2026-10-02 — Protected V4 economic qualification**
   - CI/toolchain guardrails were repaired and recorded.
   - Qualification-envelope, protected-budget, economic-waterfall, and
     protected amount-surface analysis were added.
   - The amount-surface runner remained provider-only: no signer, no
     transaction submission, and no broadcast.

### Current recovery boundary

At recovery anchor
`8487a3494b1416b456504ab3ffff37cc357d035c`
(`Update checkpoint after V4 protected amount surface`):

- branch: `repair/simulation-safety`
- local and remote branch state were synchronized
- `ProfitBot CI` run `37021761375` passed
- underlying Milestone 1B code anchor:
  `c52ed052229627c89907529fcd56c7b47305c62f`
- production execution contracts were not modified by Milestone 1B
- HP/WSL Bugs monitoring remained isolated and untouched
- signer: none
- transaction: none
- broadcast: false
- `LIVE_READY=false`

The current development direction is therefore the protected Polygon V4
research/qualification track built on top of the repaired ProfitBot project,
not an automatic merger of every historical ProfitBot component into V4.

Any future production integration must be explicit, reviewed, tested, and
checkpointed as a new transition. Until such a milestone exists, historical
production execution and current V4 research remain separate architectural
boundaries.

### Recovery rule for future Apollo sessions

Recover in this order:

1. Read this transition map.
2. Read the current objective, safety boundaries, and latest recovery anchor
   in `APOLLO_CHECKPOINT.md`.
3. Use the dated checkpoint files for historical context only.
4. Follow Git history chronologically when determining how the old ProfitBot
   became the current build.
5. Verify important claims against the current source tree and relevant Git
   commits before modifying code.
6. Never resurrect a disabled or historical execution path merely because it
   appears in an older checkpoint.
7. Never infer that an old production component is part of V4 unless Git or a
   later checkpoint explicitly records that integration.

---

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

a9c7933 Add Polygon V4 protected budget envelope analysis

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

- tests: `13`
- passed: `13`
- failed: `0`

Complete normal regression:

- Node-native tests: `311`
- Hardhat tests: `29`
- total: `340`
- passed: `340`
- failed: `0`

Additional validation:

- analyzer syntax check: PASS
- `git diff --check`: PASS
- real observation analysis: PASS

The normal regression count increased from 338 to 340 because this milestone
added two deterministic protected-budget economic-envelope tests.

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

### Protected gas-budget economic envelope

The analyzer now measures the protected gas budget directly against the
observed gas cost using exact integer arithmetic and the existing `700000`
gas-unit qualification assumption.

No readiness or execution policy is changed by this analysis.

Across all `744` observations / `2976` diagnostics:

- qualifying at observed gas: `0`

Smallest absolute protected gas-budget shortfall:

- capturedAt: `2026-10-01T17:59:53.817Z`
- block: `94781634`
- candidate: `V3_125_OPTIMIZED`
- protected gas budget: `0.009344708899712162 WPOL`
- observed 700000-unit gas cost: `0.1673871346973 WPOL`
- additional protected gas budget required: `0.158042425797587838 WPOL`
- budget coverage: `5.5826%`
- protected gas-budget uplift required: `1691.2503%`

Best protected gas-budget coverage:

- capturedAt: `2026-10-01T17:04:13.939Z`
- block: `94779407`
- candidate: `V3_125_OPTIMIZED`
- protected gas budget: `0.013211076541510153 WPOL`
- observed 700000-unit gas cost: `0.186410307125 WPOL`
- additional protected gas budget required: `0.173199230583489847 WPOL`
- budget coverage: `7.0870%`
- protected gas-budget uplift required: `1311.0152%`

The raw persisted observation at block `94781634` was independently checked:

- `gasPriceWei=239124478139`
- `gasBudgetWei=9344708899712162`
- exact observed gas cost: `167387134697300000 wei`
- exact protected-budget shortfall: `158042425797587838 wei`

Use the terms `additional protected gas budget required` and
`protected gas-budget uplift required`. These figures are not a pure
required-profit calculation.

The historical dataset therefore contains no observation whose protected gas
budget covers the observed gas cost. This describes the analyzed dataset only;
it is not a claim that future qualification is impossible.

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
- code HEAD: `a9c7933`
- origin: `a9c7933`
- protected-budget-envelope CI: SUCCESS (`37004189565`)
- normal regression: `340 / 340`
- Node-native tests: `311 / 311`
- Hardhat tests: `29 / 29`
- LIVE_READY events in analyzed 744-record dataset: `0`

`APOLLO_CHECKPOINT.md` is the live recovery checkpoint.

Dated `APOLLO_CHECKPOINT_*.md` files remain independent historical snapshots
and must not be merged, overwritten, or synchronized by this update.

---

## Polygon V4 economic-waterfall milestone — 2026-10-02

### Durable code milestone

Economic-waterfall analysis is committed and pushed:

- branch: `repair/simulation-safety`
- code commit: `69d5f10`
- commit title: `Add Polygon V4 economic waterfall analysis`
- origin: `69d5f10`
- ProfitBot CI run: `37009894588`
- CI result: SUCCESS
- CI duration: `38s`

The implementation remains research/analyzer-only.

Modified code files in the milestone:

- `scripts/research/analyzePolygonV4Observations.js`
- `test/polygonV4ObservationAnalyzer.test.js`

No production contract, execution route, deployment configuration, `.env`,
signer, transaction-submission path, or broadcast path was modified.

### Economic-waterfall reconstruction

The analyzer now reconstructs the persisted protected gas budget from its
economic components using the same premium arithmetic as the live V4
watcher/preflight:

`premium = amountIn * premiumBps / 10000`

The reconstruction is:

`protectedFinalOutput`
`- amountIn`
`- Aave premium`
`- safety reserve`
`- minimum net profit`
`= protected gas budget`

The analyzer sources the qualification gas-unit assumption, safety reserve,
and minimum-net-profit requirement from the existing live qualification
policy rather than duplicating new policy values.

The analysis is diagnostic only. It does not alter qualification or execution
policy and cannot create LIVE_READY.

### Real 744-observation waterfall result

Dataset:

- observations: `744`
- diagnostics: `2976`
- period: `2026-10-01T12:21:35.456Z -> 2026-10-01T19:11:09.203Z`
- blocks: `94768101 -> 94784484`

Waterfall integrity:

- eligible diagnostics: `2976`
- exact protected-budget reconstructions: `2976`
- reconstruction mismatches: `0`

Aggregate diagnostic components:

- total gross delta: `42.217370943598531775 WPOL`
- total protection haircut: `1.513086854717994217 WPOL`
- total Aave premium: `0.1302 WPOL`
- total safety reserve: `2.976 WPOL`
- total minimum net profit: `14.88 WPOL`
- total protected gas budget: `22.718084088880537558 WPOL`
- total modeled observed gas cost: `574.713683743822 WPOL`
- total economic deficit: `551.995599654941462442 WPOL`

These aggregate totals describe repeated diagnostic observations. They are
NOT realized trading P&L and must not be interpreted as realized losses or
profits.

### Best protected-budget waterfall

Best protected-budget coverage remains:

- capturedAt: `2026-10-01T17:04:13.939Z`
- block: `94779407`
- candidate: `V3_125_OPTIMIZED`
- gross delta: `0.019998569388452416 WPOL`
- protection haircut: `0.000724992846942263 WPOL`
- Aave premium: `0.0000625 WPOL`
- safety reserve: `0.001 WPOL`
- minimum net profit: `0.005 WPOL`
- protected gas budget: `0.013211076541510153 WPOL`
- reconstructed gas budget: `0.013211076541510153 WPOL`
- gas-budget difference: `0 wei`
- exact reconstruction: `true`
- modeled observed gas cost: `0.186410307125 WPOL`
- economic deficit: `0.173199230583489847 WPOL`

The observed modeled gas cost at this best-coverage point is therefore far
larger than the protected gas budget. The historical sample remains
economically unqualified under the existing policy.

This is evidence about the analyzed historical window only. It does not prove
that future qualification is impossible.

### Readiness result

For this dataset:

- qualification-state changes: `0`
- LIVE_READY events: `0`
- broadcast: `false`

Do not weaken profitability, gas, reserve, slippage, freshness, deadline,
minimum-profit, or worst-case protected-output policy to manufacture
readiness.

### Defensive reporting correctness

The final analyzer change also prevents a stale
`bestProtectedBudgetWaterfall` from being retained if a newer best protected-
budget-coverage row lacks the additional persisted fields required for
waterfall reconstruction.

The reporting path fails closed in that case rather than presenting the
waterfall from an older row as if it belonged to the current best-coverage
row.

A dedicated regression test covers this case.

### Validation

Pinned development/CI toolchain:

- Node: `18.20.8`
- npm: `10.8.2`

Before the final defensive reporting guard:

- Node-native tests: `314 / 314`
- Hardhat tests: `29 / 29`
- total normal regression: `343 / 343`
- failures: `0`
- analyzer syntax: PASS
- real observation analysis: PASS

After the final defensive reporting guard:

- focused observation-analyzer tests: `17 / 17`
- analyzer syntax: PASS
- real 744-observation analysis: PASS
- waterfall reconstruction: `2976 / 2976` exact
- waterfall mismatches: `0`
- `git diff --check`: PASS

Independent GitHub ProfitBot CI for commit `69d5f10`:

- run: `37009894588`
- result: SUCCESS
- duration: `38s`

### Codespace Node recovery note

After the Codespace restarted/rebuilt, its active runtime was temporarily:

- Node `24.21.0`
- npm `11.19.0`

Repository metadata had NOT been overwritten:

- `.nvmrc` still pinned `18.20.8`
- `package.json` unchanged
- `package-lock.json` unchanged
- declared `ethers` remained `^5.8.0`
- declared `hardhat` remained `^2.20.2`
- declared `@nomiclabs/hardhat-ethers` remained `^2.2.3`

The rebuilt Codespace simply did not have Node `18.20.8` installed in its
current NVM environment.

Installing the exact `.nvmrc` version restored:

- Node `18.20.8`
- npm `10.8.2`

No dependency upgrade or package-metadata change was required.

On future Codespace recovery, verify the active runtime rather than assuming
the runtime survived the rebuild.

### Current research interpretation

The economic waterfall confirms that the protected-budget calculation stored
by the watcher is internally consistent across every diagnostic in this
dataset.

For the observed window, gas cost dominates the available protected budget by
a large margin even at the best protected-budget-coverage observation.

Research should therefore focus on discovering materially larger genuine
gross edge and/or legitimately cheaper execution conditions while preserving
the existing safety requirements.

Do not interpret the historical deficit as proof that profitable future
conditions cannot occur.

### Safety boundary remains unchanged

Continue to enforce:

- provider only
- no signer
- no transaction
- no broadcast
- fail closed
- `LIVE_READY=false` unless every existing qualification check passes

Do NOT modify yet:

- `ProfitBot.sol`
- `ThreeLegExecution`
- production execution route helpers
- frontend / MetaMask integration
- production deployment addresses
- `.env`

Do not increase `maxAgeBlocks` or weaken minimum profit, reserve, slippage,
gas, deadline, or worst-case-output checks to make a candidate qualify.

### Machine boundary

HP Bugs remains the stable persistent monitoring machine and should remain
unchanged unless a separate monitoring change is deliberately reviewed.

The Codespace remains the development environment.

Codespace processes, shell state, dev servers, and installed runtime state are
transient across suspension/rebuild. Project files and committed/pushed Git
history are the durable recovery source.

### Superseding recovery anchor

For recovery after chat/session loss:

1. `cd /workspaces/profitbot_project`
2. inspect `.nvmrc`
3. verify `node --version` and `npm --version`
4. install/select the exact `.nvmrc` Node version if the rebuilt Codespace no
   longer has it
5. `git status -sb`
6. `git --no-pager log -5 --oneline --decorate`
7. inspect this live `APOLLO_CHECKPOINT.md`

Expected state at this recovery anchor:

- branch: `repair/simulation-safety`
- code HEAD: `69d5f10`
- origin: `69d5f10`
- economic-waterfall CI: SUCCESS (`37009894588`)
- pinned Node: `18.20.8`
- pinned npm: `10.8.2`
- normal regression: `343 / 343`
- focused final analyzer regression: `17 / 17`
- waterfall reconstruction: `2976 / 2976` exact
- waterfall mismatches: `0`
- LIVE_READY events in analyzed 744-record dataset: `0`
- signer: none
- transaction: none
- broadcast: false

`APOLLO_CHECKPOINT.md` remains the live recovery checkpoint.

Dated `APOLLO_CHECKPOINT_*.md` files remain independent historical snapshots
and must not be merged, overwritten, or synchronized by this update.

---

## Checkpoint — Polygon V4 Protected Amount Surface (Milestone 1B)

### Recovery anchor

- Branch: `repair/simulation-safety`
- Code milestone commit: `c52ed052229627c89907529fcd56c7b47305c62f`
- Commit subject: `Add Polygon V4 protected amount surface runner`
- Local and `origin/repair/simulation-safety` were synchronized after push.
- Independent GitHub Actions run: `37020767562`
- Workflow: `ProfitBot CI`
- Event: `push`
- Result: success
- Duration: 39 seconds
- This supersedes `147ce78e8ec8ad0718098259cbf7110ca006fb9d` as the latest fully CI-confirmed code recovery anchor before this checkpoint-only commit.

### Milestone 1B implementation

Added exactly two code/test files:

- `scripts/research/runPolygonV4AmountSurface.js`
- `test/polygonV4AmountSurfaceRunner.test.js`

Committed code delta:

- 2 files changed
- 904 insertions
- Runner: 537 lines
- Tests: 367 lines

The runner is research/provider-only. It does not introduce a signer, transaction submission, or broadcast path.

The amount surface reuses the established Polygon V4 route:

`WPOL -> DAI -> APEPE -> WPOL`

using the dominant V4 pool:

`0x6c6627aba26b073dd60b88b472b608f4f48f4e9eb5635efbd32095a76bea6c60`

The runner evaluates the existing fine-sweep amounts from `0.100` through `0.150` WPOL in `0.005` WPOL increments.

All observations in one surface run share:

- one pinned quote block
- one gas-price snapshot
- one Aave premium snapshot

Protected economics use the authoritative policy constants and the existing `amountSurfaceEconomics` helper rather than weakening or duplicating execution policy.

### Local regression validation

Node regression:

- 325 tests
- 325 passed
- 0 failed

Hardhat regression:

- 29 tests
- 29 passed
- 0 failed
- 35 Solidity files compiled successfully
- SPDX output was warning-only

Combined local regression:

- 354 tests
- 354 passed

Hardhat-generated `artifacts/` and `cache/` churn was restored after testing.

Before commit:

- `git diff --cached --check` passed
- exactly the two intended Milestone 1B files were staged
- no unstaged tracked changes remained

### First live provider-only amount surface

The first live Milestone 1B surface completed successfully with:

- Pinned quote block: `94830650`
- Shared gas price: `275399891388` wei (~275.400 gwei)
- Aave premium: 5 bps
- Amounts tested: 11
- Range: `0.100` to `0.150` WPOL
- Quote result: 11/11 `QUOTE_OK`
- Observed-gas qualifications: 0/11

Best protected size in this surface:

- Amount: `0.115` WPOL
- Gross delta: `15385817510297865` wei
- Protected gas budget: `8676388422746375` wei
- Gas ceiling: `12394840603` wei/gas (~12.395 gwei)
- Observed-gas economic deficit: `184103535548853625` wei
- `observedGasQualifies=false`

The protected surface improved from `0.100` WPOL through `0.115` WPOL, was nearly flat at `0.120` WPOL, and then declined through `0.150` WPOL.

The best tested point therefore occurred inside the tested interval rather than at either boundary.

This observation is historical evidence for block `94830650`; it is not permission to execute and must not be treated as a permanent optimum.

### Safety interpretation

Observed gas remained far above the protected gas ceiling.

At the best protected point:

- observed gas was ~275.400 gwei
- protected ceiling was ~12.395 gwei
- observed gas was roughly 22.2x the protected ceiling

No profitability, reserve, slippage, gas, freshness, minimum-profit, or worst-case policy was weakened to manufacture qualification.

Safety state remains:

- signer: none
- transaction: none
- broadcast: false
- `LIVE_READY=false`

If a future observation qualifies, freeze the evidence and independently requalify through the established safety path before any separate reviewed execution stage.

### RPC handling

The Codespace did not initially inherit `INFURA_POLYGON`.

A temporary RPC endpoint was supplied directly to the Codespace shell environment for provider-only research.

No API key, API secret, RPC URL, private key, seed phrase, password, or other credential is stored in this checkpoint.

The Codespace research credential is logically separated from the HP watcher credential.

### HP / Bugs isolation

The HP/WSL Bugs observer was not modified, restarted, pulled forward, or reconfigured during Milestone 1B.

Keep the HP monitoring appliance isolated from Codespace research unless a deliberate migration is reviewed separately.

### Next steps

1. Commit this checkpoint update separately from the Milestone 1B code commit.
2. Push the checkpoint commit and independently verify `ProfitBot CI`.
3. Preserve `c52ed05` as the clean Milestone 1B code anchor underneath the checkpoint commit.
4. Continue provider-only economic research without weakening established safety policy.
5. Do not modify production execution contracts or submit live-network transactions as part of this research milestone.

## Milestone 1C — Polygon V4 Protected Fine Amount Surface

Recovery code anchor:
- Commit: `9f4aee476faf024b1027a3a32a69fac1a6900ae2`
- Subject: `Add Polygon V4 protected fine amount surface`
- Independent CI: `ProfitBot CI` run `37027778583`
- CI result: GREEN
- CI elapsed: 42s

Scope:
- Added `scripts/research/runPolygonV4ProtectedFineSurface.js`.
- Added `test/polygonV4ProtectedFineSurface.test.js`.
- No production contract, execution path, deployment address, policy, signer, transaction, or broadcast changes.
- Fine runner delegates protected economics and pinned observation behavior to the existing protected amount-surface runner.
- Exact fine grid is `0.105` through `0.130 WPOL` inclusive in `0.001 WPOL` increments: 26 observations.

Validation:
- Focused amount-surface regression: 13/13 passing.
- Full Node regression: 328/328 passing.
- Hardhat regression: 29/29 passing.
- Total local tests: 357/357 passing.
- Hardhat compiled 35 Solidity files successfully; SPDX warnings only.
- Generated `artifacts/` and `cache/` churn was restored before commit.
- Staged diff check passed.
- Independent CI passed after push.

First provider-only 1C observation:
- Pinned quote block: `94833132`.
- PoolId: `0x6c6627aba26b073dd60b88b472b608f4f48f4e9eb5635efbd32095a76bea6c60`.
- Route: `WPOL -> DAI -> APEPE -> WPOL`.
- Shared observed gas price: `277605756458 wei/gas`.
- Aave premium: `5 bps`.
- Samples: 26.
- Quote result: 26/26 `QUOTE_OK`.
- No signer.
- No transaction.
- No broadcast.

Best protected row in this pinned sample:
- Amount: `0.123 WPOL`.
- Gross delta: `16742610294200132 wei` (`0.016742610294200132 WPOL`).
- Protected gas budget: `9982397242729131 wei` (`0.009982397242729131 WPOL`).
- Protected gas ceiling: `14260567489 wei/gas` (`14.260567489 gwei`).
- Gas coverage: `51369 ppm`.
- Economic deficit at observed gas: `184341632277870869 wei` (`0.184341632277870869 WPOL`).
- `observedGasQualifies=false`.

Interpretation:
- The finer sample moved the observed protected-budget maximum from the earlier coarse neighborhood toward `0.123 WPOL`.
- The protected-budget surface rises through `0.122`, reaches the largest sampled value at `0.123`, and declines from `0.124` onward.
- The top is shallow; `0.123 WPOL` is a historical sampled maximum at block `94833132`, not a permanent or globally optimal trade size.
- Observed gas remained far above the protected gas ceiling.
- This observation does not make the route `LIVE_READY` and does not justify weakening gas, slippage, reserve, minimum-profit, freshness, or worst-case policy.

Next research direction:
- If continuing amount-surface investigation, isolate the local peak with a provider-only micro-surface around approximately `0.1210–0.1250 WPOL` at `0.0001 WPOL` increments.
- Keep the experiment read-only and isolated.
- Do not modify `ProfitBot.sol`, production execution helpers, deployment addresses, `.env`, or live execution policy.

## Milestone 1D — Polygon V4 Protected Micro Amount Surface

### Code / CI anchor

- Code commit: `3b46fb3d82451b315fe76a2ea4c8bc6bc1df14a5`
- Subject: `Add Polygon V4 protected micro amount surface`
- Independent `ProfitBot CI`: run `37030696495`, success in 35s.
- Additive files only:
  - `scripts/research/runPolygonV4ProtectedMicroSurface.js`
  - `test/polygonV4ProtectedMicroSurface.test.js`
- Code diff: 499 insertions across exactly those two files.
- No production contract, execution path, deployment address, `.env`, profitability policy, signer, transaction, or broadcast changes.

### Design / validation

- Provider-only protected micro-surface.
- Exact integer grid: `0.1210` through `0.1250 WPOL`, inclusive.
- Step: `0.0001 WPOL`.
- Observations: 41.
- Reuses the protected fine-surface / amount-surface mechanics and one shared pinned block, gas price, and Aave premium snapshot.
- Focused 1C + 1D regression: 6/6 passed.
- Full Node regression: 331/331 passed.
- Hardhat regression: 29/29 passed.
- Total local tests: 360/360 passed.
- Hardhat compiled 35 Solidity files successfully; SPDX warnings only.
- Generated `artifacts/` and `cache/` churn was restored before staging.
- Staged diff check passed and safety scan found no signer / transaction / broadcast / execution calls.

### First provider-only 1D observation

- Pinned quote block: `94834040`.
- PoolId: `0x6c6627aba26b073dd60b88b472b608f4f48f4e9eb5635efbd32095a76bea6c60`.
- Route: `WPOL -> DAI -> APEPE -> WPOL`.
- Shared gas price: `278281592114 wei/gas`.
- Aave premium: `5 bps`.
- Quote result: 41/41 `QUOTE_OK`.
- No signer, transaction, or broadcast.

Best sampled protected row in this micro-grid:

- Amount: `0.125 WPOL`.
- Gross delta: `17606578371831757 wei`.
- Protected gas budget: `10831045479972598 wei`.
- Gas ceiling: `15472922114 wei/gas`.
- Gas coverage: `55601 ppm`.
- Economic deficit at observed gas: `183966068999827402 wei`.
- Qualifies at observed gas: `false`.

### Interpretation / next research boundary

The protected gas budget increased across the entire sampled `0.1210` through `0.1250 WPOL` interval at block `94834040`. Therefore `0.125 WPOL` is only the upper-boundary maximum of this sampled grid; this observation does not establish an interior or permanent optimum.

This differs from the earlier 1C snapshot, whose sampled maximum was near `0.123 WPOL`, and is evidence that the best protected amount can move with market state. Do not hard-code either sampled amount as a permanent optimum.

Observed gas remained far above the protected ceiling, so nothing became `LIVE_READY`. Do not weaken gas, slippage, reserve, minimum-profit, freshness, or worst-case policy to manufacture readiness.

A useful next research direction is provider-only peak/stability analysis across multiple pinned snapshots rather than repeatedly narrowing around one historical amount. Keep that research isolated from `ProfitBot.sol`, production execution helpers, deployment configuration, `.env`, signing, transactions, and broadcasting.

## 2026-10-02 — Polygon V4 Protected Peak Stability (1E)

### Verified code boundary

- Commit: `e07a7c2900a51e36437b1a00da4cda23c522d6fa`
- Subject: `Add Polygon V4 protected peak stability analysis`
- ProfitBot CI: run `37033982901`
- CI conclusion: success
- CI elapsed: 44s
- Local and `origin/repair/simulation-safety` matched after push.

### Scope

Added deterministic provider-independent orchestration for comparing the protected amount-surface peak across explicit snapshots:

- `scripts/research/runPolygonV4ProtectedPeakStability.js`
- `test/polygonV4ProtectedPeakStability.test.js`

The runner reuses the existing 1C protected fine surface rather than implementing economics again.

Each input snapshot explicitly carries:

- `blockTag`
- `gasPriceWei`
- `premiumBps`

Peak observations are classified as:

- `NONE`
- `LOWER_BOUNDARY`
- `INTERIOR`
- `UPPER_BOUNDARY`

Boundary classifications are evidence that the sampled observation window may not bracket the peak. They are not proof of an optimum.

Malformed delegated surface results and malformed peak classifications fail closed.

### Validation

- 1E focused tests: 5/5
- Combined 1B + 1C + 1D + 1E: 17/17
- Full Node suite: 336/336
- Canonical Hardhat suite: 29/29
- Total maintained Node + canonical Hardhat tests: 365/365
- `git diff --check`: clean
- prohibited execution-surface scan: empty
- Solidity compilation: 35 files, EVM target `paris`
- only existing SPDX warnings observed

A bare `npx hardhat test` also discovers legacy tracked `test/Lock.js`, which imports absent Hardhat Toolbox helpers. The repository's canonical `test:hardhat` script intentionally runs `test/ProfitBot.js`, `test/execution.js`, and `test/threeLegExecution.js`; that maintained suite passed 29/29. No dependency/toolchain change was made for the unrelated legacy test.

### Safety boundary

1E adds no signer, transaction, broadcast, wallet, production execution, deployment, `.env`, or policy changes.

Do not weaken profitability, slippage, gas, freshness, minimum-profit, or worst-case qualification policy to manufacture readiness.

`LIVE_READY` remains false unless the existing safety policy genuinely passes.

### Next research step

Add provider-only snapshot acquisition around the deterministic 1E core.

Important gas provenance rule:

`provider.getGasPrice()` represents gas observed at acquisition time. It must not be represented as historical gas for an older `blockTag`.

Historical/block-pinned Aave premium data and current observed gas therefore require explicit provenance. Never compare snapshots as though their inputs were contemporaneous unless they actually were.

Continue with:

- provider only
- read/call only
- no signer
- no transaction
- no broadcast

Keep 1D unchanged as historical experimental evidence.

## Milestone 1F — Protected Peak Snapshot Acquisition

Status: COMPLETE / PROVIDER-ONLY / CI-CONFIRMED

1F adds a deterministic acquisition boundary for producing snapshots compatible
with the 1E protected peak stability analysis.

Code:
- `scripts/research/runPolygonV4ProtectedPeakSnapshot.js`
- `test/polygonV4ProtectedPeakSnapshot.test.js`

Acquisition semantics:
- Acquire the current Polygon block number first.
- Require `blockTag` to be a positive safe integer.
- Observe `gasPriceWei` from the provider during acquisition.
- Resolve Aave economics with the acquired `blockTag`.
- Require `gasPriceWei` to be positive.
- Require `premiumBps` to be an integer from 0 through 9999.
- Preserve `gasPriceWei` as an ethers `BigNumber`.
- Return explicit provenance:
  - quote block: `PINNED`
  - Aave premium: `BLOCK_PINNED`
  - gas price: `OBSERVED_AT_ACQUISITION`

Important provenance boundary:
- The Aave premium is legitimately block-pinned because
  `resolveAaveEconomics(..., blockTag)` passes the block override through the
  relevant on-chain reads.
- `provider.getGasPrice()` is a current observation and is NOT historical or
  block-pinned.
- Do not describe the observed gas price as belonging to the pinned quote block.

Safety boundary:
- Provider-only.
- No signer.
- No wallet.
- No transaction.
- No broadcast.
- No timer or daemon.
- No production-contract modification.
- No `.env` modification.
- No profitability, slippage, gas, freshness, reserve, or minimum-profit policy
  weakening.
- 1E remains unchanged.

Validation before commit:
- Focused 1B–1F: 21/21 passing.
- Full Node suite: 340/340 passing.
- Canonical Hardhat suite: 29/29 passing.
- Maintained validation total: 369 passing tests.
- `git diff --check`: clean.
- Execution safety scan: no execution-capable matches.

1F code commit:
- Full SHA: `6f28413714c2566d53e6b946e66036b1a1ffdba4`
- Short SHA: `6f28413`
- Subject: `Add Polygon V4 protected peak snapshot acquisition`

Exact-SHA CI:
- Workflow: `ProfitBot CI`
- Run name: `ProfitBot checks`
- Run ID: `37036687450`
- Status: `completed`
- Conclusion: `success`
- Created: `2026-10-02T16:50:46Z`
- Updated: `2026-10-02T16:51:24Z`
- `gh run watch` return code: 0
- Exact head SHA:
  `6f28413714c2566d53e6b946e66036b1a1ffdba4`

Recovery anchor:
`6f28413714c2566d53e6b946e66036b1a1ffdba4`

Next research direction:
Build a separate provider-only orchestration layer that can collect multiple
independent 1F snapshots and feed those snapshots into the existing 1E
protected peak stability analysis. Preserve the distinction between pinned
quote/Aave state and observed gas. Do not add execution or broadcast behavior.

## 1G — Protected Peak Multi-Snapshot Acquisition Orchestration

Status: implemented, locally validated, pushed, and exact-SHA CI-confirmed.

### Purpose

1G joins the existing provider-only research components without adding
execution capability:

1F snapshot acquisition
-> 1G multi-snapshot collection
-> 1E protected peak stability
-> existing 1C / 1B protected surface economics.

The milestone remains research-only and provider-only.

### Files

- `scripts/research/runPolygonV4ProtectedPeakAcquisition.js`
- `test/polygonV4ProtectedPeakAcquisition.test.js`

### Snapshot independence boundary

For this milestone, independent snapshots are defined conservatively by
strictly increasing positive `blockTag` values.

A duplicate block or a backward-moving block fails closed.

1G does not claim that strictly increasing blocks imply a minimum elapsed
wall-clock time or minimum block separation.

### Collection semantics

`collectProtectedPeakSnapshots(...)`:

- requires a provider;
- requires a positive safe-integer snapshot count;
- acquires snapshots sequentially through the injected/default 1F
  acquisition function;
- validates the accumulated block sequence after every acquisition;
- rejects duplicate or backward block tags;
- returns the acquired snapshots without adding timing or persistence
  semantics.

### Stability orchestration

`runAcquiredProtectedPeakStability(...)`:

- collects the requested snapshot set;
- delegates the completed set to existing
  `runProtectedPeakStability(...)`;
- preserves the same provider;
- forwards an `amounts` override only when the caller supplied one;
- otherwise leaves 1E's existing default amount grid intact.

### Deliberately excluded

1G adds no:

- timer;
- sleep/retry loop;
- daemon/watcher;
- filesystem persistence;
- `capturedAt`;
- RPC/environment configuration;
- executable `main()` entrypoint;
- signer or wallet;
- transaction construction;
- transaction submission or broadcast;
- production integration;
- policy weakening.

If a real caller acquires the same block twice, 1G rejects the second
sample rather than manufacturing independent evidence.

Waiting for block advancement, retry policy, timestamps, and durable
observation persistence remain separate future orchestration decisions.

### Validation

Local validation before commit:

- runner syntax: pass;
- test syntax: pass;
- focused 1B-1G regression: 26 / 26 pass;
- full Node suite: 347 / 347 pass;
- canonical Hardhat suite: 29 / 29 pass;
- maintained total: 376 passing tests;
- `git diff --check`: pass;
- execution/timer/persistence safety scan: empty.

Hardhat-generated tracked `artifacts/` and `cache/` churn was restored
before commit scope was finalized.

### Exact code anchor

Commit:

`484cc4353eba175f30494d39f7e09a85a1ab2048`

Subject:

`Add Polygon V4 protected peak acquisition orchestration`

Commit scope:

- 2 files changed;
- 569 insertions;
- no production files changed.

Local and remote branch heads matched this exact SHA after push.

### Exact-SHA CI evidence

Workflow: `ProfitBot CI`

Run name: `ProfitBot checks`

Run ID:

`37039177840`

Head SHA:

`484cc4353eba175f30494d39f7e09a85a1ab2048`

Status: `completed`

Conclusion: `success`

Created:

`2026-10-02T17:12:51Z`

Updated:

`2026-10-02T17:13:30Z`

CI job ID:

`110944773777`

All CI steps passed, including environment-file guard, `npm ci`,
`npm test`, scanner syntax checks, and Hardhat compile.

The GitHub Actions Node.js 20 -> 24 compatibility notice and upcoming
`ubuntu-latest` Ubuntu 26 migration are infrastructure notices, not 1G
failures.

### Safety state after 1G

1G does not change live readiness.

No signer, transaction, or broadcast path was added.

No profitability, slippage, gas, freshness, minimum-profit, or
worst-case policy was weakened.

`LIVE_READY=false` remains the safe state unless the existing full
qualification policy independently passes.

### Next research boundary

Do not automatically add a timer or persistent watcher merely to gather
more snapshots.

Before the next implementation milestone, decide explicitly how real
multi-block sampling should handle:

- waiting for block advancement;
- retry/timeout limits;
- minimum block separation, if any;
- wall-clock acquisition timestamps;
- persistence versus caller-owned storage;
- partial acquisition failure.

Keep those concerns outside the deterministic 1G core unless evidence
shows they belong there.

## Milestone 1H — Polygon V4 Protected Peak Block-Separation Policy

Status:
- Implemented.
- Locally validated.
- Pushed.
- Exact-SHA CI confirmed.
- Provider/execution safety boundary remains unchanged.

Purpose:
- Add a deterministic policy layer above the 1G protected-peak acquisition sequence.
- Distinguish merely different quote blocks from snapshots separated by a caller-selected minimum number of blocks.
- Preserve the existing 1G requirement that snapshot blockTags are positive safe integers and strictly increasing.
- Keep block-separation qualification independent from acquisition mechanics.

Files:
- `scripts/research/runPolygonV4ProtectedPeakBlockSeparation.js`
- `test/polygonV4ProtectedPeakBlockSeparation.test.js`

Policy semantics:
- `validateMinimumBlockGap(minimumBlockGap)` requires a positive safe integer.
- `validateProtectedPeakBlockSeparation({ snapshots, minimumBlockGap })` first delegates snapshot-sequence validation to the existing 1G `validateSnapshotSequence`.
- Every adjacent snapshot pair must satisfy:
  - `currentBlockTag - previousBlockTag >= minimumBlockGap`.
- Exact minimum separation is accepted.
- Larger separation is accepted.
- Any adjacent pair below the configured minimum fails closed.
- Duplicate and backward blockTags continue to fail through the underlying 1G sequence policy.
- The original snapshot array is returned unchanged.
- A single valid snapshot vacuously satisfies any valid block-separation value because there is no adjacent pair; minimum sample-count requirements belong to orchestration/stability policy, not this validator.

Important interpretation:
- 1H validates the separation of snapshots that already exist.
- 1H does NOT advance blocks.
- 1H does NOT wait for blocks.
- 1H does NOT acquire snapshots.
- `minimumBlockGap` is caller-selected research policy; 1H does not claim a universal economically sufficient block separation.
- Block separation is not wall-clock separation and does not prove market-state independence.

Deliberately excluded:
- No timer, sleep, polling loop, daemon, or watcher.
- No provider or RPC calls.
- No `getBlockNumber`.
- No wall-clock timestamp or `capturedAt`.
- No persistence, JSONL, filesystem writes, or checkpointing logic.
- No RPC configuration or environment handling.
- No `main`.
- No signer, wallet, private key, transaction, or broadcast.
- No production execution integration.
- No changes to profitability, slippage, gas, freshness, reserve, minimum-profit, or worst-case qualification policy.
- No changes to `LIVE_READY`.

Validation:
- Implementation syntax: pass.
- Test syntax: pass.
- Focused 1B–1H regression: 33/33 pass.
- Full Node suite: 354/354 pass.
- Canonical Hardhat suite: 29/29 pass.
- Maintained passing total: 383 tests.
- `git diff --check`: pass.
- Execution/timer/persistence/network safety scan: empty.
- Hardhat-generated tracked artifact/cache churn was restored after validation.
- An intermediate manual Hardhat command used incorrect filenames and returned `MODULE_NOT_FOUND`; this was a validation-command mistake, not a code failure. The repository-defined canonical command `hardhat test test/ProfitBot.js test/execution.js test/threeLegExecution.js` was then run directly and passed 29/29.

Immutable 1H code anchor:
- Commit: `50e1245d795814c0e11436989d5c5d7932adeac1`
- Subject: `Add Polygon V4 protected peak block separation policy`
- Scope: exactly 2 files, 263 insertions.
- No production files changed.
- Local and remote branch SHAs matched exactly after push.

Exact-SHA CI evidence:
- Workflow: `ProfitBot CI`
- Run name: `ProfitBot checks`
- Run ID: `37041580800`
- Head SHA: `50e1245d795814c0e11436989d5c5d7932adeac1`
- Status: `completed`
- Conclusion: `success`
- Created: `2026-10-02T17:34:09Z`
- Updated: `2026-10-02T17:35:24Z`
- Job: `test`
- Job ID: `110952729450`
- Job started: `2026-10-02T17:34:47Z`
- Job completed: `2026-10-02T17:35:24Z`
- Exact run watch returned rc=0.
- CI passed checkout, Node setup, tracked-environment-file guard, `npm ci`, `npm test`, scanner syntax checks, Hardhat compile, and post steps.

Safety state:
- 1H is pure deterministic research-policy validation.
- No signer exists in this milestone.
- No transaction is constructed or submitted.
- No broadcast path is introduced.
- Existing execution safety policy is unchanged.
- `LIVE_READY` remains false unless the existing complete policy independently qualifies a candidate.

Next research boundary:
- Decide whether 1G acquisition should remain caller-driven or gain a separate block-advancement orchestration layer.
- If block advancement is added later, define retry behavior and timeout/failure semantics explicitly rather than embedding them in 1H.
- Decide whether wall-clock separation is independently useful in addition to block separation.
- Decide whether acquired research sets need durable persistence or should remain caller-owned.
- Define partial-acquisition failure behavior before introducing any long-running acquisition process.
- Do not conflate `minimumBlockGap` with proof of economically independent market states.

## Milestone 1I — Polygon V4 Protected Peak Block-Advancement Orchestration

Status:
- Implemented.
- Locally validated.
- Pushed.
- Exact-SHA CI confirmed.
- Provider/execution safety boundary remains unchanged.

Purpose:
- Add a deterministic bounded block-advancement orchestration primitive above the 1H block-separation policy.
- Define explicitly what constitutes successful block advancement.
- Bound observation work with a caller-selected attempt budget.
- Distinguish ordinary insufficient advancement from malformed evidence or invalid dependencies.
- Keep actual waiting, timers, polling cadence, provider access, and snapshot acquisition outside this deterministic core.

Files:
- `scripts/research/runPolygonV4ProtectedPeakBlockAdvancement.js`
- `test/polygonV4ProtectedPeakBlockAdvancement.test.js`

Orchestration semantics:
- `validateBlockTag(blockTag, name)` requires a positive safe integer.
- `validateMaxAttempts(maxAttempts)` requires a positive safe integer.
- `observeProtectedPeakBlockAdvancement({ previousBlockTag, minimumBlockGap, maxAttempts, observeBlockFn })` reuses the 1H `validateMinimumBlockGap` policy.
- Required advancement is:
  - `requiredBlockTag = previousBlockTag + minimumBlockGap`.
- The required block must remain within JavaScript's safe-integer range.
- `maxAttempts` is exactly the maximum number of calls to `observeBlockFn`; there is no hidden attempt zero.
- Each observer result must itself be a positive safe-integer block tag.
- Success is the first observation satisfying:
  - `observedBlockTag >= requiredBlockTag`.
- Exact required advancement is accepted.
- Larger advancement is accepted.
- Success stops observation immediately and returns a structured `advanced: true` result.
- Duplicate, backward, and intermediate positive safe-integer observations do not satisfy advancement but remain valid observations within the bounded attempt budget.
- Exhausting the attempt budget without sufficient advancement returns a structured `advanced: false` result rather than throwing.
- Invalid arguments, invalid dependencies, malformed observed block evidence, and safe-integer overflow fail immediately by exception.
- Results record the previous block, configured gap, required block, final observed block, attempts used, maximum attempts, and all observations.

Important interpretation:
- 1I observes advancement evidence; it does not itself advance the chain.
- `observeBlockFn` is injected and deliberately abstract.
- 1I does not directly depend on an ethers provider or `getBlockNumber`.
- 1I contains no delay between attempts.
- Therefore repeated observations may occur immediately unless a future caller supplies waiting/cadence outside this primitive.
- Attempt count is a bounded observation budget, not a wall-clock timeout.
- A backward observation is not accepted as advancement, but a positive safe-integer backward block is treated as valid observed evidence and can consume an attempt.
- Block advancement remains distinct from wall-clock separation and does not prove economically independent market states.
- `minimumBlockGap` remains caller-selected research policy, not a universal economic-independence threshold.

Deliberately excluded:
- No timer, sleep, polling interval, daemon, or watcher.
- No provider or RPC dependency.
- No `getBlockNumber`.
- No snapshot acquisition.
- No integration into the existing 1G acquisition loop.
- No wall-clock timestamp or `capturedAt`.
- No persistence, JSONL, filesystem writes, or checkpointing logic in the implementation.
- No RPC configuration or environment handling.
- No `main`.
- No signer, wallet, private key, transaction, or broadcast.
- No production execution integration.
- No changes to profitability, slippage, gas, freshness, reserve, minimum-profit, or worst-case qualification policy.
- No changes to `LIVE_READY`.

Validation:
- Implementation syntax: pass.
- Test syntax: pass.
- Focused protected-peak 1B–1I regression: 40/40 pass.
- Full Node suite: 361/361 pass.
- Canonical Hardhat suite: 29/29 pass.
- Maintained passing total: 390 tests.
- `npm test`: rc=0.
- `git diff --check`: pass before and after generated-artifact cleanup.
- Execution/timer/persistence/network safety scan: empty.
- Hardhat-generated tracked `artifacts/` and `cache/` churn was restored after validation.
- An intermediate cleanup helper supplied during validation contained a malformed `awk` expression, so the first automatic generated-churn restoration did not run. This was a cleanup-command mistake, not a code or test failure. A guarded follow-up verified there were no unexpected non-generated tracked changes and restored only `artifacts/` and `cache/`; the final worktree scope returned exactly to the two intended 1I files before commit.

Immutable 1I code anchor:
- Commit: `5dd3622d67ae0143bc4dc66fa688e1f2708b68cd`
- Subject: `Add Polygon V4 protected peak block advancement orchestration`
- Scope: exactly 2 files, 423 insertions.
- Implementation: 138 lines.
- Tests: 285 lines.
- No production files changed.
- Local and remote branch SHAs matched exactly after push.

Exact-SHA CI evidence:
- Workflow: `ProfitBot CI`
- Run name: `ProfitBot checks`
- Run ID: `37043983921`
- Head SHA: `5dd3622d67ae0143bc4dc66fa688e1f2708b68cd`
- Status: `completed`
- Conclusion: `success`
- Created: `2026-10-02T17:55:27Z`
- Updated: `2026-10-02T17:56:12Z`
- Job: `test`
- Job ID: `110960713410`
- Job started: `2026-10-02T17:55:31Z`
- Job completed: `2026-10-02T17:56:11Z`
- Exact run watch returned rc=0.
- CI passed setup, checkout, Node setup, tracked-environment-file guard, `npm ci`, `npm test`, scanner syntax checks, Hardhat compile, and post steps.
- CI emitted infrastructure notices that Node.js 20-targeting actions are being forced to Node.js 24 and that `ubuntu-latest` is scheduled to migrate to Ubuntu 26 beginning October 19, 2026; these were not test failures.

Safety state:
- 1I is deterministic research orchestration with an injected observation dependency.
- No signer exists in this milestone.
- No transaction is constructed or submitted.
- No broadcast path is introduced.
- Existing execution safety policy is unchanged.
- `LIVE_READY` remains false unless the existing complete policy independently qualifies a candidate.

Next research boundary:
- Decide whether a separate caller should compose 1I block advancement between 1G snapshot acquisitions.
- Define how that composition handles `advanced: false` without accepting an under-separated snapshot.
- Decide whether the injected observation function should eventually be backed by provider `getBlockNumber` in a separate adapter.
- Decide whether waiting/cadence should be another injected dependency rather than embedded into deterministic orchestration.
- Define wall-clock timeout semantics separately from `maxAttempts`; attempt count alone is not elapsed-time protection.
- Define partial-acquisition behavior if advancement succeeds but subsequent snapshot acquisition fails.
- Decide whether completed or partially completed research sets require durable persistence.
- Do not conflate block advancement or minimum block gap with proof of economically independent market states.

## Milestone 1J — Polygon V4 Protected Peak Gated Acquisition

Status:
- Implemented.
- Locally validated.
- Pushed.
- Exact-SHA CI confirmed.
- Provider/execution safety boundary remains unchanged.

Purpose:
- Compose deterministic 1I block-advancement gating with protected-peak snapshot acquisition without modifying the existing 1G, 1H, or 1I primitives.
- Acquire the first research snapshot immediately.
- Require successful block-advancement evidence before every later acquisition.
- Gate each later acquisition relative to the last successfully acquired snapshot.
- Revalidate actual acquired snapshot separation with 1H rather than assuming observed advancement proves the subsequently pinned snapshot is sufficiently separated.
- Preserve bounded exhaustion as a structured incomplete research result rather than accepting an under-separated snapshot.

Files:
- `scripts/research/runPolygonV4ProtectedPeakGatedAcquisition.js`
- `test/polygonV4ProtectedPeakGatedAcquisition.test.js`

Composition semantics:
- `validateCount(count)` requires a positive safe integer.
- `collectGatedProtectedPeakSnapshots(...)` validates count, minimum block gap, maximum observation attempts, acquisition dependency, block-observation dependency, and advancement dependency before acquiring the first snapshot.
- Snapshot number one is acquired without an advancement gate because no prior acquired snapshot exists.
- Before each subsequent snapshot, advancement is evaluated relative to the `blockTag` of the last successfully acquired snapshot.
- The configured `minimumBlockGap`, `maxAttempts`, and injected `observeBlockFn` are passed into the advancement dependency.
- An advancement result must be an object containing a boolean `advanced`.
- Advancement policy provenance must match the gate:
  - `previousBlockTag` must equal the last successfully acquired snapshot block.
  - `minimumBlockGap` must equal the caller-selected gap.
  - `maxAttempts` must equal the caller-selected attempt budget.
- A successful advancement result must contain a safe-integer `observedBlockTag` satisfying the required block gap.
- `advanced: false` stops acquisition before another snapshot is requested and returns a structured incomplete result with:
  - `complete: false`
  - requested and acquired counts
  - configured gap and attempt budget
  - successfully acquired snapshots
  - advancement evidence
  - `stopReason: BLOCK_ADVANCEMENT_EXHAUSTED`
- `advanced: true` permits the next acquisition attempt but is not itself accepted as proof that the resulting snapshot is sufficiently separated.
- After the next snapshot is acquired, the candidate snapshot sequence is revalidated through the existing 1H `validateProtectedPeakBlockSeparation` policy.
- Therefore inconsistent provider behavior cannot turn observed head advancement into acceptance of an actually under-separated pinned snapshot.
- Successful completion returns all acquired snapshots and advancement evidence with `complete: true` and `stopReason: null`.
- Acquisition exceptions after successful advancement propagate as exceptions; 1J does not invent a completed or partial success result for that failure.
- Malformed advancement evidence and policy-provenance mismatches fail closed before another snapshot is acquired.

Important interpretation:
- 1J composes deterministic research primitives; it does not itself access a provider.
- `observeBlockFn` remains injected.
- `acquireSnapshotFn` remains injected.
- The default advancement dependency is the deterministic 1I `observeProtectedPeakBlockAdvancement`.
- Block advancement evidence and actual pinned snapshot separation remain distinct evidence.
- Minimum block separation remains caller-selected research policy and is not proof of economically independent market states.
- Attempt count remains an observation budget, not a wall-clock timeout.
- Partial structured return is used specifically for ordinary bounded block-advancement exhaustion.
- Acquisition failures, malformed dependencies, malformed evidence, and actual snapshot separation violations remain exceptions.

Tests:
- 10 dedicated 1J tests cover:
  - positive safe-integer snapshot-count validation
  - first acquisition without an advancement gate
  - gating each later acquisition from the last successfully acquired snapshot
  - structured incomplete return on exhausted advancement without another acquisition
  - revalidation of actual acquired snapshot separation after successful advancement
  - propagation of acquisition failure after successful advancement
  - rejection of malformed advancement results
  - rejection of invalid dependencies before first acquisition
  - rejection of advancement policy-provenance mismatch
  - rejection of successful advancement evidence below the required block gap

Deliberately excluded:
- No modification to 1G acquisition.
- No modification to 1H separation policy.
- No modification to 1I advancement orchestration.
- No direct provider or RPC dependency.
- No `getBlockNumber`.
- No timer, sleep, polling interval, daemon, watcher, or wall-clock timeout.
- No persistence, JSONL, filesystem writes, or implementation checkpointing.
- No RPC configuration or environment handling.
- No `main`.
- No signer, wallet, private key, transaction, or broadcast.
- No production execution integration.
- No changes to `ProfitBot.sol`.
- No changes to `ThreeLegExecution`.
- No changes to production route helpers.
- No changes to profitability, slippage, gas, freshness, reserve, minimum-profit, or worst-case qualification policy.
- No changes to `LIVE_READY`.

Validation:
- Implementation syntax: pass.
- Test syntax: pass.
- Dedicated 1J focused tests: 10/10 pass.
- Corrected protected research regression: 46/46 pass.
- Full Node suite: 371/371 pass.
- Canonical Hardhat suite: 29/29 pass.
- Maintained passing total: 400 tests.
- `npm test`: rc=0.
- `git diff --check`: pass.
- Execution/timer/persistence/network safety scan: empty.
- Hardhat-generated tracked `artifacts/` and `cache/` churn was identified as generated-only and restored after validation.
- An initial focused-regression command supplied during 1J validation referenced the nonexistent file `test/polygonV4ProtectedAmountSurface.test.js`; that command returned rc=1 before the intended focused tests ran. This was a validation-command filename mistake, not an implementation or test failure. A subsequent discovery-based command used the actual protected research test filenames and passed 46/46.

Immutable 1J code anchor:
- Commit: `89f041a62567338c2f951291f5e9a41d259278ff`
- Subject: `Add Polygon V4 protected peak gated acquisition`
- Parent: `8818361e5dbbbd06e7bd83910c50da308b4152f9`
- Scope: exactly 2 files, 781 insertions.
- Implementation: 211 lines.
- Tests: 570 lines.
- No production files changed.
- Local and remote branch SHAs matched exactly after push.

Exact-SHA CI evidence:
- Workflow: `ProfitBot CI`
- Run name: `ProfitBot checks`
- Run ID: `37045905719`
- Head SHA: `89f041a62567338c2f951291f5e9a41d259278ff`
- Status: `completed`
- Conclusion: `success`
- Created: `2026-10-02T18:12:47Z`
- Updated: `2026-10-02T18:13:28Z`
- Job: `test`
- Job ID: `110967151613`
- Job started: `2026-10-02T18:12:50Z`
- Job completed: `2026-10-02T18:13:27Z`
- Exact run watch returned rc=0.
- CI passed setup, checkout, Node setup, tracked-environment-file guard, `npm ci`, `npm test`, scanner syntax checks, Hardhat compile, and post steps.
- CI emitted infrastructure notices that Node.js 20-targeting actions are being forced to Node.js 24 and that `ubuntu-latest` is scheduled to migrate to Ubuntu 26 beginning October 19, 2026; these were notices rather than test failures.
- The push also reported existing Dependabot vulnerability counts on the repository default branch. Dependency remediation remains separate from this milestone and no dependency changes were made for 1J.

Safety state:
- 1J remains provider-abstract deterministic research composition.
- No signer exists in this milestone.
- No transaction is constructed or submitted.
- No broadcast path is introduced.
- Existing execution safety policy is unchanged.
- `LIVE_READY` remains false unless the existing complete policy independently qualifies a candidate.

Layering through 1J:
- 1F snapshot acquisition primitive.
- 1G repeated acquisition/stability composition primitive.
- 1H minimum block-separation policy.
- 1I bounded block-advancement observation primitive.
- 1J advancement-gated acquisition composition with actual snapshot separation revalidation.
- 1E protected-peak stability analysis remains a separate downstream analysis layer.

Next research boundary:
- Decide whether 1J should next be composed with 1E stability analysis in a separate additive layer rather than modifying 1J.
- Decide whether a future provider adapter should supply `getBlockNumber` to the injected block observer.
- Define waiting/cadence separately from deterministic advancement observation.
- Define wall-clock timeout semantics separately from `maxAttempts`.
- Decide whether incomplete research sets require durable persistence before introducing any long-running orchestration.
- Preserve the distinction between observed block advancement, pinned snapshot separation, elapsed time, and economically independent market states.
- Do not introduce signer, transaction, or broadcast behavior as part of this research composition.

## Milestone 1K — Polygon V4 Gated Protected Peak Stability Composition

Status:
- Implemented.
- Locally validated.
- Pushed.
- Exact-SHA CI confirmed.
- Provider/execution safety boundary remains unchanged.

Purpose:
- Compose the existing 1J advancement-gated protected-peak acquisition layer with the existing 1E protected-peak stability analysis in a separate additive research layer.
- Preserve incomplete 1J acquisition evidence without incorrectly treating a partial snapshot set as a completed stability sample.
- Run stability analysis only after gated acquisition explicitly reports completion.
- Keep acquisition and stability dependencies injectable for deterministic testing without introducing provider, timer, persistence, signer, transaction, or broadcast behavior.

Files:
- `scripts/research/runPolygonV4ProtectedPeakGatedStability.js`
- `test/polygonV4ProtectedPeakGatedStability.test.js`

Composition semantics:
- `runGatedProtectedPeakStability(...)` delegates acquisition to the existing 1J `collectGatedProtectedPeakSnapshots` by default.
- The composition passes through:
  - requested snapshot count
  - caller-selected minimum block gap
  - maximum advancement observation attempts
  - injected snapshot acquisition dependency
  - injected block-observation dependency
  - optional injected advancement dependency
- The composition validates its acquisition and stability dependencies before acquisition.
- The returned acquisition envelope must be an object containing:
  - boolean `complete`
  - array `snapshots`
- A malformed acquisition envelope fails closed before stability analysis.
- `complete: false` is preserved as explicit incomplete research evidence.
- An incomplete acquisition returns:
  - the exact acquisition object
  - `stability: null`
- Stability analysis is not called for an incomplete acquisition.
- `complete: true` requires at least one acquired snapshot.
- A completed acquisition with an empty snapshot array fails closed before stability analysis.
- A completed non-empty snapshot set is passed unchanged into the existing 1E `runProtectedPeakStability` by default.
- An explicit `amounts` override is forwarded to stability analysis only when the caller supplied it.
- If `amounts` is omitted, 1K does not invent an override.
- The exact acquisition object is preserved in the composed result rather than reconstructing or flattening its evidence.
- Acquisition exceptions propagate.
- Stability-analysis exceptions propagate.
- 1K intentionally does not duplicate all 1J internal provenance validation; the default 1J dependency remains responsible for its own acquisition, advancement, and separation evidence rules.
- Existing 1E/default 1J validation remains responsible for the underlying snapshot/economic evidence.

Incomplete-result interpretation:
- Ordinary bounded block-advancement exhaustion remains a structured incomplete research outcome from 1J.
- 1K does not reinterpret that incomplete set as completed stability evidence.
- 1K does not require one specific future incomplete stop reason; it preserves the acquisition result and prevents analysis whenever `complete` is false.
- This keeps partial acquisition evidence visible while avoiding false stability conclusions.

Tests:
- 9 dedicated 1K tests cover:
  - gated acquisition argument pass-through and completed stability analysis
  - no stability analysis for incomplete acquisition
  - omission of an invented `amounts` override
  - propagation of gated acquisition failure without stability execution
  - propagation of stability failure after completed acquisition
  - rejection of invalid composition dependencies before acquisition
  - rejection of malformed acquisition envelopes without stability execution
  - preservation of the exact acquisition evidence object
  - rejection of a completed acquisition containing zero snapshots

Deliberately excluded:
- No modification to 1E stability analysis.
- No modification to 1G acquisition/stability composition.
- No modification to 1H separation policy.
- No modification to 1I advancement observation.
- No modification to 1J gated acquisition.
- No direct provider or RPC dependency.
- No `getBlockNumber`.
- No timer, sleep, polling interval, daemon, watcher, or wall-clock timeout.
- No persistence, JSONL, filesystem writes, or implementation checkpointing in the 1K code path.
- No RPC configuration or environment handling.
- No `main`.
- No signer, wallet, private key, transaction, or broadcast.
- No production execution integration.
- No changes to `ProfitBot.sol`.
- No changes to `ThreeLegExecution`.
- No changes to production execution route helpers.
- No changes to profitability, slippage, gas, freshness, reserve, minimum-profit, or worst-case qualification policy.
- No changes to `LIVE_READY`.

Validation:
- Implementation syntax: pass.
- Test syntax: pass.
- Dedicated 1K focused tests: 9/9 pass.
- Protected research regression discovered by filename rather than a hard-coded test list: 55/55 pass.
- Full Node suite: 380/380 pass.
- Canonical Hardhat suite: 29/29 pass.
- Maintained passing total: 409 tests.
- `npm test`: rc=0.
- `git diff --check`: pass.
- Execution/timer/persistence/network safety scan: empty.
- Hardhat compiled 35 Solidity files successfully; only existing SPDX warnings were emitted for Uniswap V2 interface files.
- Hardhat-generated tracked `artifacts/` and `cache/` churn was restored after validation.
- During the first full-validation cleanup, an assistant-supplied `awk` expression intended to classify generated versus non-generated tracked changes was malformed. The `awk` commands failed, so generated Hardhat churn was not restored in that command and final scope correctly reported failure. This was a cleanup-command error, not an implementation or test failure.
- A subsequent guarded cleanup verified there were no tracked changes outside `artifacts/` and `cache/`, verified the only untracked files were the two intended 1K files, restored only `artifacts/` and `cache/`, and confirmed:
  - tracked worktree clean
  - both 1K files preserved
  - `git diff --check` pass
  - exact intended two-file scope
- The already-passing test suites were not unnecessarily rerun after that cleanup-only correction.

Immutable 1K code anchor:
- Commit: `c965e652ec7482f6d2ba609b33634e977855441e`
- Subject: `Add Polygon V4 gated protected peak stability composition`
- Parent: `8cc7b5cb15e5373ba5357759b62bef1a61eaca74`
- Scope: exactly 2 files, 603 insertions.
- Implementation: 105 lines.
- Tests: 498 lines.
- No production files changed.
- Local and remote branch SHAs matched exactly after push.

Exact-SHA CI evidence:
- Workflow: `ProfitBot CI`
- Run name: `ProfitBot checks`
- Run ID: `37048143940`
- Head SHA: `c965e652ec7482f6d2ba609b33634e977855441e`
- Status: `completed`
- Conclusion: `success`
- Created: `2026-10-02T18:32:37Z`
- Updated: `2026-10-02T18:33:15Z`
- Job: `test`
- Job ID: `110974574243`
- Job started: `2026-10-02T18:32:39Z`
- Job completed: `2026-10-02T18:33:15Z`
- Exact run watch returned rc=0.
- CI passed setup, checkout, Node setup, tracked-environment-file guard, `npm ci`, `npm test`, scanner syntax checks, Hardhat compile, and post steps.
- CI emitted infrastructure notices that Node.js 20-targeting actions are being forced to Node.js 24 and that `ubuntu-latest` is scheduled to migrate to Ubuntu 26 beginning October 19, 2026; these were notices rather than test failures.
- The push also reported existing Dependabot vulnerability counts on the repository default branch: 228 total, including 12 critical, 99 high, 79 moderate, and 38 low. Dependency remediation remains separate from this milestone and no dependency changes were made for 1K.

Safety state:
- 1K remains deterministic research composition around injected dependencies.
- No signer exists in this milestone.
- No transaction is constructed or submitted.
- No broadcast path is introduced.
- Existing execution safety policy is unchanged.
- `LIVE_READY` remains false unless the existing complete policy independently qualifies a candidate.

Layering through 1K:
- 1E protected-peak stability analysis.
- 1F snapshot acquisition primitive.
- 1G repeated acquisition/stability composition primitive.
- 1H minimum block-separation policy.
- 1I bounded block-advancement observation primitive.
- 1J advancement-gated acquisition with actual snapshot separation revalidation.
- 1K gated-acquisition-to-stability composition that refuses to analyze incomplete acquisition sets.

Next research boundary:
- Keep actual provider adaptation separate from the deterministic 1K composition.
- Decide whether a future provider adapter should supply `getBlockNumber` to the existing injected block observer.
- Define waiting/cadence separately from deterministic advancement observation.
- Define wall-clock timeout semantics separately from `maxAttempts`.
- Decide whether incomplete research evidence requires durable persistence before any long-running orchestration.
- Preserve the distinction between observed block advancement, pinned snapshot separation, elapsed time, and economically independent market states.
- Do not introduce signer, transaction, or broadcast behavior as part of provider adaptation or research orchestration.

---

## 1K.1 Corrective Milestone — Provider Forwarding

### Supersession

This section corrects and supersedes the earlier 1K closure
claims recorded by checkpoint commit
`0f5b1225478136840502598ee587b15438f46df8`.

Published history is retained unchanged.

Original 1K code commit:
`c965e652ec7482f6d2ba609b33634e977855441e`

The original 1K composition omitted forwarding `provider` into
the default 1E protected-peak stability runner.

1E requires provider. Therefore the original statement that 1K
had no provider dependency was incorrect.

### Why original CI passed

The original 1K tests injected `runStabilityFn` stubs that did
not require provider.

Those tests validated the injected composition behavior but did
not expose the missing provider requirement of the default 1E
integration.

The original green CI therefore did not prove correct default
1K-to-1E provider forwarding.

### Additive 1K.1 correction

Corrective commit:
`8d24d18678f8a1262d4a9509c2e8908f57c440ff`

Subject:
`Fix Polygon V4 gated stability provider forwarding`

Corrected behavior:

- 1K accepts `provider`.
- 1K forwards that exact provider to stability.
- 1K makes no direct provider calls.
- Provider is not passed into 1J gated acquisition.
- 1J remains provider-abstract through injected acquisition and
  observation dependencies.
- Default 1E remains responsible for provider validation and use.
- Incomplete acquisition still returns before stability runs.
- Omitted `amounts` remains omitted.
- Completed-empty-snapshot hardening remains unchanged.

No signer, wallet, transaction, broadcast, timer, polling loop,
persistence, production execution change, or safety-policy
weakening was introduced.

### Regression and validation evidence

A dedicated regression test verifies exact provider identity is
forwarded to stability after complete acquisition.

Validation after the correction:

- focused 1K: 10/10 passing
- full Node suite: 381/381 passing
- canonical Hardhat suite: 29/29 passing
- maintained total: 410 passing
- `git diff --check`: pass
- intended corrective scope: exactly two files
- Hardhat-generated artifacts/cache churn restored
- corrective diff preserved unchanged

Canonical Hardhat files:

- `test/ProfitBot.js`
- `test/execution.js`
- `test/threeLegExecution.js`

An accidental broader Hardhat invocation included Polygon fork
tests and produced three fork/environment failures. It was not
the canonical maintained Hardhat gate. The explicit canonical
29-test suite was subsequently rerun and passed 29/29.

### Exact-SHA CI

Corrective SHA:
`8d24d18678f8a1262d4a9509c2e8908f57c440ff`

Workflow:
`ProfitBot CI`

Run ID:
`37050797742`

Status:
`completed`

Conclusion:
`success`

The CI `headSha` exactly matched the corrective SHA.

### Corrected layering

1J remains the provider-abstract gated acquisition layer.

1K accepts provider only so it can forward provider, together
with the completed acquired snapshots, into 1E.

1E validates and consumes provider for protected-peak stability.

Therefore accepting/forwarding provider in 1K does not make 1K
a direct RPC/provider layer.

### Recovery anchor

The corrected 1K code anchor is:

`8d24d18678f8a1262d4a9509c2e8908f57c440ff`

Do not use the original 1K closure statements in checkpoint
`0f5b1225478136840502598ee587b15438f46df8`
as current truth. This 1K.1 section supersedes them.

### Next boundary

No 1L modifying work should begin until this corrective
checkpoint itself is committed, pushed, and exact-SHA CI-green.

Existing safety boundaries remain unchanged:

- no signer
- no transaction
- no broadcast
- no production execution-path modification
- no profitability/slippage/gas/freshness/worst-case weakening
- `LIVE_READY=false` unless existing policy independently passes

## 1L — Provider-Backed Block Observer

### Milestone

1L adds the isolated provider-backed block-observation adapter
needed by the protected-peak research stack.

Code commit:

`1e2ea71ef940692b95b8d1f70d2a75125878c682`

Subject:

`Add Polygon V4 protected peak provider block observer`

Files:

- `scripts/research/runPolygonV4ProtectedPeakProviderBlock.js`
- `test/polygonV4ProtectedPeakProviderBlock.test.js`

Commit scope:

- exactly 2 files
- 156 insertions

### Responsibility

1L exports:

`observeProtectedPeakProviderBlock({ provider })`

The adapter:

- requires a provider
- requires `provider.getBlockNumber`
- performs exactly one `getBlockNumber()` observation per call
- requires the returned block tag to be a positive safe integer
- returns that block tag unchanged
- propagates provider observation failure unchanged

The adapter intentionally requires only `getBlockNumber`.

It does not require `getGasPrice`, because gas-price acquisition
belongs to the 1F snapshot-acquisition responsibility rather than
the block-observation responsibility.

### Layering

1I remains the deterministic bounded block-advancement layer and
continues to consume an injected zero-argument `observeBlockFn`.

1J remains provider-abstract gated acquisition.

1K remains gated-acquisition-to-stability composition. It accepts
provider only for forwarding to 1E stability and makes no direct
provider calls.

1L supplies the small provider-backed primitive capable of
satisfying the block-observer shape expected by 1I/1J.

1L is not yet wired into 1J or 1K. Integration remains a separate
reviewed milestone rather than silently changing established
layers.

### Explicit non-responsibilities

1L does not:

- retry provider reads
- sleep or poll
- define cadence
- define wall-clock timeout semantics
- read gas price
- perform a network check
- acquire protected-peak snapshots
- run stability analysis
- persist observations
- modify watcher behavior
- create or use a signer or wallet
- construct or submit a transaction
- broadcast anything
- modify production execution paths
- weaken profitability, slippage, gas, freshness, or worst-case policy

Observed block advancement, elapsed wall-clock time, snapshot
separation, and economically independent market states remain
distinct concepts.

### Tests and validation

Focused 1L tests:

- 5/5 passing

The focused tests verify:

- exact valid provider block is returned
- exactly one provider block observation is made
- missing provider is rejected
- provider without `getBlockNumber` is rejected
- malformed block evidence is rejected
- provider observation failure is propagated unchanged

Full maintained validation:

- Node: 386/386 passing
- canonical Hardhat: 29/29 passing
- maintained total: 415 passing
- `git diff --check`: pass
- safety scan: clean
- final code scope: exactly two intended files

Canonical Hardhat files:

- `test/ProfitBot.js`
- `test/execution.js`
- `test/threeLegExecution.js`

### Exact-SHA CI

Code SHA:

`1e2ea71ef940692b95b8d1f70d2a75125878c682`

Workflow:

`ProfitBot checks`

Run ID:

`37053807292`

Event:

`push`

Status:

`completed`

Conclusion:

`success`

Created:

`2026-10-02T19:23:32Z`

Updated:

`2026-10-02T19:24:02Z`

The CI `headSha` exactly matched the 1L code SHA.

### Safety state

1L remains provider-only research infrastructure.

No signer exists in this milestone.

No transaction is constructed or submitted.

No broadcast path is introduced.

Existing execution safety policy is unchanged.

`LIVE_READY` remains false unless the existing complete policy
independently qualifies a candidate.

### Next boundary

Any integration of the 1L provider observer into 1J/1K should be
handled as a separate additive milestone with explicit tests.

Waiting/cadence and wall-clock timeout semantics should remain
separate unless later repository evidence justifies combining
them.

Do not introduce signer, transaction, broadcast, or production
execution behavior as part of provider-observer integration.
## Milestone 1M — Polygon V4 protected peak provider observer binding

Status: code complete, locally validated, pushed, and exact-SHA CI green.

Code commit:
- SHA: `67bda0bbff61d034fa8418c4bdbb47db87c387b8`
- Subject: `Add Polygon V4 protected peak provider observer binding`
- Parent: `df84d2b6efc6d28d9788bb383e229b514b273779`
- Scope: exactly two new files, 191 insertions:
  - `scripts/research/runPolygonV4ProtectedPeakProviderObserver.js`
  - `test/polygonV4ProtectedPeakProviderObserver.test.js`

Purpose:
- Bind a provider to the 1L provider-block observer and expose the zero-argument `observeBlockFn()` contract consumed by 1I/1J.
- Resolve only the interface mismatch between 1L `{ provider }` observation and the existing zero-argument observer boundary.

Behavior:
- `createProtectedPeakProviderObserver({ provider, observeProviderBlockFn })` returns an async zero-argument observer.
- Creating the observer performs zero provider reads.
- Each observer invocation delegates exactly once to the provider-block dependency with the exact provider.
- The default dependency is 1L `observeProtectedPeakProviderBlock`.
- Provider validation remains owned by 1L rather than duplicated in 1M.
- Invalid injected provider-block dependencies fail before observation.
- Provider-block failures propagate unchanged.

Architecture boundaries:
- 1M does not implement retry, sleep, polling, cadence, or wall-clock timeout.
- 1M does not decide how often observation occurs.
- 1M does not acquire snapshots or perform stability analysis.
- 1M does not directly call provider methods.
- 1I remains responsible for deterministic bounded block-advancement attempts.
- 1J remains responsible for gated snapshot acquisition and remains provider-abstract.
- 1K remains responsible for gated acquisition -> stability composition.
- 1L remains responsible for one provider-backed block-number observation.
- 1I, 1J, and 1K were not modified by 1M.
- Wiring 1M into a higher composition layer remains a separate reviewed milestone.

Safety:
- Provider-only/read-only architecture.
- No signer.
- No wallet/private key handling.
- No transaction creation.
- No broadcast.
- No persistence or watcher modification.
- No production contract or execution-route modification.
- No profitability, slippage, gas, freshness, minimum-profit, or worst-case policy weakening.
- `LIVE_READY` remains policy-gated.

Validation:
- Focused 1M: 6/6 passing.
- Maintained Node suite: 392/392 passing.
- Canonical Hardhat suite: 29/29 passing.
- Maintained total: 421 passing.
- Pre/post `git diff --check`: passing.
- Safety scan: empty.
- Direct provider-read scan in 1M implementation: empty.
- Final implementation scope: exactly the intended two files.

CI:
- Workflow: `ProfitBot checks`
- Run: `37055510322`
- Event: `push`
- Exact head SHA: `67bda0bbff61d034fa8418c4bdbb47db87c387b8`
- Status: `completed`
- Conclusion: `success`

Next boundary:
- Do not add timers or hidden polling to 1M.
- Any integration of the bound observer into the gated acquisition/stability chain must be a separate additive, reviewed milestone.
- Keep provider observation, block-advancement attempt policy, wall-clock waiting/cadence, snapshot acquisition, and stability analysis as distinct responsibilities unless repository evidence justifies a later composition.

## Milestone 1N — Polygon V4 provider gated stability composition

Status: code complete, locally validated, pushed, and exact-SHA CI green.

Code commit:
- SHA: `3e56841d3fca545b50ca1ad5770d8bfc6dae3338`
- Subject: `Add Polygon V4 provider gated stability composition`
- Parent: `6c8226e8ac1b075eace5c8c05964a9320d0f94fc`
- Scope: exactly two new files, 402 insertions:
  - `scripts/research/runPolygonV4ProtectedPeakProviderGatedStability.js`
  - `test/polygonV4ProtectedPeakProviderGatedStability.test.js`

Purpose:
- Add the provider-backed composition layer above 1K without making 1J provider-aware or making 1K construct provider observers.
- Bind the existing provider-backed snapshot and block-observation capabilities to the zero-argument function boundaries already consumed by 1J/1K.

Behavior:
- `runProviderGatedProtectedPeakStability(...)` composes the existing provider-only research layers.
- The exact provider is supplied to the provider-observer factory.
- The exact provider is captured by a zero-argument snapshot closure and supplied to the existing provider snapshot dependency only when snapshot acquisition is requested.
- The resulting zero-argument `observeBlockFn` and `acquireSnapshotFn` are passed to 1K.
- `provider`, `count`, `minimumBlockGap`, and `maxAttempts` are forwarded unchanged to 1K.
- `amounts` is forwarded only when explicitly supplied.
- Invalid composition dependencies fail before observer construction.
- A malformed observer-factory result fails before gated stability execution.
- Observer-factory and gated-stability failures propagate unchanged.

Architecture boundaries:
- 1N is a binding/composition layer only.
- 1N performs no direct provider reads.
- 1N does not itself acquire a snapshot during dependency composition.
- 1N does not implement block-advancement attempt policy.
- 1N does not implement retry, sleep, polling, cadence, or wall-clock timeout.
- 1N does not perform stability calculations itself.
- 1F remains responsible for provider-backed snapshot acquisition.
- 1L remains responsible for one provider-backed block-number observation.
- 1M remains responsible for binding provider observation to the zero-argument observer contract.
- 1I remains responsible for deterministic bounded block-advancement attempts.
- 1J remains provider-abstract and responsible for gated snapshot acquisition.
- 1K remains responsible for gated acquisition -> stability composition.
- 1E remains responsible for protected peak stability analysis.
- Existing 1E through 1M implementation files were not modified by 1N.

Safety:
- Provider-only/read-only architecture.
- No signer.
- No wallet or private-key handling.
- No transaction construction.
- No transaction submission or broadcast.
- No persistence or watcher modification.
- No production contract or execution-route modification.
- No profitability, slippage, gas, freshness, minimum-profit, or worst-case policy weakening.
- `LIVE_READY` remains independently policy-gated.

Validation:
- Focused 1N: 6/6 passing.
- Maintained Node suite: 398/398 passing.
- Canonical Hardhat suite: 29/29 passing.
- Maintained total: 427 passing.
- Pre-validation `git diff --check`: passing.
- Post-validation `git diff --check`: passing.
- Safety scan: empty.
- Direct provider-read scan in the 1N implementation: empty.
- Final implementation scope: exactly the intended two files.

CI:
- Workflow: `ProfitBot checks`
- Run: `37057302827`
- Event: `push`
- Exact head SHA: `3e56841d3fca545b50ca1ad5770d8bfc6dae3338`
- Status: `completed`
- Conclusion: `success`
- Created: `2026-10-02T19:55:56Z`
- Updated: `2026-10-02T19:57:11Z`
- Note: the immediate `gh run list --commit` lookup returned an empty result, but the branch run listing independently reported this exact head SHA and completed successful run.

Next boundary:
- Do not add timers, hidden polling, cadence, or wall-clock waiting inside 1I through 1N.
- Any real repeated observation cadence should remain a separate reviewed responsibility.
- Do not introduce signer, transaction, broadcast, or production execution behavior as part of this provider-backed research composition.
- Preserve the separation between provider observation, block-advancement attempt policy, wall-clock waiting, snapshot acquisition, gated acquisition, and stability analysis.

## Milestone 1O — Polygon V4 protected peak provider cadence

Status: code complete, locally validated, pushed, and exact-SHA CI green.

### Code commit

- SHA: `fd91be5d07e3c9fca3a3660d84eac404e632940b`
- Subject: `Add Polygon V4 protected peak provider cadence`
- Parent: `30968333c41e16dada0e5f7aabedfab2b1457a7d`
- Scope:
  - `scripts/research/runPolygonV4ProtectedPeakProviderCadence.js`
  - `test/polygonV4ProtectedPeakProviderCadence.test.js`
- Change size: 2 new files, 568 insertions.

### Purpose and behavior

1O adds a bounded orchestration layer above unchanged 1N provider-backed gated stability.

- Runs exactly `maxCycles` unless an invoked dependency throws.
- `maxCycles` must be a positive safe integer.
- `waitMs` must be a non-negative safe integer.
- Waiting is injected through `waitFn`; the core 1O implementation does not own `setTimeout`.
- The first cycle runs immediately.
- Waiting occurs only between cycles, never before the first cycle or after the final cycle.
- Each cycle delegates to 1N with the exact provider, count, minimum block gap, maximum attempt budget, and optional amounts override.
- Omitted `amounts` remains omitted.
- Each exact 1N result is preserved in the returned cycle evidence.
- An incomplete gated acquisition is preserved as cycle evidence and does not by itself terminate later bounded cycles.
- Cycle failures propagate unchanged.
- Wait failures propagate unchanged and prevent the next cycle from starting.
- Wall-clock waiting never counts as block advancement. Existing 1I block observation and minimum-gap policy remain authoritative.

### Responsibility boundaries

- 1I remains responsible for deterministic bounded block-advancement observation.
- 1J remains responsible for block-gated snapshot acquisition.
- 1K remains responsible for composing gated acquisition with protected-peak stability.
- 1L remains responsible for one provider block-number observation.
- 1M remains responsible for provider-to-zero-argument observer binding.
- 1N remains responsible for provider-backed gated-stability composition.
- 1O owns only bounded multi-cycle orchestration and injected between-cycle waiting.
- No existing 1I through 1N implementation was modified.

### Safety boundary

1O remains research-only and provider-only.

- No signer.
- No wallet or private key.
- No transaction construction or submission.
- No broadcast.
- No direct provider reads in 1O.
- No `setInterval` or internal daemon.
- No persistence or filesystem writes.
- No environment-variable policy.
- No production execution integration.
- No profitability, slippage, gas, freshness, block-gap, or worst-case policy weakening.
- `LIVE_READY` remains independently gated by the existing qualification and safety policy.

### Validation

- Focused 1O tests: 7/7 passing.
- Maintained Node suite: 405/405 passing.
- Canonical Hardhat suite: 29/29 passing.
- Maintained total: 434 passing.
- Safety scan: empty.
- Direct provider-read scan: empty.
- Existing 1I through 1N change check: unchanged.
- Final pre-commit scope: exactly the two intended 1O files.
- Generated Hardhat artifact/cache churn was restored before commit.

### Exact-SHA CI

- Workflow: `ProfitBot CI`
- Run: `37060384205`
- Event: `push`
- Head SHA: `fd91be5d07e3c9fca3a3660d84eac404e632940b`
- Created: `2026-10-02T20:24:34Z`
- Updated: `2026-10-02T20:25:15Z`
- Status: `completed`
- Conclusion: `success`

### Next boundary

The next stage may provide a controlled provider-only runner around 1O for real multi-block stability observation.

That stage must remain bounded and read-only. Real wall-clock waiting may be supplied outside the 1O core, but elapsed time must never substitute for observed block advancement.

Do not add signer, transaction, broadcast, or production execution behavior. If future evidence reaches `LIVE_READY`, freeze and preserve the evidence, requalify against current head and gas, perform final fork/execution simulation, and keep any execution integration as a separate reviewed stage.

## Milestone 1P — Protected Peak Provider Timed Cadence

Status: CODE COMPLETE, LOCALLY VALIDATED, PUSHED, EXACT-SHA CI GREEN

Code commit:
- SHA: `b5d0ac5bfea0fe2df369cf6ecc310d3b93bcd873`
- Parent: `6f0ab1066c1213f15c8bd9640509fb65dba36703`
- Subject: `Add Polygon V4 protected peak timed cadence`
- Scope: exactly two new files, 283 insertions
  - `scripts/research/runPolygonV4ProtectedPeakProviderTimedCadence.js`
  - `test/polygonV4ProtectedPeakProviderTimedCadence.test.js`

Purpose:
- Add the smallest real wall-clock timing adapter above unchanged 1O.
- Provide a concrete `sleep(ms)` implementation using `setTimeout`.
- Delegate the supplied provider and bounded cadence policy exactly once to 1O.
- Preserve the exact 1O result unchanged.
- Preserve omitted `amounts` rather than inventing an override.

Boundary:
- 1P does not choose `count`.
- 1P does not choose `minimumBlockGap`.
- 1P does not choose `maxAttempts`.
- 1P does not choose `maxCycles`.
- 1P does not choose `waitMs`.
- 1P does not construct a provider.
- 1P does not read `process.env`.
- 1P does not directly read the provider.
- 1P does not interpret or rewrite cadence results.
- 1P does not persist observations.
- 1P does not create a daemon, heartbeat, interval, or unbounded loop.
- 1P does not add signer, wallet, private-key, transaction, flashloan execution, or broadcast behavior.
- Existing 1I through 1O remain unchanged.

Timing semantics:
- Real wall-clock waiting exists only through the wait function supplied to 1O.
- 1O waits only between bounded cadence cycles.
- There is no wait before the first cycle or after the final cycle.
- Wall-clock elapsed time never counts as block advancement.
- 1I/provider block observation remains authoritative for block advancement.
- 1P does not add waiting inside 1I bounded block-observation attempts.
- An incomplete 1N result remains an exact recorded cycle result; a later bounded 1O cycle may retry after the configured between-cycle wait.

Validation:
- Focused 1P tests: 6/6 passing.
- Maintained Node suite: 411/411 passing.
- Canonical Hardhat suite:
  - `test/ProfitBot.js`
  - `test/execution.js`
  - `test/threeLegExecution.js`
  - 29/29 passing.
- Maintained Node + canonical Hardhat total: 440 passing.
- 1P execution-safety scan: empty.
- 1P direct-provider-read scan: empty.
- Timer ownership: exactly one intentional `setTimeout`; no `setInterval`.
- 1I through 1O unchanged.
- Hardhat-generated `artifacts/` and `cache/` churn was restored before commit.

Exact-SHA CI:
- Workflow: `ProfitBot checks`
- Run ID: `37062202993`
- Event: `push`
- Head SHA: `b5d0ac5bfea0fe2df369cf6ecc310d3b93bcd873`
- Created: `2026-10-02T20:41:34Z`
- Updated: `2026-10-02T20:42:18Z`
- Status: `completed`
- Conclusion: `success`

Protected-peak layering now:
- 1I: deterministic bounded block-advancement observation.
- 1J: block-gated snapshot acquisition.
- 1K: gated acquisition plus protected-peak stability.
- 1L: one provider block-number observation.
- 1M: provider-to-zero-argument observer binding.
- 1N: provider-backed gated-stability composition.
- 1O: bounded multi-cycle provider cadence with injected between-cycle waiting.
- 1P: concrete timed-cadence adapter supplying real wall-clock waiting to 1O.

Next boundary:
- Keep the next layer provider-only and read-only.
- A later operational runner may construct the Polygon provider and choose explicit bounded policy values.
- Do not hide policy choices inside 1P.
- Do not treat elapsed wall-clock time as evidence of block advancement.
- Do not add signer, transaction, broadcast, or production integration as part of provider monitoring.
- If `LIVE_READY` is ever observed, freeze the evidence, requalify against current head and gas, perform final fork/execution simulation, preserve the evidence, and keep any execution action as a separate reviewed stage.

## Milestone 1Q — Polygon V4 protected peak operational runner

Status: code complete, locally validated, pushed, and exact-SHA CI green.

### Code identity

- Commit: `1fedc1d602837853a21ff9f9cb0e18ee86d52974`
- Parent: `d72f2e2ca4746c4da723ab50c9a02b5c4eb3a692`
- Subject: `Add Polygon V4 protected peak operational runner`
- Scope: exactly two new files, 390 insertions:
  - `scripts/research/runPolygonV4ProtectedPeakProviderOperational.js`
  - `test/polygonV4ProtectedPeakProviderOperational.test.js`

### Purpose and boundary

1Q adds the small provider-only operational layer above the unchanged 1P timed cadence adapter.

It may:

- read `INFURA_POLYGON` in `main()`;
- construct an ethers v5 `JsonRpcProvider` pinned to Polygon chain ID 137;
- choose explicit bounded monitoring configuration in `main()`;
- invoke the 1P timed cadence path exactly once;
- print the returned observation structure.

It does not:

- obtain a signer;
- create or use a wallet or private key;
- send or broadcast a transaction;
- call flashloan execution;
- persist observations;
- create an interval, daemon, heartbeat, or unbounded loop;
- directly read provider block, gas, transaction, or call data;
- modify production execution integration;
- interpret returned observations as execution authorization.

### Policy ownership

The reusable `runProtectedPeakProviderOperational(...)` function does not invent omitted monitoring policy.

`main()` explicitly owns the current bounded operational monitoring configuration:

- `OPERATIONAL_COUNT = 2`
- `OPERATIONAL_MINIMUM_BLOCK_GAP = 1`
- `OPERATIONAL_MAX_ATTEMPTS = 3`
- `OPERATIONAL_MAX_CYCLES = 2`
- `OPERATIONAL_WAIT_MS = 5000`

These values are bounded observation/cadence configuration. They do not relax profitability, slippage, gas, freshness, reserve, protected-output, worst-case, or minimum-profit safety policy.

Timing semantics remain important:

- the 5000 ms wait is only between 1O cadence cycles;
- there is no wait before the first cycle or after the final cycle;
- 1I block-observation attempts remain immediate bounded observations;
- elapsed wall-clock time never counts as block advancement;
- provider-observed block evidence remains authoritative;
- an incomplete cycle may be retried only by a later bounded cadence cycle.

### Validation

Focused 1Q:

- 8 tests passed.

Maintained Node suite:

- 419 tests passed.

Canonical Hardhat suite:

- `test/ProfitBot.js`
- `test/execution.js`
- `test/threeLegExecution.js`
- 29 tests passed.

Maintained suite total:

- 448 passing tests = 419 Node + 29 Hardhat.
- The 8 focused 1Q tests are included in the 419 Node tests and are not double-counted.

Validation return codes:

- `FOCUSED_RC=0`
- `NODE_RC=0`
- `HARDHAT_RC=0`
- `1I_TO_1P_UNCHANGED_RC=0`

Safety verification:

- 1Q execution-safety scan empty.
- 1Q direct-provider-action scan empty.
- 1Q timer scan empty.
- Existing protected 1I through 1P files were byte-for-byte unchanged across validation.
- Hardhat-generated `artifacts/` and `cache/` churn was restored only from those generated directories before commit.
- Final code commit contained exactly the two intended 1Q files.

### Exact-SHA CI

GitHub Actions:

- Workflow: `ProfitBot CI`
- Run ID: `37065074015`
- Event: `push`
- Head SHA: `1fedc1d602837853a21ff9f9cb0e18ee86d52974`
- Created: `2026-10-02T21:08:57Z`
- Updated: `2026-10-02T21:09:44Z`
- Status: `completed`
- Conclusion: `success`
- `WATCH_RC=0`

### Current protected-peak layering

The provider-only protected-peak path now extends through 1Q:

- 1I: deterministic bounded block advancement
- 1J: gated snapshot acquisition
- 1K/1K.1: gated stability composition with exact provider forwarding
- 1L: one provider block observation
- 1M: zero-argument provider observer adapter
- 1N: provider-backed gated stability composition
- 1O: bounded cadence/orchestration
- 1P: real wall-clock timed cadence adapter
- 1Q: provider construction plus explicit bounded operational monitoring configuration

### Safety boundary after 1Q

1Q remains provider-only/read-only infrastructure.

`LIVE_READY` remains false unless the existing protected qualification policy independently passes.

No observation from 1Q authorizes execution.

Before any future execution-stage integration:

1. freeze qualifying evidence;
2. requalify against current head and current gas;
3. run final fork/execution simulation;
4. preserve the evidence;
5. review execution as a separate stage;
6. only then consider any signer or transaction path.

Do not weaken profitability, slippage, gas, freshness, reserve, protected-output, worst-case, or minimum-profit policy to manufacture readiness.

## Milestone 1R.2 — protected peak surface timing instrumentation

Status: code committed and pushed; live timing observation not yet rerun.

Code commit:

- `33c41aa18cfd4edfe808f55d31e06748707799c6`
- subject: `Instrument Polygon V4 protected peak stability timing`
- parent: `d8e7a7a867dbfaf655a08ae4dc3607a29605e784`

Purpose:

- measure the wall-clock duration of each complete protected fine surface;
- preserve the existing sequential provider-only observation architecture;
- gather evidence before considering any deeper per-row timing, concurrency,
  timeout, batching, or quote-path changes.

Implementation:

- `runProtectedPeakStability` accepts injectable `nowFn`, defaulting to
  `Date.now`;
- each complete delegated protected surface records `durationMs`;
- the returned stability summary records `totalSurfaceDurationMs`;
- timing values must be non-negative safe integers;
- invalid timing dependency is rejected before surface work;
- deterministic tests use an injected clock.

Scope intentionally unchanged:

- protected amount grid remains unchanged;
- surfaces remain sequential;
- observations inside each surface remain sequential;
- no concurrency was introduced;
- no timeout/retry policy was changed;
- no profitability policy was changed;
- no slippage policy was changed;
- no freshness policy was changed;
- qualification gas remains `700000`;
- no signer, transaction, or broadcast capability was added.

Validation before commit:

- focused protected-peak stability suite: `8 / 8` passing;
- canonical Node suite: `422 / 422` passing;
- canonical Hardhat suite: `29 / 29` passing;
- maintained total: `451` passing tests;
- pre-validation `git diff --check`: passing;
- post-validation `git diff --check`: passing;
- execution-safety diff scan: empty;
- Hardhat-generated `artifacts/` and `cache/` churn restored before commit;
- no live RPC run was performed during implementation or validation.

Hardhat validation note:

- a broader diagnostic Hardhat invocation temporarily included Polygon fork
  tests and did not provide the required historical fork configuration;
- that invocation was not the repository's maintained Hardhat regression gate;
- repository discovery confirmed the canonical maintained command is
  `hardhat test test/ProfitBot.js test/execution.js test/threeLegExecution.js`;
- that canonical suite subsequently passed `29 / 29`;
- no dependency or Hardhat configuration change was made.

1R evidence motivating this instrumentation:

- the completed provider-only 1R run performed four protected fine surfaces;
- each surface contains 26 amounts;
- therefore the run performed 104 sequential three-leg economic observations;
- the stable protected peak was `0.118 WPOL` across all four snapshots;
- qualification remained false because observed gas price was far above the
  protected break-even ceiling;
- policy must not be weakened to manufacture readiness.

Next exact step:

1. keep code commit `33c41aa18cfd4edfe808f55d31e06748707799c6`
   unchanged;
2. run one separately approved provider-only 1R observation using the existing
   operational runner;
3. capture the four new per-surface `durationMs` values and cycle-level
   `totalSurfaceDurationMs` values;
4. compare those timings with the prior apparent runtime;
5. only after timing evidence exists decide whether per-row instrumentation is
   justified;
6. do not introduce concurrency, timeout changes, gas-policy changes, or live
   transaction capability as part of the timing measurement.

Separate future workstream:

Gas calibration remains independent of 1R.2. The proven isolated Aave + V4
historical fork measured `618122` gas while protected qualification continues
to use the conservative `700000` gas-unit assumption. Do not change that
assumption from latency evidence alone. Any future gas calibration should
compare fork-measured gas, conservative qualification gas, and—only after a
separately reviewed real transaction exists—actual receipt gas usage.

## Milestone 1R.3 — live provider-only timing observation

Status: completed successfully at durable head
`d8817e186430a6f42a8af6190b912cd46c1b838f`.

Safety and repository state:

- provider-only Polygon observation;
- no signer;
- no transaction;
- no broadcast;
- executable transaction-primitive launch scan: none;
- `LIVE_RUN_RC=0`;
- `PROVIDER_ONLY_OBSERVATION_COMPLETE=yes`;
- worktree remained clean;
- local HEAD and remote remained identical.

Operational policy remained unchanged:

- snapshot count: `2`;
- minimum block gap: `1`;
- maximum advancement attempts: `3`;
- maximum cadence cycles: `2`;
- inter-cycle wait: `5000 ms`;
- protected qualification gas units: `700000`;
- no profitability, reserve, slippage, freshness, or worst-case policy change.

Wall-clock evidence:

- started: `2026-10-02T22:16:52Z`;
- finished: `2026-10-02T22:28:21Z`;
- outer wall time: `689 seconds`.

Measured protected fine-surface durations:

- cycle 1 / snapshot 1: `155530 ms`;
- cycle 1 / snapshot 2: `182919 ms`;
- cycle 1 total: `338449 ms`;
- cycle 2 / snapshot 1: `156903 ms`;
- cycle 2 / snapshot 2: `184150 ms`;
- cycle 2 total: `341053 ms`;
- all four surfaces total: `679502 ms`.

Derived latency evidence:

- protected surfaces consumed approximately `98.62%` of the measured
  689-second outer wall time;
- approximately `9.5 seconds` remained outside the four measured surfaces,
  including acquisition, block advancement, the explicit 5-second inter-cycle
  wait, output overhead, and timing granularity;
- each surface contains 26 sequential amount observations;
- average surface time per amount was approximately `5.98`, `7.04`, `6.03`,
  and `7.08` seconds respectively;
- this localizes the dominant measured latency to the protected amount-surface
  path, but does not yet identify which RPC or quote operation inside each
  amount observation is responsible;
- do not infer from this evidence alone that provider latency causes Polygon
  gas prices to be high.

Acquisition / advancement evidence:

- cycle 1 blocks: `94849515`, `94849516`;
- cycle 2 blocks: `94849745`, `94849746`;
- both block advancements succeeded on attempt `1`;
- the large block movement during the complete run is consistent with the
  directly measured serial surface runtime.

Economic evidence:

- all four surfaces returned `26 / 26` `QUOTE_OK`;
- all four selected protected optimum `0.118 WPOL`;
- all four peak positions were `INTERIOR`;
- gross delta remained approximately `0.01456537 WPOL`;
- protected gas-price ceiling remained approximately `11.205 gwei`;
- observed acquisition gas was approximately `274.4-276.9 gwei`;
- gas coverage remained approximately `4.05-4.08%`;
- `qualifiesAtObservedGas=false` for all four protected optima;
- this observation does not justify weakening or changing economic policy.

Interpretation boundary:

The observation proves that the current qualification/research path is too
slow for freshness-sensitive execution if comparable latency persists. It does
not prove that the latency causes high network gas prices, and it does not yet
identify the slow operation inside each three-leg economic observation.

Next engineering step:

Instrument per-row observation duration at the existing amount-surface
boundary while preserving sequential execution and all current economics.
Use that evidence to determine whether latency is broadly uniform across rows
or concentrated in particular observations before considering concurrency,
batching, RPC-provider changes, timeout changes, caching, or other
optimizations.

Do not change `gasUnits=700000` as part of latency investigation. Gas
calibration remains a separate evidence-driven workstream.

## Milestone 1R.4 — V3 RPC bottleneck instrumentation and pinned-block pool cache

Status: implementation and performance evidence validated locally at base durable
head `be121dcd5e60da622f0dec72cac682258a18e076`; changes are not yet committed
or pushed.

Objective:

Identify the actual RPC bottleneck inside each protected three-leg amount
observation before attempting optimization, then apply the smallest
evidence-supported optimization without weakening route coverage, economics,
freshness, or execution safety.

Instrumentation diagnosis:

A controlled provider-only measurement on Polygon using `ALCHEMY_POLYGON`
showed that a successful `0.118 WPOL` observation performed up to 17 sequential
RPC operations:

- 8 Uniswap V3 factory `getPool` lookups;
- up to 8 amount-dependent Uniswap V3 Quoter calls;
- 1 V4 quote.

Five pre-cache observations on the same provider context measured:

- total wall times: `2415`, `2410`, `2634`, `2351`, `2399 ms`;
- mean total wall time: `2441.8 ms`;
- mean measured RPC time: `2432.6 ms`;
- mean V3 pool-lookup time: `1137.0 ms` (`46.56%`);
- mean V3 quote time: `1154.6 ms` (`47.28%`);
- mean V4 quote time: `141.0 ms` (`5.77%`);
- mean unaccounted time: `9.2 ms` (`0.38%`).

This localized the current-provider bottleneck to accumulated sequential V3
network round trips, split approximately evenly between structural factory
lookups and required amount-dependent V3 quotes. V4 and local processing were
not the dominant bottlenecks.

The approximately `2.4 second` current-provider observations must not be
treated as directly interchangeable with the approximately `6-7 second`
per-amount timings from 1R.3 because the provider/context differs.

Implemented optimization:

The strict V3 observer now supports an explicitly supplied, surface-scoped pool
cache.

Cache invariants:

- no module-global cache was introduced;
- one cache is created per amount-surface invocation;
- the cache is shared by ENTRY and EXIT observations within that surface;
- keys include the pinned block, unordered lowercase token pair, and fee tier;
- all four V3 fee tiers remain enabled;
- successful factory resolutions are cached, including zero-address `NO_POOL`
  resolutions;
- factory RPC failures are never cached;
- amount-dependent V3 Quoter calls are never cached;
- ENTRY -> V4 -> EXIT ordering remains unchanged;
- no concurrency was introduced;
- no retry or timeout behavior was changed;
- no economic, slippage, reserve, freshness, worst-case, or gas-unit policy was
  changed;
- no-cache callers retain the prior lookup behavior.

Timing evidence remains explicit:

- actual factory lookups record measured `poolLookupDurationMs` and
  `poolLookupCacheHit=false`;
- cache hits record `poolLookupCacheHit=true` and
  `poolLookupDurationMs=0`;
- V3 Quoter and V4 quote durations remain independently measured.

Validation:

Focused cache/instrumentation gate:

- `39 / 39` tests passed.

Canonical regression gate under Node `18.20.8`:

- Node tests: `434 / 434`;
- Hardhat tests: `29 / 29`;
- total: `463 / 463`;
- `git diff --check` passed;
- generated Hardhat artifact/cache churn was restored separately;
- the intended implementation/test scope remained six files before this
  checkpoint update.

Controlled post-cache provider-only benchmark:

- provider environment: `ALCHEMY_POLYGON`;
- chain: Polygon `137`;
- pinned block: `94858727`;
- amount: `0.118 WPOL`;
- repeats: `5`;
- one cache shared across the five observations;
- no signer;
- no transaction;
- no broadcast.

Cold observation:

- status: `QUOTE_OK`;
- total: `2452 ms`;
- V3 pool lookup: `1167 ms`;
- V3 quote: `1128 ms`;
- V4 quote: `146 ms`;
- cache hits: `0`;
- cache misses: `8`;
- V3 quote calls: `8`;
- resulting cache size: `8`.

Warm observations:

- wall times: `1227`, `1373`, `1275`, `1207 ms`;
- mean wall time: `1270.5 ms`;
- mean V3 pool-lookup time: `0 ms`;
- mean V3 quote time: `1129.25 ms`;
- mean V4 quote time: `138 ms`;
- mean unaccounted time: `3.25 ms`;
- cache hits per observation: `8`;
- cache misses per observation: `0`;
- V3 quote calls per observation: `8`;
- final cache size: `8`;
- all observations remained `QUOTE_OK`.

Measured effect:

- cold-to-warm reduction: `1181.5 ms`, approximately `48.2%`;
- pre-cache five-run mean to warm mean reduction: `1171.3 ms`,
  approximately `48.0%`;
- the eliminated wall time closely matches the independently measured
  structural V3 factory-lookup component;
- required amount-dependent V3 Quoter work remains present.

Interpretation:

The evidence supports the pinned-block structural V3 pool cache as a targeted
optimization of the measured bottleneck. It removes redundant factory network
round trips without reducing fee-tier coverage or changing quote economics.

After cache warming, the dominant measured latency is the required
amount-dependent V3 Quoter work. This evidence does not by itself justify
concurrency, fee-tier removal, retry/timeout changes, provider changes, or any
weakening of qualification policy.

The optimization does not change the separate gas-policy conclusion:
`gasUnits=700000` remains unchanged. Gas calibration remains an independent
evidence-driven workstream.

Current closeout state:

- six implementation/test files plus this checkpoint are modified;
- implementation is not yet committed;
- implementation is not yet pushed;
- no live transaction was performed.

Next exact step:

1. review the final semantic diff and exact seven-file scope;
2. verify prohibited execution/deployment/environment paths remain untouched;
3. verify `git diff --check`;
4. only after that review decide whether 1R.4 is ready to commit;
5. do not push until explicitly approved.
