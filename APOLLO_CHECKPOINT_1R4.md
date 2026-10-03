# Apollo Recovery Checkpoint — 1R.4

## Purpose

This file is a durable recovery checkpoint for the completion of the
1R.4 Polygon quote-path latency investigation and first safe optimization.

It is intentionally stored beside the earlier `APOLLO_CHECKPOINT.md`
rather than replacing that historical checkpoint.

If chat/session context is lost, recover from this file plus Git before
continuing development.

---

## Repository State

Repository:

`/workspaces/profitbot_project`

Branch:

`repair/simulation-safety`

Durable 1R.4 commit:

`0e15cf39c3c3b6b9cd31b5de1f487dc8bfddfa41`

Commit subject:

`Optimize 1R.4 pinned V3 pool observations`

Previous durable 1R.3 commit:

`be121dcd5e60da622f0dec72cac682258a18e076`

Commit subject:

`Record 1R.3 provider timing evidence`

At 1R.4 closeout:

- local HEAD = `0e15cf39c3c3b6b9cd31b5de1f487dc8bfddfa41`
- `origin/repair/simulation-safety` = same commit
- local/remote match = YES
- worktree was clean immediately after push
- 1R.4 push succeeded
- no live transaction was performed

---

## Runtime

Project Node version:

`v18.20.8`

npm version used for canonical validation:

`10.8.2`

Repository `.nvmrc`:

`18.20.8`

Important Codespaces behavior:

A Codespaces restart may restore the shell default to Node 24 even though
the repository and Git history persist.

During the latest recovery:

- shell initially reported Node `v24.21.0`
- `.nvmrc` still contained `18.20.8`
- `nvm use 18.20.8` successfully restored Node `v18.20.8`
- npm became `v10.8.2`

Do not assume the active shell is using the project Node version after a
Codespaces restart.

Check first:

    node --version
    cat .nvmrc

Then restore Node 18.20.8 using the environment's available `nvm`
command if necessary.

The path `$HOME/.nvm/nvm.sh` was not present during the latest recovery,
despite the `nvm` command itself being usable. Do not reinstall NVM merely
because that particular file is absent.

Also avoid diagnostic shell blocks containing `exit` when they are being
pasted directly into the interactive Codespaces terminal: an `exit` can
terminate the terminal session.

---

## RPC Environment

At 1R.4 closeout:

- `ALCHEMY_POLYGON` = present
- `INFURA_POLYGON` = missing

No RPC secret value was printed or committed.

No `.env` file was created for this work.

The 1R.4 live provider-only measurements used the available Alchemy
Polygon provider.

Some research scripts expect the variable name `INFURA_POLYGON`.
For isolated measurement processes, the existing Alchemy value was mapped
to that expected variable name for the Node process only.

Do not place RPC URLs/API keys in:

- source code
- Git
- checkpoint files
- chat
- terminal command history unnecessarily

Missing `INFURA_POLYGON` alone is not a reason to alter the repository
while `ALCHEMY_POLYGON` is available for the intended research workflow.

---

## 1R.4 Objective

The purpose of 1R.4 was to identify the actual Polygon RPC latency
bottleneck before attempting optimization, then implement the smallest
safe optimization justified by measurement.

The work explicitly avoided speculative performance changes.

No concurrency was added.

No fee tier was removed.

No retry or timeout behavior was weakened.

No economic qualification policy was weakened.

No gas-unit assumption was changed.

No freshness rule was relaxed.

No live-network transaction was sent.

---

## 1R.3 Baseline Context

The preceding 1R.3 provider-only evidence recorded:

- outer wall time: approximately 689 seconds
- four protected surfaces: 679.502 seconds
- protected surfaces represented approximately 98.62% of wall time
- 26 amounts per surface
- average approximately 5.98–7.08 seconds per amount
- all four surfaces: 26/26 `QUOTE_OK`
- protected optimum: `0.118 WPOL`
- optimum classification: `INTERIOR`
- protected gas ceiling: approximately `11.205 gwei`
- observed gas: approximately `274.4–276.9 gwei`
- qualification: false
- `gasUnits`: 700000

Those economics/safety constraints were not weakened during 1R.4.

