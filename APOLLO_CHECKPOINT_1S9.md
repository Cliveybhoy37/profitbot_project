# Apollo Progressive Checkpoint — 1S.9

Date: 2026-10-03

Branch: `repair/simulation-safety`

Implementation HEAD: `4ff01d3e80e2dbf8cecdbfcfec0fde9441731720`

Implementation subject: `Bind fork receipt gas evidence to protected qualification`

Parent / previous checkpoint commit: `cc579ca800042e61e1c7cfb4e451dae5fc476fc1`

Previous checkpoint: `APOLLO_CHECKPOINT_1S8.md`

No secrets belong in this checkpoint.

---

## Purpose

This is the progressive recovery checkpoint continuing the durable Apollo checkpoint chain through milestone 1S.9.

It does not replace the earlier checkpoints. Recovery must use the durable checkpoint/history chain beginning 23 September, then verify that history against current git, source, and tests.

Do not infer current architecture from old README prose or isolated historical research notes when current source/tests disagree.

---

## Durable 1S Progression

### 1S.3 — Protected Peak Handoff

Introduced exact selection and handoff of preserved protected operational evidence without requoting or reconstructing the selected observation.

### 1S.4 — Protected Peak Qualification

Composed preserved handoff evidence through observed candidate, protected execution legs, and existing qualification/preflight. Gas remained an explicit qualification input.

### 1S.5 — Qualification Policy Snapshot

Added qualification-time current-block, gas-price, and Aave-premium policy acquisition. The existing 700000 gas-unit value remained a conservative policy estimate, not measured execution gas.

### 1S.6 — Provider-Backed Protected Qualification

Composed provider-backed policy acquisition with protected qualification. Exact execution-gas provenance remained unresolved.

### 1S.7 — Exact Protected Execution Gas Evidence Binding

Added strict gas-evidence validation bound to the exact protected execution identity. Accepted provenance is deliberately constrained to FORK_RECEIPT.

### 1S.8 — Controlled Exact Execution-Gas Evidence Producer

Implementation: `0ef0b3d09748f6e6dcdeae960da8c3f09397ab16`

Checkpoint: `cc579ca800042e61e1c7cfb4e451dae5fc476fc1`

Added controlled historical fork receipt evidence production and deployed executor-context binding. No live Polygon execution was involved.

### 1S.9 — Exact Fork-Receipt Gas Evidence Qualification Binding

Implementation: `4ff01d3e80e2dbf8cecdbfcfec0fde9441731720`

1S.9 safely joins validated exact fork-receipt gas evidence to the existing protected qualification path without adding another measurement path or moving into live execution.

---

## 1S.8 Exact Historical Gas Evidence

Historical Polygon fork source-state block: `94709817`

Measured receipt gas units: `652106`

Execution plan hash: `0xf3dddb908db797d2732935ea25dfb48215c98ef85587ac012c2ba1093b94e009`

Executor runtime code hash: `0x347dca910e2d4b7dd6b4ba19151fc2cd28e33c268cbb38511169a0b4a753facc`

Measurement provenance: `FORK_RECEIPT`

The 652106 value came from the actual successful local Hardhat historical-fork transaction receipt. The observation/measurement block is the historical Polygon source-state block, not the later local Hardhat block height after deployment and execution transactions.

Do not rerun the 1S.8 integration merely to regenerate already-established evidence unless a future source change invalidates it.

---

## Exact Gas Evidence Versus Conservative Policy Gas

This distinction is critical.

Exact historical measured evidence: `652106` gas units.

Existing conservative policy gas input elsewhere: `700000` gas units.

The measured 652106 gas units are exact evidence for the specific historical execution identity validated by 1S.7 and produced by 1S.8.

The 700000 value remains a conservative qualification policy assumption in existing paths. It is not the current measured receipt gas.

1S.9 does NOT globally replace 700000 with 652106.

The 1S.9 production file contains neither hardcoded gas value. It validates supplied FORK_RECEIPT evidence and passes `validatedGasEvidence.gasUnits` into the existing qualification path as `estimatedGas`.

Any future change to the general 700000 policy is a separate policy decision requiring separately scoped evidence and review.

---

## 1S.9 Architecture

The production composition is:

