# Apollo Recovery Checkpoint — 1S.3

## Purpose

This checkpoint records the durable repository state immediately after
completion of 1S.3:

**Protected Peak -> Execution Qualification Handoff**

1S.3 closes the architectural seam between the protected-peak
operational/stability pipeline and the existing hardened candidate,
execution-leg, and preflight qualification pipeline.

This file sits beside the previous Apollo checkpoints and is intended
to preserve the chronological development and recovery sequence.

---

## Authoritative Repository State

Repository:

`/workspaces/profitbot_project`

Branch:

`repair/simulation-safety`

1S.3 implementation commit:

`e1fc5f36b8eed73516d5b2fd2917ebb83d6b4d7e`

Subject:

`Add protected peak execution qualification handoff`

At checkpoint creation, local HEAD and
`origin/repair/simulation-safety` both point to that exact commit.

Previous recovery boundary:

`4e3f3ad5e29013de02ffab7fa6ededf417cb5584`

Subject:

`Add 1R.4 recovery checkpoint`

1R.4 implementation:

`0e15cf39c3c3b6b9cd31b5de1f487dc8bfddfa41`

Subject:

`Optimize 1R.4 pinned V3 pool observations`

---

## Toolchain

Validated toolchain:

- Node: `v18.20.8`
- npm: `10.8.2`
- `.nvmrc`: `18.20.8`

Canonical validation commands:

- `npm run test:node`
- `npm run test:hardhat`

Do not substitute bare `npx hardhat test` for the canonical Hardhat
gate.

---
## 1S Objective and Development Sequence

The numbered research and qualification sequence progressively moved
from economic observation toward a fail-closed execution qualification
boundary.

Relevant progression:

```text
protected amount surfaces
  -> fine / micro amount refinement
  -> protected peak
  -> multi-snapshot stability
  -> block separation / advancement
  -> gated stability
  -> provider-backed observation
  -> cadence / timed cadence
  -> 1Q operational runner
  -> 1R timing / observation performance
  -> 1S protected evidence -> execution qualification handoff
```

The goal is not merely to advance milestone letters.

The goal is a fail-closed pipeline in which an apparent opportunity
must survive protected economics, amount optimization, independent
blockchain-state observations, stability requirements, block provenance,
provider-backed observation, controlled cadence, performance constraints,
and execution qualification protections.

Live transaction broadcast remains a separate explicit boundary.

---

## 1S.1 — Architecture Audit

1S.1 was a read-only architecture and repository audit.

It established that two mature branches existed.

Newer operational branch:

```text
amount surface
  -> fine / micro refinement
  -> protected peak
  -> snapshots / stability
  -> block separation / advancement
  -> gated stability
  -> provider-backed observation
  -> cadence / timed cadence
  -> 1Q operational runner
  -> 1R timing / optimization
```

Earlier execution-qualification branch:

```text
live observation
  -> buildObservedV4Candidate()
  -> buildV4ExecutionLegs()
  -> preflightObservedV4Candidate()
  -> protected execution-plan boundary
```

The missing architectural seam was:

**protected operational peak evidence -> existing execution qualification machinery**

1S.1 made no code changes and performed no provider RPC, signer use,
transaction, or HP/Bugs modification.

---

## 1S.2 — Exact Handoff Schema Audit

1S.2 inspected the exact data required at the handoff seam.

`buildObservedV4Candidate()` requires one concrete `QUOTE_OK`
observation containing execution-ready metadata.

Required preserved evidence includes:

- positive block provenance;
- observed start amount;
- ENTRY observation;
- V4 observation;
- EXIT observation;
- V4 `zeroForOne` direction;
- valid V4 PoolKey;
- observed amount outputs;
- outer venue metadata;
- V3 fee and pool metadata where applicable.

The existing qualification bridge is:

```text
observation
  -> buildObservedV4Candidate()
  -> buildV4ExecutionLegs()
  -> preflightObservedV4Candidate()
```

Existing preflight remains the owner of hardened execution qualification.

Its responsibilities include:

- candidate and execution structure validation;
- token matching and continuity;
- observation freshness;
- requested amount binding;
- slippage policy;
- exact protected `minAmountOut` floors;
- Aave premium accounting;
- gas-cost accounting;
- safety reserve;
- expected net profit;
- protected and worst-case net profit;
- configured minimum net profit.

1S must not duplicate, bypass, or weaken those protections.

The protected stability pipeline retains preserved `bestProtected`
evidence for each snapshot, and the operational cadence layer preserves
those results through its cycle structure.

The governing 1S conclusion is:

**1S validates and selects preserved evidence; it does not recreate evidence.**

That rule became the basis of 1S.3.

---

## 1S.3 — Protected Peak Handoff

New utility:

`scripts/utils/polygonV4ProtectedPeakHandoff.js`

Export:

`selectProtectedPeakHandoff()`

The selector accepts the protected operational result and fails closed
unless the newest operational cycle contains acceptable preserved
stability evidence.

### Exact Selection Policy

The selector requires:

- operational result `complete === true`;
- at least one operational cycle;
- selection of the latest operational cycle;
- no fallback to an older cycle;
- latest acquisition `complete === true`;
- nonempty stability snapshots;
- summary snapshot count matching stored snapshots;
- every snapshot containing a protected peak;
- every protected peak classified `INTERIOR`;
- no lower-boundary protected peaks;
- no upper-boundary protected peaks;
- exactly one stable protected amount across snapshots;
- every selected row having `status === "QUOTE_OK"`;
- every `bestProtected.startAmount` matching the stable amount;
- positive safe-integer snapshot block tags;
- strictly increasing stability snapshot block tags;
- every `bestProtected.blockTag` exactly matching its snapshot block.

After validation, the selector chooses the newest stability snapshot.

It returns the operational cycle identity, stable protected amount,
selected snapshot metadata, and the exact selected `bestProtected`
observation object.

### Evidence Preservation Invariant

The selected observation is the exact preserved object from the
protected stability result.

1S.3 does not:

- re-quote;
- reconstruct ENTRY, V4, or EXIT evidence;
- invent venue metadata;
- invent fee tiers;
- alter observed outputs;
- alter block provenance;
- alter economic policy;
- fall back to older executable evidence when newest evidence fails.

The governing invariant remains:

**validate and select evidence; never recreate it.**

---

## 1S.3 Focused Validation

Focused 1S.3 validation:

**15 / 15 PASS**

Coverage includes:

- newest preserved observation selection;
- incomplete acquisition rejection;
- missing protected peak rejection;
- boundary peak rejection;
- unstable protected amount rejection;
- summary/evidence amount mismatch rejection;
- non-`QUOTE_OK` selected evidence rejection;
- observation/snapshot block mismatch rejection;
- non-increasing stability block rejection;
- malformed operational structure rejection;
- missing observation block provenance rejection;
- no fallback to an earlier valid cycle;
- newest qualifying cycle/newest evidence selection.

---

## Local Composition Proof

Composition validation:

**2 / 2 PASS**

The positive composition test proves this exact path:

```text
1Q operational protected result
  -> selectProtectedPeakHandoff()
  -> exact preserved protected observation
  -> buildObservedV4Candidate()
  -> buildV4ExecutionLegs()
  -> preflightObservedV4Candidate()
  -> existing protected qualification boundary
```

The test asserts strict object identity between the selected handoff
observation and the preserved `bestProtected` observation.

This proves the handoff does not reconstruct quote evidence.

The composition proof also preserves block provenance, start amount,
V3 fee metadata, V4 PoolKey metadata, protected execution floors,
Aave premium accounting, protected final output, and the existing
worst-case minimum-profit requirement.

The negative composition test leaves older executable evidence intact
but degrades the newest evidence to `RPC_FAILURE`.

The selector rejects the result rather than falling back to the older
executable observation.

---

## Canonical Regression Evidence

Final canonical validation on the exact 1S.3 implementation tree:

- Node: **449 / 449 PASS**
- Hardhat: **29 / 29 PASS**
- Total: **478 / 478 PASS**
- Focused 1S.3: **15 / 15 PASS**
- Local composition: **2 / 2 PASS**
- `git diff --check`: clean
- source/unit/composition syntax checks: pass
- prohibited path check: no match

Canonical commands remain:

- `npm run test:node`
- `npm run test:hardhat`

Hardhat-generated `artifacts/` and `cache/` churn was restored before
the final implementation boundary check.

### Exact 1S.3 Implementation Boundary

Implementation commit:

`e1fc5f36b8eed73516d5b2fd2917ebb83d6b4d7e`

Subject:

`Add protected peak execution qualification handoff`

Exactly three files were added:

1. `scripts/utils/polygonV4ProtectedPeakHandoff.js`
2. `test/polygonV4ProtectedPeakHandoff.test.js`
3. `test/polygonV4ProtectedPeakHandoffComposition.test.js`

Commit statistics:

- 3 files changed;
- 1099 insertions;
- no unrelated implementation files included.

The implementation commit was pushed and independently verified.

At the 1S.3 implementation boundary:

```text
local HEAD  = e1fc5f36b8eed73516d5b2fd2917ebb83d6b4d7e
remote HEAD = e1fc5f36b8eed73516d5b2fd2917ebb83d6b4d7e
```

No tests need to be rerun merely because this recovery checkpoint is
documentation-only.

---

## Safety and Economic Boundaries Preserved

1S.3 did not modify:

- `ProfitBot.sol`;
- `ThreeLegExecution`;
- `PolygonV4CandidateExecutor.sol`;
- production execution helpers;
- deployment addresses;
- frontend or MetaMask integration;
- provider cadence logic;
- protected economics policy;
- gas-unit policy;
- slippage policy;
- minimum-profit policy;
- freshness policy;
- V3 fee-tier coverage;
- retry or timeout policy.

1S.3 performed no provider RPC, signer use, transaction, broadcast,
live execution, or HP/Bugs modification.

Continue to preserve these project invariants:

- pinned-block quote consistency;
- all required V3 fee tiers;
- amount-dependent V3 Quoter calls;
- ENTRY -> V4 -> EXIT dependency and ordering;
- Aave premium accounting;
- protected gas economics;
- safety reserve;
- minimum net profit;
- worst-case profitability;
- snapshot and block freshness;
- block separation and advancement;
- slippage protection;
- provider-backed observation;
- fail-closed handling of RPC uncertainty.

Do not increase freshness windows merely to hide latency.

Do not remove fee tiers merely for speed.

Do not introduce quote concurrency without separate evidence and an
ordering and safety review.

Do not treat gross-positive economics as execution readiness.

---

## Retained 1R.4 Performance Context

1R.4 optimized only structural V3 pool discovery.

It introduced a surface-scoped pinned-block V3 pool cache.

It did not cache amount-dependent V3 Quoter results.

Measured provider-only benchmark evidence:

- cold total: approximately `2452 ms`;
- warm mean total: approximately `1270.5 ms`;
- cold-to-warm reduction: approximately `48.2%`;
- warm V3 pool lookup duration: `0`;
- all eight amount-dependent V3 quote calls remained.

The remaining dominant measured observation latency is required V3
Quoter work.

That evidence does not by itself justify concurrency, fee-tier removal,
retry changes, provider-policy changes, or economic-policy changes.

---

## Provider State and Codespaces Boundary

Provider persistence investigation is intentionally parked.

Known durable conclusions:

- `ProfitBot-Codespace-ReadOnly` Infura credentials were previously
  verified by one approved read-only Polygon RPC;
- that RPC returned Polygon chain ID `137`;
- no signer or transaction was used;
- the secret value was never printed;
- the GitHub user-level Codespaces secret exists with selected-repository
  visibility;
- the current Codespace previously failed to inject `INFURA_POLYGON`
  despite that configuration;
- `ALCHEMY_POLYGON` remained available.

Do not introduce `.env`, shell-startup, or relaxed-security workarounds
merely to solve temporary Codespaces secret injection.