The 1R.4 measurement provider/context differed from the earlier 1R.3
provider context, so absolute latency numbers must not be conflated across
those runs.

---

## Pre-Optimization Architecture Diagnosis

`runAmountSurface` evaluates 26 amounts sequentially.

For each amount it awaits `observeThreeLegEconomics`.

`observeThreeLegEconomics` performs the dependent path:

1. ENTRY outer quote
2. V4 quote
3. EXIT outer quote

ENTRY and EXIT are Uniswap V3 observations.

The strict V3 observer retains all fee tiers:

`[100, 500, 3000, 10000]`

Before the cache optimization, each fee tier performed a sequential
factory `getPool()` lookup.

If a pool existed, it then performed the amount-dependent V3 Quoter call.

For one successful three-leg amount observation, the upper bound was:

- 8 V3 factory lookups
- up to 8 V3 quote calls
- 1 V4 quote

That is up to 17 sequential RPC operations per amount.

The measured successful sample exhibited exactly that structure.

---

## 1R.4 Instrumentation

Instrumentation was added before optimization.

V3 per-fee-tier evidence now records:

- `poolLookupDurationMs`
- `quoteDurationMs`
- pool lookup cache-hit state where applicable

V4 evidence records:

- `quoteDurationMs`

Timing dependencies are testable using an injected `nowFn`.

Timing validation was structured so an invalid successful timing result is
not accidentally caught and reclassified as an RPC failure.

Deterministic tests lock this behavior.

---

## Pre-Cache Measurement

Provider:

Alchemy Polygon

Pinned block:

`94856622`

Amount:

`0.118 WPOL`

Single representative observation:

- total: 2518 ms
- V3 pool lookup time: 1198 ms
- V3 quote time: 1179 ms
- V4 quote time: 133 ms
- measured RPC time: 2510 ms
- unaccounted/local time: 8 ms
- sequential RPC operations: 17

Five-repeat totals:

- 2415 ms
- 2410 ms
- 2634 ms
- 2351 ms
- 2399 ms

Five-repeat means:

- total: 2441.8 ms
- measured RPC: 2432.6 ms
- unaccounted/local: 9.2 ms
- V3 pool lookup: 1137.0 ms
- V3 quote: 1154.6 ms
- V4: 141.0 ms

Approximate shares:

- V3 pool lookup: 46.56%
- V3 quote: 47.28%
- V4: 5.77%
- unaccounted/local: 0.38%

Diagnosis:

The dominant latency came from accumulated sequential V3 network round
trips, split approximately equally between factory `getPool()` lookups
and amount-dependent V3 Quoter calls.

V4 was not the primary bottleneck.

Local processing was negligible.

This evidence justified eliminating repeated structural V3 factory
lookups without changing amount-dependent quote work.

---

## Implemented Optimization

The optimization is an explicit supplied V3 pool cache.

It is not global.

It is scoped to one amount-surface invocation.

The surface runner creates one:

`new Map()`

and forwards that same cache through observations within the surface.

A separate surface invocation receives a separate cache.

The cache is used only for pinned block observations.

The key includes:

- block
- unordered lowercase token pair
- fee tier

This permits ENTRY/EXIT pair reuse where direction is reversed while
remaining isolated by pinned block and fee tier.

---

## Cache Safety Invariants

The following behavior is intentional and covered by tests:

1. All V3 fee tiers remain enabled:
   `[100, 500, 3000, 10000]`.

2. Successful factory resolutions are cacheable.

3. Successful zero-address / `NO_POOL` resolutions are cacheable.

4. Factory RPC failures are NEVER cached.

5. Every amount-dependent V3 Quoter call still executes.

6. A cache hit reports:
   - `poolLookupCacheHit: true`
   - `poolLookupDurationMs: 0`

7. An actual factory lookup reports:
   - `poolLookupCacheHit: false`
   - its measured lookup duration

8. Cache entries are isolated by pinned block.

9. Reverse token direction can reuse the structural pool resolution because
   the cache key uses an unordered token pair.

10. Supplying no cache retains the previous non-cache behavior.

11. ENTRY → V4 → EXIT ordering is unchanged.

12. No economic, gas, freshness, retry, timeout, slippage, or qualification
    policy was weakened.

---

## Important Observer Wiring

