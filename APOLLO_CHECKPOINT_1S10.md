# APOLLO CHECKPOINT — 1S.10

## Milestone

1S.10 — Exact Execution-Policy Plan Binding

## Implementation commit

`be83e7940e7a5e37f2e169ae0aed7f89aeb88f36`

Parent:

`806426bede4a885672a04a902638ed58aa459e4f`

Implementation commit subject:

`Bind exact execution policy plan to protected qualification`

## Objective

Resolve the execution-plan / exact gas-evidence / preflight ordering seam identified after 1S.9 without moving into live execution.

1S.10 constructs the exact protected execution plan before evidence-bound qualification and preserves one minimum-profit policy identity across the plan and preflight qualification.

## Added files

- `scripts/utils/polygonV4ExecutionPolicyPlanQualification.js`
- `test/polygonV4ExecutionPolicyPlanQualification.test.js`

No existing production file was modified.

## Composition

The new additive composition performs:

1. Select preserved protected-peak handoff evidence.
2. Build the observed V4 candidate from that preserved observation.
3. Build the protected three-leg execution route using the accepted slippage policy.
4. Encode the exact execution plan using:
   - the explicit caller-supplied deadline;
   - the protected execution legs;
   - `minimumProfit = minimumNetProfitWei`.
5. Delegate the exact encoded plan, exact gas evidence, and the same `minimumNetProfitWei` to the existing 1S.9 evidence-bound qualification composition.

The existing 1S.9 path independently reconstructs the candidate and protected execution legs and validates the supplied exact execution plan against FORK_RECEIPT evidence before policy acquisition.

## Core invariant

The policy identity is:

`executionPlan.minimumProfit === minimumNetProfitWei === successfulPreflight.minimumNetProfit`

Economic qualification continues to use:

`validatedGasEvidence.gasUnits * policySnapshot.gasPriceWei`

plus the existing flashloan premium, safety reserve, expected-profit, protected-profit, and worst-case profitability requirements.

1S.10 does not introduce a second or independently derived minimum-profit threshold.

## Deadline boundary

1S.10 requires an explicit controlled deadline.

It does not invent `current time + 300`, read provider time, or otherwise acquire a live deadline.

Deadline acquisition and live operational integration remain separate future boundaries.

## Exact gas evidence boundary

1S.10 does not measure gas and does not modify the 1S.8 producer.

The controlled historical 1S.8 FORK_RECEIPT measurement remains:

- Polygon historical source block: `94709817`
- measured receipt gas: `652106`
- provenance: controlled historical Hardhat Polygon fork receipt

`652106` is historical measured execution-gas evidence for that exact controlled execution identity. It is not a global gas policy constant.

The existing conservative policy value `700000` remains unchanged elsewhere and must not be represented as measured gas.

1S.10 does not globally replace `700000` with `652106`.

## Focused safety contract

The 1S.10 focused suite contains six tests covering:

1. Exact protected plan encoding before evidence-bound qualification.
2. Invalid deadline rejection before delegation.
3. Zero minimum-profit rejection before delegation.
4. Exact encoded-plan delegation with unchanged policy/evidence inputs.
5. Downstream evidence-bound qualification rejection propagation.
6. Real 1S.9 FORK_RECEIPT validator rejection when evidence is bound to a different execution plan.

The sixth test exercises the real 1S.9 plan-hash validation path rather than only an injected mock.

## Validation evidence

Focused 1S.10:

- 6/6 PASS

Directly affected composition regression:

- 41/41 PASS

Canonical Node suite:

- 507/507 PASS

Canonical Hardhat suite:

- 29/29 PASS

Canonical total:

- 536/536 PASS

Static boundaries:

- implementation operational boundary PASS
- no `700000` policy gas constant introduced PASS
- no hard-coded production address literal introduced PASS

The canonical Hardhat run regenerated tracked `artifacts/` and `cache/` outputs. Those generated test side effects were restored to HEAD afterward. The source/test implementation was not changed by that cleanup.

The 1S.8 fork integration was not rerun because 1S.10 does not alter gas measurement, fork configuration, executor behavior, or the receipt producer.

No RPC was used for 1S.10 validation.

## Non-goals preserved

1S.10 does not:

- perform live Polygon execution;
- use a signer or MetaMask;
- send or broadcast a transaction;
- modify `ProfitBot.sol`;
- modify `ThreeLegExecution`;
- modify `PolygonV4CandidateExecutor`;
- modify deployment addresses;
- modify `.env`;
- modify the 1S.8 gas-evidence producer;
- weaken slippage, freshness, gas, reserve, minimum-profit, or worst-case-profit policy;
- change fee tiers;
- introduce concurrency;
- modify HP/Bugs;
- globally replace the conservative `700000` policy gas value;
- integrate the new composition into `runPolygonV4LiveQualification.js` yet.

## Current durable progression

Relevant sequence:

- 1S.7 — exact protected execution gas-evidence binding
- 1S.8 — controlled exact FORK_RECEIPT gas-evidence producer
- 1S.9 — exact fork-receipt gas evidence qualification binding
- 1S.10 — exact execution-policy plan binding

1S.10 closes the intermediate plan/policy ordering seam identified after 1S.9.

## Next unresolved boundary

Do not assume that the next milestone is merely a mechanical call-site replacement.

Reconstruct the next step read-only from the Sept-23 through current checkpoint chain and current repository state.

The known remaining boundary is controlled deadline acquisition and operational integration of the 1S.10 composition with the existing provider-only live qualification path while preserving:

- exact protected evidence identity;
- exact execution-plan identity;
- minimum-profit policy identity;
- FORK_RECEIPT gas-evidence binding;
- current qualification-time policy acquisition;
- fail-closed behavior.

Before defining that milestone, inspect the actual current call graph and historical safety rationale.

No live signer, transaction, broadcast, MetaMask, HP/Bugs modification, policy weakening, or unnecessary 1S.8 integration rerun is authorized by this checkpoint.

## Recovery instructions

After context loss:

1. Read checkpoints from 23 September through this file.
2. Verify:
   - `git status`
   - `git log --oneline --decorate -n 20`
   - current branch
   - local/remote synchronization
3. Read the current 1S.10 implementation and tests.
4. Read the current 1S.9 composition and the provider-only live qualification call sites.
5. Reconstruct the unresolved boundary read-only before proposing implementation.
6. Do not infer live readiness from historical fork evidence.
7. Do not put private keys, seed phrases, passwords, API secrets, or credentials in checkpoints or chat.
