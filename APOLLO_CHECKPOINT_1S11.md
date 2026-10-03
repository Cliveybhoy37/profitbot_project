# Apollo Recovery Checkpoint — 1S.11 Qualification Context Binding

## Status

Milestone **1S.11 — Qualification Context Binding** is implementation-complete and locally validated.

Implementation commit:
`7db2fdb2f10139ce162a39b9719e06eafc9c1b13`

Implementation parent / closed 1S.10 checkpoint:
`d8dd4d7dca134821da143383f75d292c0ba349a0`

Branch: `repair/simulation-safety`

## Objective

1S.11 establishes a controlled provider/read-only qualification execution context that binds execution deadline acquisition to the exact block represented by the canonical qualification policy snapshot.

Core invariants:

- `deadline source block === policySnapshot.currentBlock`
- `deadline = policyBlock.timestamp + deadlineSeconds`

The deadline therefore cannot silently be derived from an unrelated latest block or independent provider-head observation.

## Implementation

Added:
`scripts/utils/polygonV4QualificationExecutionContext.js`

Export:
`acquireQualificationExecutionContext({...})`

The utility:

1. validates the caller-supplied positive safe-integer deadline duration;
2. acquires the existing canonical qualification policy snapshot;
3. validates `policySnapshot.currentBlock`;
4. reads exactly `provider.getBlock(policySnapshot.currentBlock)`;
5. fails closed if that exact block is unavailable;
6. validates the block timestamp and optional returned block number;
7. derives the deadline from that exact block timestamp;
8. rejects unsafe integer overflow;
9. returns the exact policy snapshot identity, policy-block timestamp, and deadline.

It performs no quoting, candidate construction, execution-leg construction, gas-evidence validation, preflight, signing, transaction sending, or broadcasting.

## Deadline policy boundary

1S.11 deliberately does not hardcode the older live probe operational `DEADLINE_SECONDS = 300` policy into the generic utility.

The utility binds a caller-supplied positive duration to the authoritative policy-block timestamp. Ownership or migration of the operational 300-second duration belongs to later integration.

## Validation

- focused 1S.11: **8 / 8 PASS**
- affected qualification composition: **32 / 32 PASS**
- canonical Node: **515 / 515 PASS**
- canonical Hardhat: **29 / 29 PASS**
- canonical repository total: **544 / 544 PASS**

The 32 composition tests are additional/subset evidence and are not added to the canonical total.

Canonical test authority remains `npm run test:node` followed by `npm run test:hardhat`.

Canonical Hardhat remains exactly the three repository-authorized files in the package script; do not substitute bare `npx hardhat test`.

## Hardhat generated-state handling

Canonical Hardhat generated expected tracked churn under `artifacts/` and `cache/`. No unexpected paths were observed.

Only those generated paths were restored. Hardhat was not rerun after cleanup because source/test content had not changed and rerunning would regenerate those outputs.

## Static boundaries verified

- no JsonRpcProvider construction;
- no wallet or signer;
- no transaction sending or broadcasting;
- no MetaMask integration;
- no RPC credential/environment access;
- no hardcoded deployment/token addresses;
- no `700000` gas-policy replacement;
- no `652106` measured-gas substitution;
- existing live qualification files unchanged;
- closed 1S.8, 1S.9, and 1S.10 production files unchanged;
- no RPC used during 1S.11;
- no fork integration run required.

## Preserved gas distinction

Historical controlled fork receipt evidence remains measured gas `652106`.
Conservative operational policy remains gas units `700000`.
1S.11 changes neither value nor meaning.

## Explicit non-goals

1S.11 does not modify ProfitBot.sol, ThreeLegExecution, the Polygon V4 candidate executor, frontend/MetaMask integration, deployment addresses, .env, fee-tier policy, concurrency, or HP/Bugs.

It performs no live Polygon transaction, signer use, or broadcast and does not weaken minimum-profit, slippage, freshness, gas, or worst-case policy.

It does not modify `runPolygonV4LiveQualification.js` or `runPolygonV4LiveCandidateSet.js`.

It does not integrate 1S.10 into the live path and does not make 1S.10 accept an externally supplied policy snapshot.

## Progression

- 1S.8: exact controlled fork receipt gas-evidence producer.
- 1S.9: exact validated gas evidence bound into protected qualification.
- 1S.10: exact execution-policy plan bound to protected qualification.
- 1S.11: canonical qualification policy block bound to deadline context.

Each milestone remains independently bounded.

## Remaining architectural seam

Do not assume the next step is a mechanical replacement of `qualifyLiveRoute()` with `qualifyExecutionPolicyPlan()`.

The reconstructed post-23-September live lineage has distinct ownership models:

1. `runPolygonV4LiveCandidateSet.js` acquires one shared policy snapshot anchored to the quote block and supplies it to candidates.
2. `runPolygonV4LiveQualification.js` accepts that externally supplied snapshot or independently acquires policy state, and historically derives deadline from the relevant block timestamp plus its operational deadline duration.
3. The newer protected qualification chain through 1S.9 and 1S.10 currently performs canonical policy acquisition internally.
4. 1S.11 proves safe canonical policy/deadline context acquisition but does not make 1S.10 consume that exact externally acquired context.

The remaining seam is therefore policy/context ownership across composition.

Before changing live qualification, reconstruct the current call graph and determine how one authoritative context can flow through candidate-set, protected qualification, and exact execution plan without policy reacquisition or drift.

Do not create competing policy snapshots and do not silently change shared candidate-set semantics.

## Next-step recovery instructions

After any chat/session/context loss:

1. Read checkpoints and Git history from 23 September 2026 through this checkpoint.
2. Verify branch, HEAD, remote synchronization, and clean worktree.
3. Inspect the current 1S.11 context utility and its tests.
4. Inspect the 1S.10 and 1S.9 qualification utilities.
5. Inspect `runPolygonV4LiveQualification.js` and `runPolygonV4LiveCandidateSet.js`.
6. Reconstruct exact ownership of policy snapshot, deadline, execution plan, gas evidence, and protected preflight.
7. Identify the smallest next composition seam.
8. Begin the next implementation milestone with focused RED evidence.

Remain provider/read-only unless later evidence explicitly requires otherwise. No RPC is required merely to reconstruct this seam.

Do not introduce signer, transaction, broadcast, MetaMask, HP/Bugs changes, policy weakening, or unnecessary reruns of closed milestones.

## Security and persistence

Never place private keys, seed phrases, passwords, API secrets, or RPC credentials in checkpoints or chat.

Persisted repository files and Git history survive independently of terminal processes, unsaved editor buffers, Codespaces runtime state, and chat context.

## 1S.11 local closure evidence

- implementation: `7db2fdb2f10139ce162a39b9719e06eafc9c1b13`
- parent: `d8dd4d7dca134821da143383f75d292c0ba349a0`
- focused: 8 PASS
- composition: 32 PASS
- Node: 515 PASS
- Hardhat: 29 PASS
- canonical total: 544 PASS
- RPC used: no
- fork integration rerun: no
- live integration changed: no

1S.11 is not remotely closed until this checkpoint is committed separately and both implementation and checkpoint commits are pushed and remote-verified.
