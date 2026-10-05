# Apollo Checkpoint — 1S.27 Current-State Execution Preflight Evidence

Date: 2026-10-05

## Status

1S.27 implementation is complete and locally committed.

Milestone:

**1S.27 — Current-State Execution Preflight Evidence**

Implementation commit:

`0df15e0d4dfe680aab425df41f50513a930d25ba`

Implementation parent / prior durable 1S.26 checkpoint:

`a99f643ef4dd095a2bee6e32f68db2f8472f28e8`

No live Polygon transaction, live signer, transaction construction,
transaction broadcast, or live flashloan was authorized or performed.

## Files

Production:

`scripts/utils/polygonV4CurrentStateExecutionPreflightEvidence.js`

SHA-256:

`d900c2067529d071d6295e3fe0577739a58753b0ed5f91ea8f48617861d7b671`

Test:

`test/polygonV4CurrentStateExecutionPreflightEvidence.test.js`

SHA-256:

`4a995d51106b85d39b8e3c0d94d815cd04818a69c8544099ebd9da6100d7f1ad`

## Purpose

1S.27 consumes successful 1S.26 execution-readiness evidence together
with explicitly injected current-state evidence and fails closed unless
the preserved execution identity remains consistent with that evidence.

It does not discover candidates, acquire quotes, construct execution
legs, reconstruct an execution plan, invent economic policy, measure
gas, control a fork, acquire a signer, construct a transaction, send a
transaction, wait for a transaction, or broadcast.

The governing 1S rule remains:

**1S validates and selects preserved evidence; it does not recreate
evidence.**

## Required Upstream Readiness

The supplied 1S.26 readiness evidence must have:

- `executionEvidenceReady === true`
- `liveExecutionAuthorized === false`
- `signerAuthorized === false`
- `broadcastAuthorized === false`

1S.27 rejects any upstream live, signer, or broadcast authorization.

## Preserved Execution Identity

1S.27 preserves and validates the existing prepared/qualified identity.

The following remain identity-bound:

- execution plan
- candidate
- execution legs
- route amount
- gas evidence
- qualification policy snapshot
- qualified context
- prepared deadline

No replacement execution plan, candidate, execution-leg set, gas
evidence object, or policy snapshot is created.

## Chain Evidence

Current-state chain evidence must identify Polygon:

`chainId === 137`

1S.27 does not acquire the chain ID itself.

## Deployment Evidence

Injected deployment evidence must contain:

- a valid nonzero EVM executor address
- a valid bytes32 executor runtime code hash

The injected executor code hash must equal the executor code hash already
preserved by measured gas evidence at:

`readinessEvidence.gasEvidence.executorContext.executorCodeHash`

The comparison is case-insensitive hexadecimal equality.

1S.27 does not acquire provider code, resolve deployment addresses, or
invent an executor-address binding that does not exist in the upstream
gas-evidence contract.

Address acquisition and verification remain upstream responsibilities.

## Route and Amount Evidence

Injected route/amount evidence must preserve exact identity with the
prepared and qualified contexts:

- exact execution plan
- exact candidate object
- exact execution-legs object
- exact `candidate.amountIn` object

This prevents an independently reconstructed route or amount from being
promoted to current-state readiness.

## Economics Evidence

Injected economics evidence must preserve exact identity with:

- measured gas evidence
- authoritative qualification policy snapshot

The conservative policy gas value is not reinterpreted as measured
execution gas.

No minimum-profit, slippage, premium, gas, reserve, freshness, or
worst-case profitability policy is weakened or redefined by 1S.27.

## Freshness Evidence

Injected freshness evidence must preserve the exact prepared deadline.

Both the current timestamp and deadline must be finite, and:

`currentTimestamp < deadline`

An expired deadline fails closed.

1S.27 does not acquire the current timestamp itself.

## Balance and Allowance Evidence

Injected balance/allowance evidence must state:

- `checked === true`
- `sufficient === true`

1S.27 validates this evidence but does not perform provider reads,
approvals, allowance changes, token transfers, or wallet operations.

## Authoritative Preflight Semantics

The existing qualification pipeline remains authoritative for hardened
execution preflight.

1S.27 requires:

- `qualifiedContext.qualificationResult` to exist
- `qualificationResult.qualified === true`
- `qualificationResult.stage === "QUALIFIED"`
- `qualificationResult.preflight` to exist
- injected `currentStateEvidence.preflightEvidence` to be the exact same
  object as `qualificationResult.preflight`

1S.27 does not introduce a synthetic `preflight.passed` authority.

It does not reconstruct preflight candidate, execution-leg, or
execution-plan fields.

This preserves the existing ownership of freshness, amount consistency,
slippage protection, flashloan premium, gas cost, reserve, and
worst-case minimum-profit qualification.

## Successful Result

A successful 1S.27 result is frozen and reports:

- `currentStatePreflightReady: true`
- `liveExecutionAuthorized: false`
- `signerAuthorized: false`
- `broadcastAuthorized: false`

It also preserves exact references to the readiness evidence,
current-state evidence, candidate, execution legs, execution plan, gas
evidence, qualification policy snapshot, and qualified context.

