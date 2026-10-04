# Apollo Checkpoint — Pre-1S.19

## Status

1S.18 is fully closed locally and remotely.

Closed HEAD:

`9ac21046ef533e890f08f5d28c1d2d8152c77046`

1S.18 implementation:

`9604bba55065b81aed53d6bece73c67aeb7ceb78`

1S.18 checkpoint:

`9ac21046ef533e890f08f5d28c1d2d8152c77046`

Canonical 1S.18 validation baseline:

- Node: 550/550
- Hardhat: 29/29
- total: 579/579

No live transaction, signer, broadcast, or live flashloan occurred.

## Recovered Next Boundary

The post-1S.18 architecture audit identified the next required boundary as:

newly qualified protected runtime result
→ exact preserved qualification/execution context
→ later final controlled fork/execution-path simulation.

The final fork simulation is NOT part of 1S.19.

Signer/broadcast capability is NOT part of 1S.19.

## Identity-Loss Finding

`polygonV4ExecutionPolicyPlanQualification.js` currently constructs:

- protected handoff;
- observed candidate;
- exact protected execution legs;
- exact encoded execution plan.

It then delegates the exact plan plus policy/evidence inputs into
evidence-bound protected qualification.

The downstream successful protected qualification result retains candidate
and execution legs, but does not retain all identities required by the
future final-simulation boundary.

In particular, the current returned qualification path does not preserve
as a single execution-ready evidence envelope:

- exact encoded executionPlan;
- exact deadline;
- exact authoritative policySnapshot object;
- exact supplied gasEvidence object.

Those values must not be reconstructed after qualification.

## 1S.10 Compatibility Decision

Do not casually change the existing
`qualifyExecutionPolicyPlan()` return contract.

Existing tests establish that 1S.10:

- builds the exact execution plan before qualification;
- forwards exact gasEvidence identity;
- forwards exact policySnapshot identity;
- forwards exact encoded executionPlan;
- propagates evidence-bound qualification rejection unchanged.

Its only production caller is the 1S.14 qualification execution
composition.

1S.19 should therefore use a narrow sibling composition/binding seam
rather than silently changing established 1S.10 semantics.

## 1S.19 Objective

Preserve the exact successful qualification/execution context required
by the later final controlled-fork simulation.

The 1S.19 result must preserve the exact identities actually used for
qualification, including:

- qualificationResult;
- candidate;
- executionLegs;
- executionPlan;
- deadline;
- policySnapshot;
- gasEvidence.

No post-qualification rebuilding of candidate, execution legs, or
execution plan is allowed.

## Fail-Closed Requirement

An execution-context envelope must only be produced from a successful
qualification.

A result that is absent, malformed, or has `qualified !== true` must not
be promoted into the final-simulation boundary.

The exact failure contract should be fixed by focused tests before any
later fork integration.

## Gas Boundary

`policyGasUnits = 700000` remains conservative qualification policy only.

It must not become exact execution gas evidence.

Historical `652106` remains evidence for its exact historical controlled
fork execution only.

1S.19 must preserve the supplied exact gasEvidence identity and must not
replace it with either conservative policy gas or unrelated historical
evidence.

## Provider / Execution Boundary

1S.19 must not:

- construct a provider;
- perform RPC reads;
- reset or execute a fork;
- import immutable historical execution evidence as current evidence;
- introduce a signer or wallet;
- access private keys;
- send a transaction;
- broadcast;
- execute a live flashloan;
- modify ProfitBot.sol;
- modify ThreeLegExecution;
- modify deployment addresses;
- modify .env;
- modify HP/Bugs observer state.

The future final controlled-fork simulation is a separate milestone.

## Future Final-Simulation Boundary

After 1S.19, the next controlled-fork layer should consume the exact
preserved successful qualification envelope.

It must not rebuild execution identity from scanner-era candidate data.

The legacy `polygonFlashloanSimulation` path is not the architectural
successor for the current V4 protected lineage because it rebuilds
execution legs/params from older candidate/slippage inputs.

The existing controlled fork receipt producer is relevant lower-level
machinery, but its current responsibility is gas-evidence production.
Its reuse/generalization for final simulation requires a separate scope
review so qualification gas evidence and final simulation evidence are
not conflated.

## Live Execution Boundary

If qualifying live evidence is eventually observed:

1. preserve qualifying evidence;
2. independently requalify against current head/current gas;
3. verify freshness;
4. run final controlled fork/execution-path simulation;
5. verify protected slippage;
6. verify Aave premium;
7. verify gas economics;
8. verify minimum protected net profit;
9. preserve final simulation evidence;
10. conduct a separate execution-authorization review;
11. only then consider signer/broadcast capability.

Passing tests does not authorize live execution.

## Recovery

After session loss:

`git status --short`

`git --no-pager log -5 --oneline`

`git rev-parse HEAD`

Then read:

`APOLLO_CHECKPOINT_1S18.md`

and:

`APOLLO_CHECKPOINT_PRE_1S19.md`

Never place private keys, seed phrases, passwords, API secrets, or other
credentials in checkpoint files or chat.
