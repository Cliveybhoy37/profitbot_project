# Apollo Checkpoint — 1S.19

## Status

1S.19 implementation is complete and fully validated locally.

Implementation commit:

`480e4ef802606ffe11a4e0299de66d4062f9844c`

Implementation parent / pre-1S.19 checkpoint:

`1ef7f564f6f5a99af7141583197ce67fe1ecf913`

Closed 1S.18 checkpoint:

`9ac21046ef533e890f08f5d28c1d2d8152c77046`

At implementation closure the worktree was clean.

The 1S.19 checkpoint itself had not yet been committed or pushed.

No live transaction, signer, broadcast, or live flashloan occurred.

## Objective

1S.19 preserves the exact successful protected qualification execution
context required by the later final controlled-fork simulation boundary.

The milestone deliberately does not perform final simulation.

The milestone deliberately does not add execution authorization,
signer, wallet, transaction-send, or broadcast capability.

## Implementation

Production:

`scripts/utils/polygonV4QualifiedExecutionContext.js`

Test:

`test/polygonV4QualifiedExecutionContext.test.js`

Implementation scope:

- 2 new files;
- 618 insertions;
- no existing production file modified.

## Architecture Decision

1S.10 was not modified.

The existing `qualifyExecutionPolicyPlan()` contract remains intact.

1S.19 introduces a sibling composition:

`qualifyAndPreserveExecutionContext()`

This avoids silently changing the established 1S.10 return contract while
allowing the exact objects used at the execution-plan qualification seam
to be retained for the later final-simulation boundary.

## Successful Qualification Envelope

The sibling composition performs the protected composition using the
existing production dependencies:

- `selectProtectedPeakHandoff`;
- `buildObservedV4Candidate`;
- `buildV4ExecutionLegs`;
- `encodeV4ExecutionPlan`;
- `qualifyGasEvidenceProtectedPeakHandoff`.

When and only when evidence-bound qualification returns:

`qualified === true`

the result preserves:

- exact `qualificationResult`;
- exact locally constructed `candidate`;
- exact locally constructed `executionLegs`;
- exact encoded `executionPlan`;
- exact `deadline`;
- exact authoritative `policySnapshot` object;
- exact supplied `gasEvidence` object.

These values are preserved from the same composition that passed the
encoded execution plan and evidence into protected qualification.

They are not reconstructed after qualification.

## Failure Contract

1S.19 is fail closed.

A legitimate qualification rejection with:

`qualified === false`

is returned unchanged.

It is not promoted into a successful execution-context envelope.

Malformed qualification results are rejected.

The result must be an object whose `qualified` property is boolean.

Examples rejected as malformed include:

- `null`;
- `undefined`;
- a string result;
- an object without `qualified`;
- a non-boolean `qualified` value.

Exceptions thrown by evidence-bound qualification propagate unchanged.

Invalid injected dependencies are rejected before qualification.

## Exact Identity Boundary

Focused tests verify strict identity preservation for:

- provider forwarded into qualification;
- operational result forwarded into qualification;
- gas evidence forwarded into qualification;
- execution plan forwarded into qualification;
- authoritative policy snapshot forwarded into qualification;
- returned qualification result;
- returned candidate;
- returned execution legs;
- returned execution plan;
- returned policy snapshot;
- returned gas evidence.

The execution deadline is preserved exactly.

## Gas Evidence Boundary

1S.19 does not acquire execution gas evidence.

It preserves the exact supplied gas-evidence object that successfully
passed the existing evidence-bound qualification path.

`policyGasUnits = 700000` remains conservative qualification policy only.

It is not exact execution gas evidence.

Historical `652106` remains evidence only for its exact historical
controlled fork execution identity.

1S.19 does not import the historical execution-gas artifact and does not
substitute either value for current exact execution evidence.

## Provider and RPC Boundary

1S.19 does not:

- construct a provider;
- perform `getBlock`;
- perform `getGasPrice`;
- perform other RPC acquisition;
- perform `hardhat_reset`;
- acquire historical execution evidence.

The caller-supplied provider is only forwarded to the existing
evidence-bound qualification dependency.

## Execution Safety Boundary

1S.19 contains no:

- signer construction;
- wallet construction;
- private-key handling;
- `sendTransaction`;
- `initiateFlashloan` execution;
- transaction receipt wait;
- broadcast;
- live flashloan.

Passing 1S.19 tests does not authorize live execution.

## Protected Existing Boundaries

1S.19 did not modify:

- `ProfitBot.sol`;
- `ThreeLegExecution`;
- existing deployment addresses;
- `.env`;
- HP/Bugs observer state;
- existing 1S.10 production behavior.

## Validation Evidence

Focused 1S.19:

- 6 tests;
- 6 passed;
- 0 failed.

Affected execution-qualification chain:

- 31 tests;
- 31 passed;
- 0 failed.

Canonical Node suite:

- 556 tests;
- 556 passed;
- 0 failed.

Canonical Hardhat suite:

- 29 tests;
- 29 passed;
- 0 failed.

Canonical total:

- 585 tests;
- 585 passed;
- 0 failed.

Static production boundary:

- passed.

Final staged implementation scope:

- exactly 2 files.

Final implementation diff check:

- passed.

No unstaged tracked changes remained after Hardhat generated-file churn
was restored.

Hardhat emitted SPDX warnings from imported Uniswap interfaces; the
canonical Hardhat suite nevertheless compiled successfully and passed
29/29.

## Next Architecture Boundary

The next milestone is the final controlled-fork/execution-path
simulation integration boundary.

It must consume the exact successful execution context preserved by
1S.19.

It must not rebuild execution identity from scanner-era candidate data.

It must preserve and verify the exact qualified:

- candidate;
- route / execution legs;
- amount;
- execution plan;
- deadline;
- policy snapshot;
- gas evidence;
- freshness;
- protected profitability identity.

The final simulation result/evidence must remain semantically distinct
from qualification gas evidence.

## Existing Fork Machinery

`polygonV4ForkReceiptGasEvidenceProducer.js` is relevant lower-level
controlled-fork machinery.

Its current semantic responsibility is exact fork-receipt gas-evidence
production.

Do not automatically repurpose it as final-simulation evidence without
a separate design review.

The older `polygonFlashloanSimulation` path is not the successor for the
current protected V4 lineage because it reconstructs execution
legs/parameters from older scanner-era candidate/slippage inputs.

## Future Live Boundary

If qualifying live evidence is eventually observed:

1. preserve qualifying evidence;
2. independently requalify against current head/current gas;
3. verify candidate freshness;
4. run final controlled fork/execution-path simulation;
5. verify protected slippage;
6. verify Aave premium;
7. verify gas economics;
8. verify minimum protected net profit;
9. preserve final simulation evidence;
10. conduct a separate execution-authorization review;
11. only after explicit review consider signer/broadcast capability.

Signer/broadcast remains separately prohibited at the current boundary.

## Recovery

After session loss, first run:

`git status --short`

`git --no-pager log -5 --oneline`

`git rev-parse HEAD`

Then read:

`APOLLO_CHECKPOINT_1S19.md`

If this checkpoint has not yet been committed, also inspect:

`APOLLO_CHECKPOINT_PRE_1S19.md`

Never place private keys, seed phrases, passwords, API secrets, or other
credentials in checkpoint files or chat.
