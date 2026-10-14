# APOLLO CHECKPOINT — Post-1S.16 / Pre-1S.17

## Recovery Point

Branch:
repair/simulation-safety

Closed remote HEAD:
ced7fe67bc88219f972e9ab91ecac3d157f5b401

1S.16 implementation:
00ea0e5364cbeff9f6298cf00c64e1c6a19bb326
Persist immutable historical execution gas evidence

1S.16 checkpoint:
ced7fe67bc88219f972e9ab91ecac3d157f5b401
Add 1S.16 recovery checkpoint

At 1S.16 closure:
- local HEAD == remote HEAD
- ahead/behind = 0/0
- worktree clean
- normal push only; no force push

## Validation at 1S.16 Closure

Focused 1S.16:
9/9 PASS

Affected composition:
66/66 PASS

Canonical Node:
540/540 PASS

Canonical Hardhat:
29/29 PASS

Canonical total:
569/569 PASS

## 1S.16 Result

Added:
scripts/utils/polygonV4HistoricalExecutionGasEvidence.js

Added tests:
test/polygonV4HistoricalExecutionGasEvidence.test.js

Purpose:
Persist the already-established 1S.8 controlled historical
FORK_RECEIPT execution-gas evidence as immutable,
production-readable evidence.

The artifact does NOT acquire or regenerate evidence.

Loading it performs no:
- provider/RPC acquisition
- fork reset
- signer acquisition
- transaction
- flashloan
- broadcast

Existing fork-receipt validation remains authoritative.

The historical wrapper additionally binds the exact canonical
executor identity.

## Historical Execution-Gas Identity

observationBlock:
94709817

measurementBlock:
94709817

provenance:
FORK_RECEIPT

gasUnits:
652106

loan amount:
125000000000000000

execution deadline:
1790770167

minimum profit:
5000000000000000

execution plan hash:
0xf3dddb908db797d2732935ea25dfb48215c98ef85587ac012c2ba1093b94e009

executor code hash:
0x347dca910e2d4b7dd6b4ba19151fc2cd28e33c268cbb38511169a0b4a753facc

Important:
652106 is measured historical FORK_RECEIPT gas evidence.

700000 remains the separate conservative policy gas estimate.

Do NOT reinterpret 652106 as the global runtime gas policy.
Do NOT put 700000 into the immutable historical evidence artifact.

## Historical Deadline Reconstruction

Source Polygon block:
94709817

Source timestamp:
1790769866

Controlled local Hardhat deployment block:
94709818

Post-deployment timestamp:
1790769867

Historical execution deadline:
1790770167

The local block 94709818 was used only to reconstruct the
historical execution-plan deadline.

Do NOT change observationBlock or measurementBlock from 94709817.

The reconstructed plan produced the exact authoritative hash:
0xf3dddb908db797d2732935ea25dfb48215c98ef85587ac012c2ba1093b94e009

No flashloan was executed during this reconstruction.

## Architecture Continuity

The current system remains one protected lineage.

1A-1E:
protected amount-search surfaces, narrowing and protected-peak stability

1F-1K.1:
snapshot acquisition, orchestration, block separation/advancement,
gating, stability and provider-forwarding correctness

1L-1Q:
provider observation, provider binding, cadence, timed cadence
and operational runner

1R:
timing instrumentation, provider-only measurement and safe
pinned-block V3 pool caching

1S:
takes the protected evidence produced by the earlier lineage
toward execution qualification.

Critical invariant:

1S VALIDATES AND SELECTS EXISTING PROTECTED EVIDENCE.
1S MUST NOT RECREATE THAT EVIDENCE.

New 1S work must remain traceable backward through the protected
1A -> 1R evidence lineage.

Do not create an alternate quote/provider/economic path.

Do not silently route back through superseded older live
qualification/candidate-set surfaces.

## Current Protected Composition

High-level lineage:

1A-1E
  ->
1F-1K
  ->
1L-1Q
  ->
1R
  ->
protected operational evidence
  ->
1S.15 operational qualification composition
  ->
1S.14 qualification/execution-context composition
  ->
authoritative policy snapshot + deadline
  ->