`currentStatePreflightReady` is structural/current-state evidence
readiness only.

It is not permission to execute.

## Explicit Non-Ownership

1S.27 owns none of the following:

- provider or RPC acquisition
- candidate discovery
- candidate selection
- quote acquisition
- route construction
- execution-leg construction
- execution-plan construction or reconstruction
- economic-policy invention
- gas measurement
- controlled-fork lifecycle
- signer acquisition
- wallet/private-key handling
- transaction construction
- transaction submission
- transaction waiting
- broadcast
- live flashloan execution

## Test Contract

The final focused 1S.27 test suite contains 22 tests.

It covers:

- exact 1S.26/current-state identity preservation
- readiness without execution authorization
- rejection of non-ready upstream evidence
- rejection of upstream authorization
- Polygon chain requirement
- executor deployment identity evidence
- malformed and zero executor addresses
- malformed and divergent executor code hashes
- execution-plan identity
- gas-evidence identity
- qualification-policy identity
- deadline freshness
- balance/allowance sufficiency
- exact authoritative qualified-preflight identity
- `QUALIFIED` stage requirement
- candidate identity
- execution-leg identity
- route-amount identity
- deadline identity
- static signer/transaction/broadcast/fork/RPC non-ownership

## Validation Ledger

Final focused tests:

**22 / 22 PASS**

Final affected regression:

**50 / 50 PASS**

Canonical Node suite:

**620 / 620 PASS**

Canonical Hardhat suite:

**29 / 29 PASS**

Hardhat-generated tracked `artifacts/` and `cache/` churn was classified
as generated output and restored after validation.

The source and test hashes remained unchanged after validation and
generated-churn restoration.

## Controlled-Fork Decision

1S.27 adds no RPC acquisition, fork control, signer behavior, transaction
execution, or simulation implementation.

Existing 1S.24 controlled-fork integration already establishes the
downstream exact-plan lifecycle across measured gas, qualification, and
final controlled-fork simulation.

1S.27 only validates and preserves post-lifecycle readiness plus
explicitly injected current-state evidence.

Therefore a new controlled-fork run is not required for this milestone.

This decision is specific to 1S.27 and is not a blanket rule for future
milestones.

## Semantic Audit

A final read-only semantic audit was performed after all tests and after
Hardhat-generated churn was restored.

It checked:

- final source
- final test contract
- adjacent 1S.21 through 1S.26 source contracts
- current checkpoint inventory
- both checkpoint/history families
- September 23 through current lineage
- historical preflight ownership
- forbidden execution ownership
- required 1S.27 semantic markers
- final source/test hash immutability
- worktree integrity

Mechanical audit:

**PASS**

Semantic review found no remaining defect requiring an implementation
change before commit.

## Runtime

Validated runtime:

- Node `v18.20.8`
- branch `repair/simulation-safety`

Project `.nvmrc` remains the durable Node-version authority.

## Git State at Implementation Closure

Implementation commit:

`0df15e0d4dfe680aab425df41f50513a930d25ba`

Parent:

`a99f643ef4dd095a2bee6e32f68db2f8472f28e8`

Implementation commit contains exactly:

- `scripts/utils/polygonV4CurrentStateExecutionPreflightEvidence.js`
- `test/polygonV4CurrentStateExecutionPreflightEvidence.test.js`

The implementation commit was verified with a clean worktree.

At the time this checkpoint was prepared, the remote branch remained at
the prior 1S.26 checkpoint.

No force push is authorized.

## Live Execution Boundary

Passing 1S.27 does not authorize a live flashloan.

It does not authorize:

- signer acquisition
- wallet/private-key use
- transaction construction
- transaction submission
- transaction broadcast

Before any future live-capable send, separately verify all required
current execution conditions, including signer/account identity and exact
transaction parameters.

Signer and broadcast remain separately authorized boundaries.

## Recovery

After any session or Codespace interruption:

1. `cd /workspaces/profitbot_project`
2. inspect `.nvmrc`
3. restore/select the project Node runtime
4. verify branch `repair/simulation-safety`
5. inspect `git status`
6. inspect recent `git log --oneline`
7. read this checkpoint
8. read the 1S.26 and relevant 1S.21-1S.25 checkpoints
9. inspect both checkpoint families and Git history where needed
10. verify the production/test SHA-256 values above
11. reconstruct state from repository/Git evidence rather than assumed
    chat memory

Never place private keys, seed phrases, passwords, or API secrets in a
checkpoint or chat.

## Next Step

After this checkpoint is verified and committed, close 1S.27 remotely
only through exact lineage verification:

- verify the remote is still the expected 1S.26 checkpoint
- push the exact implementation + checkpoint lineage without force
- fetch again
- verify local HEAD equals remote HEAD
- verify divergence is `0 0`
- verify the worktree is clean

After remote closure, select the next milestone only through a fresh
read-only architecture and safety audit.

Do not infer that the next milestone is signer acquisition, transaction
construction, or live broadcast.

Do not convert current-state preflight readiness into execution
authorization.
