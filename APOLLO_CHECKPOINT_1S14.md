# APOLLO CHECKPOINT — 1S.14

## Milestone

1S.14 — Qualification Execution Context Composition

## Repository State

Branch: `repair/simulation-safety`

Implementation commit:
`78cd6e2dea2adaa06b539331e747d5ddf1f65b1f`

Implementation subject:
`Compose qualification context with execution policy plan`

Implementation parent / 1S.13 checkpoint:
`b8343fd3d6d8c8d937650937cce033ce1aabd7fc`

## Objective

Compose the authoritative qualification execution context from 1S.11 with execution-policy plan qualification from 1S.10 without recreating qualification evidence or introducing live execution authority.

1S.14 is additive composition only.

It does not integrate this path into the historical live qualifier, candidate-set runner, protected-peak operational runner, signer, or transaction broadcast path.

## Production Surface

Added:
`scripts/utils/polygonV4QualificationExecutionComposition.js`

Export:
`qualifyWithExecutionContext`

The composition:

1. validates both injected composition dependencies before acquisition;
2. calls `acquireQualificationExecutionContext()` exactly once;
3. requires a returned qualification execution context object;
4. requires that context to contain an authoritative `policySnapshot`;
5. requires a positive safe-integer context `deadline`;
6. forwards the exact `context.policySnapshot` into `qualifyExecutionPolicyPlan()`;
7. forwards the exact `context.deadline` into `qualifyExecutionPolicyPlan()`;
8. passes remaining qualification inputs through unchanged;
9. returns execution-policy plan qualification result unchanged;
10. propagates acquisition and qualification failures unchanged.

## Core Identity Invariant

`acquireQualificationExecutionContext()` is invoked exactly once.

`context.policySnapshot` is the exact authoritative policy snapshot supplied to `qualifyExecutionPolicyPlan()`.

`context.deadline` is the exact deadline supplied to `qualifyExecutionPolicyPlan()`.

The composition layer does not independently reacquire policy or independently derive a deadline.

## Preserved Inputs

Passed through without recreation:

- provider
- operationalResult
- startToken
- entryToken
- exitToken
- slippageBps
- maxSlippageBps
- maxAgeBlocks
- gasEvidence
- safetyReserveWei
- minimumNetProfitWei

`deadlineSeconds` belongs to qualification execution context acquisition and is not an alternative execution-plan deadline.

## Validation Ownership

1S.14 performs context-integrity validation at its composition boundary:

- context exists and is an object;
- `context.policySnapshot` exists and is an object;
- `context.deadline` is a positive safe integer.

It does not duplicate detailed policy-snapshot validation.

1S.11 remains responsible for canonical qualification execution context acquisition and exact policy-block deadline derivation.

Downstream qualification retains canonical policy, gas-evidence, protected-route, freshness, slippage, reserve, and minimum-profit validation.

## Test Evidence

Focused 1S.14:
`7 / 7 PASS`

Affected composition suite:
`56 / 56 PASS`

Canonical Node:
`525 / 525 PASS`

Canonical Hardhat:
`29 / 29 PASS`

Canonical Node + Hardhat:
`554 / 554 PASS`

Hardhat-generated tracked artifact/cache churn was classified and restored.

Final implementation boundary contained exactly:

- `scripts/utils/polygonV4QualificationExecutionComposition.js`
- `test/polygonV4QualificationExecutionComposition.test.js`

Static execution boundary: `PASS`

Static ownership boundary: `PASS`

## Safety Boundary

During 1S.14 closure:

- RPC called: no
- fork rerun: no
- signer used: no
- transaction created: no
- transaction broadcast: no
- HP/Bugs touched: no
- historical live qualification changed: no
- live candidate set changed: no
- protected-peak operational runner changed: no

1S.14 does not authorize a live flashloan.

Passing tests does not authorize transaction creation, signing, or broadcast.

## Predecessor Chain

1S.8 produced controlled exact fork-receipt gas evidence.

Preserved exact evidence:

- source block: `94709817`
- measured gas: `652106`
- execution-plan hash: `0xf3dddb908db797d2732935ea25dfb48215c98ef85587ac012c2ba1093b94e009`
- executor code hash: `0x347dca910e2d4b7dd6b4ba19151fc2cd28e33c268cbb38511169a0b4a753facc`

Measured `652106` remains distinct from conservative policy estimate `700000`.

1S.9 bound exact gas evidence to protected-peak qualification.

1S.10 bound qualified evidence to an exact execution-policy plan with explicit controlled deadline.

1S.11 acquired one authoritative qualification policy snapshot and derived the deadline from the exact policy block timestamp.

1S.12 allowed the authoritative policy snapshot to be injected into 1S.9 without reacquisition.

1S.13 forwarded the exact supplied policy snapshot through 1S.10.

1S.14 composes 1S.11 and 1S.10 so one authoritative context supplies both exact policy snapshot and exact deadline to execution-policy plan qualification.

## Remaining Boundary

The next unresolved boundary is operational integration.

Do not mechanically replace existing live call sites.

Before integration:

1. reconstruct the intended operational owner and call graph;
2. identify where completed protected operational evidence is consumed;
3. preserve exact protected evidence rather than recreating quotes;
4. preserve the single authoritative qualification context;
5. preserve exact gas-evidence identity;
6. preserve qualification-time policy and deadline identity;
7. preserve minimum-profit, slippage, freshness, reserve, and worst-case economic policy;
8. keep signer, transaction construction, and broadcast as a separate authorization boundary.

No live signer or transaction path is authorized by 1S.14.

## Recovery

After session/context loss:

`cd /workspaces/profitbot_project`

`git status --short`

`git log --oneline -8`

`git rev-parse HEAD`

`cat APOLLO_CHECKPOINT_1S14.md`

Use repository state, Git history, tests, and checkpoints as authority.

Never put private keys, seed phrases, passwords, RPC credentials, API secrets, or other credentials into checkpoints or chat.
