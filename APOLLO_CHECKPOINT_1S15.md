# Apollo Checkpoint — 1S.15

## Milestone

1S.15 — Protected Peak Operational Qualification Composition

## Repository State

- Branch: repair/simulation-safety
- Parent checkpoint: 873316079cec3952dee5af5ab85a3002220ca86e
- Implementation: 84b96a3579730edb1eb60716635c5fcfe2eb855a
- Subject: Compose protected peak operations with execution qualification

## Objective

Compose existing provider-backed protected-peak operational cadence with
the existing 1S.14 qualification execution-context composition.

1S.15 is additive orchestration only. It does not authorize live execution.

## Files

- Production: scripts/utils/polygonV4ProtectedPeakQualificationOperationalComposition.js
- Test: test/polygonV4ProtectedPeakQualificationOperationalComposition.test.js

## Architecture

provider -> runProtectedPeakProviderTimedCadence() -> operationalResult
same provider + exact operationalResult -> qualifyWithExecutionContext()

## Core Invariants

1. Timed operational cadence runs exactly once.
2. Qualification receives the exact same provider object.
3. Qualification receives the exact operationalResult object.
4. Gas evidence is forwarded unchanged.
5. Cadence policy inputs are forwarded unchanged.
6. Omitted amounts remain omitted.
7. Qualification policy inputs are forwarded unchanged.
8. Invalid injected dependencies fail before cadence.
9. Cadence failure propagates unchanged and qualification does not run.
10. Missing or non-object operational result fails before qualification.
11. Operational-result validation here is structural only.
12. Qualification result is returned unchanged.

## Explicit Non-Ownership

1S.15 does not construct a provider, recreate quote evidence, acquire
qualification policy, derive the execution deadline, independently encode
an execution plan, own economic policy, alter gas-evidence production,
alter protected-peak selection, or alter cadence internals.

It does not modify the historical live qualifier, candidate set, existing
operational runner, ProfitBot.sol, or ThreeLegExecution.

It creates no signer, transaction, or broadcast authority.

## Preserved Layering

- Operational evidence remains owned by the protected-peak cadence stack.
- Policy/deadline acquisition remains owned by the 1S.11/1S.14 path.
- Execution-plan qualification remains owned by the 1S.10 path.
- Exact gas-evidence validation remains owned by the 1S.7-1S.9 path.

## RED / GREEN Evidence

- Authoritative initial RED: 4 expected MODULE_NOT_FOUND failures.
- Minimal GREEN: focused 4/4; ownership regression 15/15.
- Integrity RED: original 4/4 green; new integrity tests 0/2 as intended.
- Integrity GREEN: focused 6/6; ownership regression 15/15.

## Closure Validation

- Focused 1S.15: 6/6 PASS
- Affected composition: 44/44 PASS
- Canonical Node: 531/531 PASS
- Canonical Hardhat: 29/29 PASS
- Canonical Node + Hardhat total: 560/560 PASS

Hardhat-generated artifacts/cache churn was classified and restored.

## Boundaries

Execution boundary: PASS.
Ownership boundary: PASS.
Final change boundary: PASS.
Final staged boundary: PASS.

Confirmed unchanged owners include ProfitBot.sol, live qualification,
candidate set, existing protected-peak operational/timed-cadence runners,
qualification execution composition/context, and execution-plan qualification.

## Safety Record

- RPC called: no
- Controlled fork rerun: no
- Signer used: no
- Transaction created: no
- Broadcast: no
- HP/Bugs touched: no

The existing 1S.8 controlled-fork gas evidence was not regenerated or
reinterpreted by 1S.15.

## Live Execution Boundary

Passing 1S.15 does not authorize a live flashloan.

Before any live-capable send, separately verify chain identity, deployed
contracts, exact route/amount identity, current economics/policy, exact
execution-plan binding, gas evidence, deadline/freshness, balances and
allowances, simulation/preflight, signer identity, and transaction params.

Signer and broadcast remain separate go/no-go decisions.

## Next Step

Commit this checkpoint as a separate commit, then push normally, fetch,
and verify exact local/remote HEAD equality and ahead/behind 0/0.

Never force push for this closure.