protected operational evidence
-> `selectProtectedPeakHandoff`
-> `buildObservedV4Candidate`
-> `buildV4ExecutionLegs`
-> `validateForkReceiptGasEvidence`
-> `acquireQualificationPolicySnapshot`
-> `qualifyProtectedPeakHandoff`

The gas value supplied to qualification is `validatedGasEvidence.gasUnits`.

The exact encoded execution plan is supplied to the 1S.9 wrapper and validated against the evidence. The wrapper does not invent a deadline or minimum profit and does not rebuild an execution plan.

A caller-supplied estimatedGas value cannot override validated exact evidence gas.

Invalid exact gas evidence fails closed before policy acquisition and before qualification.

1S.9 is additive and backward-compatible. Existing qualification APIs using an explicit conservative estimatedGas remain unchanged.

---

## 1S.9 Validation Evidence

Final focused 1S.9 suite: `6/6 PASS`

1S composition regression: `54/54 PASS`

Canonical Node suite: `501/501 PASS`

Canonical Hardhat suite: `29/29 PASS`

Canonical regression total: `530/530 PASS`

Static boundaries also passed for signer/transaction use, production hardcoded gas, new hardcoded addresses, required composition tokens, staged file scope, and diff integrity.

Generated tracked Hardhat artifacts/cache were restored after canonical validation.

An unscoped bare Hardhat test previously reached unrelated test/Lock.js and its unavailable toolbox helper. That was command-scope overreach, not a 1S.9 regression. Do not install unrelated dependencies or modify Lock.js as part of 1S.9.

---

## Safety and Architectural Boundaries

Do not modify ProfitBot.sol or ThreeLegExecution as part of this completed milestone.

Do not modify production execution helpers, frontend/MetaMask integration, deployment addresses, or .env casually.

Do not weaken minimum-profit, slippage, gas, freshness, Aave-premium, or worst-case profitability protections.

Do not increase freshness limits merely to hide provider latency.

Do not remove fee tiers merely for speed.

Do not introduce concurrency without separate evidence and safety/order review.

Do not convert historical measured gas into a universal live gas assumption.

Qualification evidence is not authorization to broadcast.

No live Polygon transaction, live signer, MetaMask signing, or broadcast occurred during 1S.9.

---

## Provider and HP/Bugs Boundaries

The separate Codespaces provider-secret persistence issue remains parked. Do not weaken secret handling or add credentials to source/checkpoints merely to solve it. Resume it only when a future task actually requires it.

The independent HP/Bugs environment remains separate from this Codespaces development branch. Do not modify or interrupt HP/Bugs as part of 1S work.

---

## Established Closure Sequence

Preserve this milestone closure order:

focused milestone tests -> canonical Node suite -> canonical scoped Hardhat suite -> milestone-specific integration/fork evidence where applicable -> static/worktree boundaries -> implementation commit -> checkpoint commit -> push -> fetch/remote verification.

Do not add integration/fork work when a milestone does not introduce or change a measurement/execution path.

1S.9 consumes already-validated 1S.8 evidence and therefore does not require another 1S.8 fork measurement.

---

## Recovery Instructions

If chat/session context is lost:

1. Read the durable checkpoint chain from 23 September through this file.
2. Read APOLLO_CHECKPOINT_1S8.md and this APOLLO_CHECKPOINT_1S9.md.
3. Run git status -sb.
4. Run git --no-pager log --oneline -20.
5. Verify current HEAD and remote state.
6. Inspect current source/tests before trusting older prose.
7. Reconstruct the next milestone from durable repository evidence rather than guessing from chat context.
8. Never paste or record secrets during recovery.

Committed project files and git history persist. Terminal processes, unsaved editor buffers, dev servers, runtime environment state, chat context, and an open Codespace are not guaranteed to persist.

---

## Current Stopping Point

1S.8 is fully and durably closed and provides controlled exact historical FORK_RECEIPT gas evidence.

1S.9 implementation is complete and locally committed as `4ff01d3e80e2dbf8cecdbfcfec0fde9441731720`.

1S.9 binds validated exact fork-receipt gas units into the existing protected qualification path without globally replacing the conservative 700000 policy value.

The next durability operation is: checkpoint audit -> checkpoint commit -> push implementation plus checkpoint -> fetch remote branch -> verify remote HEAD and boundaries.

Only after remote durable closure should the next architectural milestone be selected.

Do not guess the next milestone from partial chat context. Reconstruct it from the checkpoint chain, current git history, current source, and current tests.