`observeThreeLegEconomics` accepts:

`v3PoolCache = null`

The ENTRY and EXIT outer-observer calls each forward the supplied cache as:

    poolCache: v3PoolCache

There is only one such property on each call.

A previous visual reading of terminal diff output incorrectly suggested a
duplicate forwarding property. A guarded cleanup command found no such
duplicate and made no change.

Subsequent direct source inspection confirmed the implementation already
contained the correct single property on each leg.

Do not attempt that cleanup again unless the actual source changes.

---

## Tests Added / Locked Behavior

Tests cover, among other cases:

- deterministic V3 per-tier timings
- deterministic V4 quote duration
- invalid timing dependency before RPC
- invalid successful timing rejects without RPC-failure reclassification
- successful pinned-block pool resolution reuse
- reverse-pair cache reuse
- block isolation
- factory RPC failure not cached
- successful zero-address / `NO_POOL` result cached
- economics observer forwards the same supplied cache to both outer legs
- surface runner uses one cache within a surface
- separate surface invocations receive separate caches

---

## Validation

Focused instrumentation/cache gate:

`39/39` passing

Canonical Node suite:

`434/434` passing

Canonical Hardhat suite:

`29/29` passing

Canonical total:

`463/463` passing

Canonical validation used:

- Node `v18.20.8`
- npm `v10.8.2`

Canonical Hardhat command remains:

`npm run test:hardhat`

Do not substitute bare:

`npx hardhat test`

unless the project validation procedure is deliberately changed.

`git diff --check` passed before commit.

No prohibited paths were modified.

Generated Hardhat `artifacts/` and `cache/` churn was absent at closeout.

---

## Post-Cache Provider-Only Benchmark

Provider:

Alchemy Polygon

Pinned block:

`94858727`

Amount:

`0.118 WPOL`

Repeats:

5

One shared surface-scoped cache was used across the repeated observations.

Repeat 1 — cold cache:

- status: `QUOTE_OK`
- total: 2452 ms
- V3 pool lookup: 1167 ms
- V3 quote: 1128 ms
- V4: 146 ms
- measured: 2441 ms
- unaccounted: 11 ms
- cache hits: 0
- cache misses: 8
- V3 quote calls: 8
- cache size: 8

Repeat 2:

- status: `QUOTE_OK`
- total: 1227 ms
- V3 pool lookup: 0 ms
- V3 quote: 1071 ms
- V4: 151 ms
- measured: 1222 ms
- unaccounted: 5 ms
- cache hits: 8
- cache misses: 0
- V3 quote calls: 8
- cache size: 8

Repeat 3:

- status: `QUOTE_OK`
- total: 1373 ms
- V3 pool lookup: 0 ms
- V3 quote: 1243 ms
- V4: 126 ms
- measured: 1369 ms
- unaccounted: 4 ms
- cache hits: 8
- cache misses: 0
- V3 quote calls: 8
- cache size: 8

Repeat 4:

- status: `QUOTE_OK`
- total: 1275 ms
- V3 pool lookup: 0 ms
- V3 quote: 1130 ms
- V4: 143 ms
- measured: 1273 ms
- unaccounted: 2 ms
- cache hits: 8
- cache misses: 0
- V3 quote calls: 8
- cache size: 8

Repeat 5:

- status: `QUOTE_OK`
- total: 1207 ms
- V3 pool lookup: 0 ms
- V3 quote: 1073 ms
- V4: 132 ms
- measured: 1205 ms
- unaccounted: 2 ms
- cache hits: 8
- cache misses: 0
- V3 quote calls: 8
- cache size: 8

Warm mean:

- total: 1270.5 ms
- V3 pool lookup: 0 ms
- V3 quote: 1129.25 ms
- V4: 138 ms
- unaccounted: 3.25 ms

Cold-to-warm reduction:

approximately `48.2%`

Pre-cache five-run mean:

`2441.8 ms`

Post-cache warm mean:

`1270.5 ms`

Reduction relative to pre-cache mean:

approximately `48.0%`

The reduction closely matches the V3 factory lookup component measured
before optimization.

All eight amount-dependent V3 Quoter calls still execute on warm
observations.

---

## 1R.4 Conclusion