Do not resume the Codespaces secret-injection investigation unless it
is actually required or explicitly requested.

Do not perform another RPC merely to reconfirm the Infura credential.

Never store provider credentials in checkpoints or chat.

---

## HP / Bugs Isolation Boundary

The HP/Bugs watcher environment is operationally separate from this
Codespace and must remain untouched during normal 1S development.

Known independent environment:

- Windows laptop -> WSL;
- user: `prep`;
- repository: `/home/prep/profitbot_project`;
- service: `profitbot-bugs.service`.

Do not stop, restart, reconfigure, deploy into, or otherwise modify
that environment as part of 1S work unless separately required and
explicitly authorized.

Never place HP/Codespace credentials in repository files or checkpoints.

---

## Dependency Vulnerability Notice

GitHub reported on the repository default branch:

- 228 vulnerabilities total;
- 12 critical;
- 99 high;
- 79 moderate;
- 38 low.

This remains a separate future workstream.

Do not mix broad dependency upgrades into 1S qualification work without
a dedicated scope and regression plan.

---

## What 1S.3 Proves

1S.3 proves that stable protected operational evidence can be selected
fail-closed and passed unchanged into the existing hardened execution
qualification machinery.

It proves the architectural handoff.

It does not prove:

- a currently profitable live Polygon opportunity;
- current live qualification;
- current gas affordability;
- freshness at transaction time;
- live execution readiness;
- transaction safety under current market state;
- broadcast readiness.

Those remain later explicit boundaries.

---

## Next Boundary — 1S.4

Do not jump directly from 1S.3 to live execution.

The recommended next boundary is:

**1S.4 — Operational Handoff Integration / Qualification Audit**

Initial 1S.4 work should be local/read-only architecture inspection.

Resolve these questions before any provider-backed qualification run:

1. Which layer should invoke `selectProtectedPeakHandoff()`?
2. Which policy values come from preserved evidence versus explicit
   qualification configuration?
3. How should `currentBlock` be acquired at final preflight?
4. How is freshness rechecked after stability acquisition?
5. How is gas evidence bound to the exact route, amount, and block?
6. How should qualification failure be represented with no execution
   side effect?
7. Can the composed path remain provider-only with no signer or tx?
8. Which existing qualification helper remains the single owner of
   economic policy?

Do not implement provider-backed work until this composition boundary
is understood.

---

## Recovery Procedure

After chat, terminal, or Codespace context loss:

```bash
cd /workspaces/profitbot_project
export GIT_PAGER=cat
export PAGER=cat
cat APOLLO_CHECKPOINT_1S3.md
git status --short
git branch --show-current
git log --oneline -8
git rev-parse HEAD
git rev-parse origin/repair/simulation-safety
node --version
npm --version
```

Expected 1S.3 implementation commit:

`e1fc5f36b8eed73516d5b2fd2917ebb83d6b4d7e`

Expected subject:

`Add protected peak execution qualification handoff`

Expected implementation validation:

- Node: `449 / 449`;
- Hardhat: `29 / 29`;
- total: `478 / 478`;
- focused 1S.3: `15 / 15`;
- composition: `2 / 2`.

If Node is not `v18.20.8`, restore it with `nvm use 18.20.8`.

Reconstruct durable repository state before relying on transient shell
or chat state.

---

## Persistence Reminder

Persisted state includes repository files, git commits, pushed remote
history, and committed checkpoints.

Do not assume persistence of shell variables, running processes, dev
servers, temporary files, Codespaces runtime state, injected environment
variables, unsaved editor buffers, or chat context.

Before stepping away from substantial future work: save files, inspect
git status, run relevant validation, commit completed work, push when
appropriate, and update the durable checkpoint.

Never store private keys, seed phrases, passwords, API keys, provider
secrets, or other credentials in checkpoints or chat.

---

## End of 1S.3 Recovery Checkpoint

Implementation boundary: `e1fc5f36b8eed73516d5b2fd2917ebb83d6b4d7e`

Next intended boundary: **1S.4 architecture/integration audit first.**
