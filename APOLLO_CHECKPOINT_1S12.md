# APOLLO CHECKPOINT — 1S.12

## Status

Milestone 1S.12 — Authoritative Policy Snapshot Injection.

Implementation is complete and locally committed.

Implementation commit:
`09a3abf0135af6b1a1e13a94dc487e5f2168ef71`

Implementation subject:
`Allow authoritative qualification policy snapshot`

Implementation parent / 1S.11 checkpoint:
`955699da9a36c6843c250d5267a6f75e36346f50`

At checkpoint creation time the implementation has not yet been pushed.
Remote closure must be verified separately.

## Objective

Remove the remaining policy-ownership ambiguity at the 1S.9 gas-evidence qualification boundary.

1S.9 can now consume an already-authoritative qualification policy snapshot without independently reacquiring policy state.

The compatibility path remains intact: when no policy snapshot is supplied, 1S.9 acquires the canonical qualification policy snapshot exactly as before.

## Core invariant

When an authoritative policy snapshot is supplied:

`supplied policySnapshot === exact snapshot passed into protected qualification`

and independent policy reacquisition is zero.

When no policy snapshot is supplied:

`acquireQualificationPolicySnapshot({ provider })`

remains the default ownership path.

## Implementation

Modified:
`scripts/utils/polygonV4GasEvidenceProtectedPeakQualification.js`

The 1S.9 API gained optional `policySnapshot = null`.

Policy selection uses an explicit null branch: a null snapshot acquires canonical policy; a non-null snapshot is preserved unchanged.

Protected qualification receives that selected snapshot with exact supplied-object identity.

The existing validation of `acquirePolicySnapshotFn` remains in place even when a policy snapshot is supplied. 1S.12 did not alter established dependency-validation semantics.

An explicit malformed non-null snapshot is not silently replaced by newly acquired policy. Canonical downstream protected qualification remains responsible for validating it.

## Tests added

Modified:
`test/polygonV4GasEvidenceProtectedPeakQualification.test.js`

Two focused tests were added:

1. `uses supplied authoritative policy snapshot without reacquisition`
   - proves acquisition is not called
   - proves strict snapshot object identity

2. `preserves acquisition path when no policy snapshot is supplied`
   - proves acquisition is called exactly once
   - proves the acquired snapshot is forwarded unchanged

## RED / GREEN evidence

Authoritative RED was established only after correcting the test harness.

- 8 tests discovered
- 7 passed
- 1 expected failure
- exact failure: `policy reacquisition must not occur`
- production remained unchanged during authoritative RED
- `EXPECTED_REACQUISITION_FAILURE=PASS`
- `HARNESS_FAILURE_GUARD=PASS`

Minimal GREEN:

- focused: 8/8 PASS
- supplied snapshot path performs no reacquisition
- default acquisition path remains preserved
- explicit-null branch static check: PASS
- authoritative binding static check: PASS

## Validation

Established closure sequence:

focused milestone tests → affected composition → canonical Node → canonical Hardhat → generated-state cleanup → static/worktree boundaries → implementation closure.

Results:

- focused: 8/8 PASS
- affected composition: 34/34 PASS
- canonical Node: 517/517 PASS
- canonical Hardhat: 29/29 PASS
- canonical total: 546/546 PASS
- static/worktree boundaries: PASS

Canonical Node authority is `npm run test:node`.

Canonical Hardhat authority is `npm run test:hardhat`.

Canonical Hardhat remains exactly the three files `test/ProfitBot.js`, `test/execution.js`, and `test/threeLegExecution.js`.

Bare `npx hardhat test` is not canonical because unrelated `test/Lock.js` requires missing toolbox support.

## Hardhat generated-state handling

The canonical Hardhat run generated tracked `artifacts/` and `cache/` churn.

The generated changes were inspected and were the only changes beyond the intended 1S.12 source/test files.

Only `artifacts` and `cache` were restored after the successful Hardhat run.

Hardhat was not rerun after cleanup because no source or test file changed during cleanup.

## Scope boundaries preserved

1S.12 did not modify:

- live Polygon V4 qualification
- live Polygon V4 candidate-set composition
- 1S.10 execution-policy-plan qualification
- 1S.11 qualification execution context
- ProfitBot.sol
- ThreeLegExecution
- frontend or MetaMask integration
- deployment addresses
- .env