The first optimization was successful and behaved as predicted by the
instrumentation.

Repeated structural V3 factory lookups were removed within a pinned
surface.

The remaining dominant measured latency is now the required
amount-dependent V3 Quoter work.

The evidence does NOT by itself justify:

- removing fee tiers
- adding concurrency
- weakening retries/timeouts
- changing providers as an economic-policy shortcut
- increasing freshness age
- changing `gasUnits`
- weakening minimum-profit policy
- weakening slippage policy
- changing execution semantics

Any further optimization must be separately measured, justified, tested,
and kept within the established safety boundaries.

---

## Strict Project Boundaries

Unless a future explicitly reviewed task changes scope:

DO NOT modify:

- `ProfitBot.sol`
- `ThreeLegExecution`
- production execution helpers
- frontend / MetaMask integration
- deployment addresses
- `.env`

DO NOT:

- send live-network transactions
- weaken minimum-profit policy
- weaken slippage policy
- weaken gas policy
- weaken freshness policy
- increase `maxAgeBlocks` merely to hide latency
- remove fee tiers merely to improve timing
- introduce concurrency without separate evidence and ordering/safety review

Polygon live research remains READ/CALL only unless explicitly reviewed
otherwise.

---

## Files in Durable 1R.4 Commit

The durable 1R.4 commit changed exactly seven files:

1. `APOLLO_CHECKPOINT.md`
2. `scripts/research/runPolygonV4AmountSurface.js`
3. `scripts/utils/polygonV4EconomicsObserver.js`
4. `scripts/utils/polygonV4OuterQuoteObserver.js`
5. `test/polygonV4AmountSurfaceRunner.test.js`
6. `test/polygonV4EconomicsObserver.test.js`
7. `test/polygonV4OuterQuoteObserver.test.js`

Commit:

`0e15cf39c3c3b6b9cd31b5de1f487dc8bfddfa41`

Remote verification after push confirmed:

`LOCAL_REMOTE_MATCH=YES`

---

## Security / Dependency Notice

During the GitHub push, GitHub reported dependency vulnerability alerts on
the repository's default branch.

The push output reported:

- 228 total vulnerabilities
- 12 critical
- 99 high
- 79 moderate
- 38 low

This notice was not investigated as part of 1R.4.

Do not mix broad dependency upgrades into the completed 1R.4 optimization.

Treat dependency/security remediation as a separate scoped task with its
own compatibility review and validation.

---

## Codespaces Persistence Model

Persisted:

- repository files
- committed Git history
- pushed remote history

Potentially transient across Codespaces restarts:

- active Node version
- shell variables
- running terminal processes
- development servers
- unsaved shell state
- environment state
- chat context

An already-running separate HP observer environment must not be disturbed
by development-environment recovery.

Pushing this branch updates the remote repository only. It does not by
itself pull, rebuild, or restart the separate HP observer environment.

---

## Recovery Procedure

After any future context/session/Codespaces loss:

1. Open `/workspaces/profitbot_project`.
2. Read this file.
3. Run `git status --short`.
4. Run `git branch --show-current`.
5. Run `git log --oneline -5`.
6. Compare local HEAD with `origin/repair/simulation-safety`.
7. Check `node --version`.
8. Restore Node `18.20.8` if Codespaces has reverted to Node 24.
9. Check RPC-variable presence without printing secret values.
10. Do not rerun live benchmarks or alter implementation until the durable
    Git state has been reconstructed.

Expected durable 1R.4 commit:

`0e15cf39c3c3b6b9cd31b5de1f487dc8bfddfa41`

---

## Exact State at Creation of This Sibling Checkpoint

The completed 1R.4 implementation is committed and pushed.

Local and remote 1R.4 HEAD were verified identical.

The original `APOLLO_CHECKPOINT.md` remains present.

This sibling checkpoint is intentionally created afterward so it can serve
as the recovery handoff for the completed 1R.4 state.

Creating this file itself does not alter the already validated 1R.4
implementation.

Before committing this checkpoint, verify:

- only `APOLLO_CHECKPOINT_1R4.md` is newly modified/untracked
- `git diff --check` remains clean
- local/remote still point to the durable 1R.4 commit

Do not push this new checkpoint until its contents and Git scope have been
reviewed.