execution-policy qualification
  ->
validated execution gas evidence
  ->
encoded protected execution plan

1S.16 now provides the immutable historical gas-evidence artifact
needed by the qualification side without regenerating it.

## Next Milestone — 1S.17

DO NOT START BY WRITING CODE.

First perform an architecture audit against the COMPLETE
1A -> 1S.16 lineage.

Determine the smallest correct next integration/configuration
boundary.

The audit must verify that any proposed 1S.17 layer:

1. consumes protected upstream evidence rather than recreating it;
2. preserves exact candidate/route/leg/plan identity;
3. preserves authoritative policy-snapshot binding;
4. keeps historical measured gas evidence distinct from runtime policy;
5. introduces no second provider path;
6. introduces no alternate quote/economic acquisition path;
7. does not route through superseded old live qualifier/candidate-set logic;
8. does not weaken freshness, slippage, minimum-profit,
   worst-case-profit or gas protections;
9. does not introduce signer/wallet/broadcast behavior;
10. remains additive and narrowly scoped.

Likely area to investigate:
production runtime policy/config ownership and how immutable
validated historical gas evidence is supplied to the protected
qualification composition.

This is an audit target, NOT yet an approved implementation design.

## 1S.17 Closure Discipline

Once architecture is proven:

focused milestone tests
  ->
full affected composition suite
  ->
canonical Node suite
  ->
canonical Hardhat suite
  ->
milestone-specific integration/fork evidence if applicable
  ->
static/worktree boundaries
  ->
implementation commit
  ->
checkpoint commit
  ->
push
  ->
fetch
  ->
local/remote equality verification

Passing tests alone never authorizes live execution.

## Hard Safety Boundaries

Do not modify ProfitBot.sol.

Do not modify ThreeLegExecution unless separately scoped.

Do not modify production execution helpers merely to force integration.

Do not modify frontend/MetaMask.

Do not modify deployment addresses.

Do not casually modify .env.

Do not weaken:
- minimum profit
- slippage protection
- gas policy
- freshness
- worst-case economics

Do not increase maxAgeBlocks merely to hide latency.

Do not remove fee tiers merely for speed.

Do not introduce concurrency without separate safety/order evidence.

No live Polygon transaction.

No live signer.

No broadcast.

No live flashloan unless separately and explicitly authorized.

HP/Bugs observer/scanner must remain untouched.

## Canonical Test Commands

Node:
npm run test:node

Hardhat:
npm run test:hardhat

Do NOT substitute bare:
node --test test/*.test.js

Do NOT substitute bare:
npx hardhat test

The package scripts define the canonical suites.

Hardhat may regenerate tracked artifacts/ and cache/ churn.
Inspect it first, then restore generated churn only.

## Codespace / Node Recovery

The Codespace may stop while unattended.

Persisted repository files and git history survive.

Terminal processes, shell state, dev servers and unsaved transient
state must NOT be assumed to survive.

Required Node version:
v18.20.8

Expected npm:
10.8.2

.nvmrc:
18.20.8

On return run:

cd /workspaces/profitbot_project
nvm use
node --version
npm --version
git status --short
git rev-parse HEAD
git fetch origin
git rev-parse origin/repair/simulation-safety
git rev-list --left-right --count origin/repair/simulation-safety...HEAD

Expected closed baseline before any new work:

Node:
v18.20.8

HEAD:
ced7fe67bc88219f972e9ab91ecac3d157f5b401

Remote:
ced7fe67bc88219f972e9ab91ecac3d157f5b401

Ahead/behind:
0 0

## Security

Never put private keys, seed phrases, passwords, API secrets,
RPC credentials or other credentials in checkpoints or chat.

Codespace read-only RPC secret name may exist in environment,
but its VALUE must never be printed.

HP/Bugs infrastructure and its credentials are separate and
must remain untouched.

## Resume Instruction

When returning, read this file plus:
APOLLO_CHECKPOINT_1S16.md

Then verify Node/Git/local/remote state.

If the baseline matches, begin the 1S.17 architecture audit.

Do NOT jump directly to implementation.

Do NOT authorize signer/broadcast/live flashloan from this checkpoint.