1S.12 performed no RPC work, no fork integration rerun, no signer creation, no transaction, no broadcast, and no MetaMask execution.

It did not weaken minimum-profit, slippage, gas, freshness, or other economic policy.

HP/Bugs was not touched.

## Gas evidence boundary

Historical controlled fork measurement remains `652106` gas at source block `94709817`.

Conservative policy gas remains `700000`.

`652106` is measured fork-receipt evidence; `700000` is conservative qualification policy. 1S.12 does not merge or replace these meanings.

## Relationship to 1S.9

Before 1S.12, 1S.9 always reacquired canonical qualification policy after exact gas-evidence validation.

That created a policy-drift seam if an authoritative context had already been acquired above 1S.9.

1S.12 makes ownership additive:

- supplied snapshot → use that exact snapshot
- no supplied snapshot → preserve canonical acquisition

Exact gas-evidence validation ordering remains intact.

## Relationship to 1S.10

1S.10 remains unchanged.

`qualifyExecutionPolicyPlan()` still does not accept or forward an authoritative policy snapshot or qualification context.

Therefore 1S.12 is not complete context composition.

It only makes the lower 1S.9 boundary capable of safely receiving the authoritative snapshot.

## Relationship to 1S.11

1S.11 remains unchanged.

1S.11 establishes a controlled qualification execution context containing the canonical policy snapshot and a deadline derived from the exact block represented by that snapshot.

Invariant:

`deadline source block === policySnapshot.currentBlock`

and:

`deadline = policyBlock.timestamp + deadlineSeconds`

1S.12 does not wire that context into 1S.10.

## Live qualification and candidate-set ownership

Live qualification remains unchanged.

The live candidate-set path remains unchanged and continues to construct one shared policy snapshot for its candidate qualifications.

Do not mechanically replace the existing live qualification path with 1S.10.

Doing so before context ownership is composed could silently change shared-snapshot semantics or allow competing policy snapshots.

## Remaining architectural seam

The next seam is above the now-capable 1S.9 boundary.

The likely next milestone is to let 1S.10 consume the authoritative qualification context or snapshot established by 1S.11, use the deadline derived from that same policy block, and forward the exact same policy snapshot into 1S.9.

Future invariant:

`context.policySnapshot === exact policy snapshot used by protected qualification`

and:

`execution-plan deadline source block === context.policySnapshot.currentBlock`

There must be no competing policy acquisition between context creation, execution-plan construction, gas-evidence qualification, and protected preflight.

This must be proven before changing live qualification or candidate-set composition.

## Recovery procedure after context loss

Reconstruct from durable state rather than assumed chat memory.

1. Read checkpoints and Git history from 23 September through current HEAD.
2. Verify branch `repair/simulation-safety`, local HEAD, remote HEAD, topology, and worktree.
3. Read 1S.12, 1S.11, 1S.10, and 1S.9 checkpoints.
4. Inspect the 1S.9 gas-evidence qualification, 1S.10 execution-plan qualification, 1S.11 context utility, live qualification, and live candidate-set composition.
5. Reconstruct exact policy/context ownership before editing.
6. Define the smallest next invariant and begin with focused RED tests.
7. Follow the established closure sequence before commit and push.

Pre-23-September material is not architectural authority unless current repository/checkpoints explicitly reference it for provenance.

## Explicit non-goals for the next recovery step

Do not immediately modify live qualification or candidate-set semantics.

Do not add signer, transaction, broadcast, or MetaMask logic.

Do not weaken economic or freshness policy.

Do not replace policy gas `700000` with measured gas `652106`.

Do not rerun closed fork integration without a source/evidence reason.

Do not touch HP/Bugs.

## Persistence boundary

Git commits, tracked files, and this checkpoint after commit are durable project state.

Terminal processes, dev servers, shell state, unsaved buffers, Codespaces runtime, and chat context are not guaranteed to persist.

GitHub Codespaces can stop independently of ChatGPT.

## Secrets

Never place private keys, seed phrases, passwords, API secrets, RPC credentials, or other credentials in this checkpoint or chat.
