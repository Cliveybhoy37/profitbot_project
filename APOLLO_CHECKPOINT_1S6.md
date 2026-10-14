# APOLLO CHECKPOINT — 1S.6

## 1. Recovery purpose

This file is the durable recovery checkpoint for milestone 1S.6.
It records the verified repository state, architecture, safety boundaries, implementation evidence, regression evidence, and next-step constraints.

Do not place private keys, seed phrases, passwords, API secrets, RPC credentials, or other credentials in this checkpoint.

## 2. Repository state

- Repository: `/workspaces/profitbot_project`
- Branch: `repair/simulation-safety`
- 1S.6 implementation commit: `a95c87d83d2f8e74a756aeb9c6c051840d8cd0bb`
- 1S.6 implementation subject: `Add provider-backed protected peak qualification composition`
- Parent / 1S.5 checkpoint: `c2e2f731484849f5caed30d0922f48d0613d5e6b`
- Implementation was pushed and fetch-verified.
- Local and remote matched exactly at the implementation commit.
- Worktree was clean after push/fetch verification.
- Node version used: `v18.20.8`.

## 3. Milestone

**1S.6 — Provider-Backed Protected Peak Qualification Composition**

1S.6 composes the provider-backed qualification policy acquisition from 1S.5 with the protected-peak qualification composition from 1S.4.
It is an orchestration layer only.

## 4. Architecture

The verified composition is:

```text
provider + operationalResult
          |
          v
acquireQualificationPolicySnapshot()
          |
          | exact returned policy object
          v
qualifyProtectedPeakHandoff({
    operationalResult,
    policySnapshot,
    ...,
    estimatedGas
})
          |
          v
QUALIFIED / PREFLIGHT
```

The provider is forwarded to 1S.5 acquisition.
The exact acquired policy snapshot object is forwarded to 1S.4 qualification.
The qualification result is returned unchanged.

## 5. Implementation files

Exactly two implementation files were added:

1. `scripts/utils/polygonV4ProviderProtectedPeakQualification.js`
2. `test/polygonV4ProviderProtectedPeakQualification.test.js`

Implementation size:

- utility: 68 lines / 1301 bytes
- test: 184 lines / 5179 bytes
- total: 252 lines / 6480 bytes
- commit stat: 2 files changed, 252 insertions

## 6. Orchestrator contract

The utility exports `qualifyProviderProtectedPeakHandoff`.

Its inputs include:

- provider
- operationalResult
- startToken
- entryToken
- exitToken
- slippageBps
- maxSlippageBps
- maxAgeBlocks
- estimatedGas
- safetyReserveWei
- minimumNetProfitWei

It also supports injected acquisition and qualification dependencies for deterministic zero-RPC testing.

The orchestration sequence is exactly:

1. acquire the qualification policy snapshot using the supplied provider;
2. forward the exact returned snapshot to `qualifyProtectedPeakHandoff()`;
3. forward all qualification inputs unchanged;
4. return the qualification result unchanged.

## 7. Policy ownership

1S.6 does not own economic policy.

- It does not define a gas-unit constant.
- It does not contain a `700000` production literal.
- It does not change slippage policy.
- It does not change freshness policy.
- It does not change flashloan premium policy.
- It does not change gas-price policy.
- It does not change safety reserve.
- It does not change minimum net profit.
- `estimatedGas` remains an explicit caller input.

## 8. Provider-backed policy semantics

1S.5 remains the owner of qualification policy acquisition.

The acquired policy contains:

- `currentBlock`
- `gasPriceWei`
- `premiumBps`

with provenance:

- currentBlock: `PROVIDER_OBSERVED`
- gasPrice: `OBSERVED_AT_QUALIFICATION`
- aavePremium: `QUALIFICATION_BLOCK_PINNED`

Aave premium acquisition is pinned to the exact observed qualification current block.
Gas price is a contemporaneous provider observation and is not represented as block-pinned.

## 9. Evidence identity

The tests verify strict object identity across the orchestration seam.

- exact provider identity reaches policy acquisition;
- exact acquired policy snapshot identity reaches qualification;
- exact operationalResult identity is forwarded;
- exact estimatedGas identity is forwarded;
- QUALIFIED result identity is returned unchanged;
- PREFLIGHT result identity is returned unchanged.

This follows the same preservation principle established earlier for protected-peak observation evidence: select and compose evidence rather than reconstructing it.

## 10. Fail-closed behavior

Policy acquisition failures propagate.
If acquisition rejects, qualification is not called.

1S.6 does not reinterpret structural or provider failures.
It does not introduce fallback to older evidence.
It does not catch a failure and manufacture a qualification result.

## 11. Explicit non-goals and forbidden behavior

1S.6 does NOT:

- call `observeThreeLegEconomics()`;
- re-quote protected evidence;
- create new quote evidence;
- estimate execution gas;
- claim `estimatedGas` is measured current execution gas;
- use a signer;
- create or send a transaction;
- broadcast;
- encode an execution plan;
- execute the route;
- add fallback behavior;
- weaken freshness, slippage, premium, gas, reserve, or minimum-profit policy;
- modify `ProfitBot.sol`;
- modify `ThreeLegExecution`;
- modify production execution helpers;
- modify frontend / MetaMask behavior;
- modify deployment addresses;
- modify HP/Bugs.

## 12. Execution gas provenance

Execution gas provenance remains intentionally unresolved for the exact selected protected V4 route / amount / block.

The existing `700000` gas-unit value elsewhere remains a conservative qualification policy estimate.
It must NOT be described as current measured execution gas.

1S.6 preserves `estimatedGas` as an explicit caller-supplied qualification input and does not manufacture stronger provenance.

## 13. Focused 1S.6 tests

The new orchestration test file contains six tests:

1. forwards exact provider to qualification policy acquisition;
2. forwards exact acquired policy snapshot identity to qualification;
3. forwards qualification inputs unchanged;
4. fails closed when policy acquisition rejects;
5. returns QUALIFIED result unchanged;
6. returns PREFLIGHT rejection unchanged.

Final focused 1S.6 result: **6/6 passing**.

## 14. Focused 1S regression

The combined protected-peak handoff / qualification / provider-policy regression set passed:

- tests: 32
- pass: 32
- fail: 0
- return code: 0

## 15. Canonical regression evidence

Canonical Node regression:

- `npm run test:node`
- tests: 466
- pass: 466
- fail: 0
- return code: 0

Canonical Hardhat regression:

- `npm run test:hardhat`
- 29 passing
- return code: 0

Hardhat compiled 35 Solidity files successfully.
Only dependency SPDX warnings were observed.

Hardhat modified tracked generated output under `artifacts/` and `cache/`.
The changed-path audit proved all tracked changes were generated-only.
Those generated changes were restored before staging the implementation.
Hardhat was intentionally not rerun after restoration because doing so would recreate the generated diffs.

## 16. Final implementation audit

Before staging:

- tracked worktree was clean;
- exactly the two intended implementation files were untracked;
- utility syntax passed;
- test syntax passed;
- focused 1S.6 tests passed 6/6;
- production forbidden-content scan was empty;
- secret-like scan was empty;
- no-index whitespace checks produced no diagnostics.

Staging audit:

- exactly two files staged;
- staged count: 2;
- staged boundary: PASS;
- cached whitespace check: 0;
- prohibited-path boundary: PASS;
- no unstaged tracked changes;
- no remaining untracked files.

## 17. Commit and remote verification

Implementation commit:

- hash: `a95c87d83d2f8e74a756aeb9c6c051840d8cd0bb`
- subject: `Add provider-backed protected peak qualification composition`
- parent: `c2e2f731484849f5caed30d0922f48d0613d5e6b`
- files: 2
- insertions: 252

Push/fetch verification:

- push return code: 0
- fetch return code: 0
- local after push: `a95c87d83d2f8e74a756aeb9c6c051840d8cd0bb`
- remote after fetch: `a95c87d83d2f8e74a756aeb9c6c051840d8cd0bb`
- remote verification: PASS
- final worktree: clean

No RPC was performed for the 1S.6 implementation or validation.
No signer was used.
No live transaction was performed.
HP/Bugs was not modified.

## 18. Independent environment and parked provider issue

The HP/Bugs environment remains independent and must not be disturbed.

The Codespaces Infura secret-injection investigation remains parked by explicit user choice.
Do not resume that investigation unless explicitly requested.
Do not weaken secret handling or add `.env` / startup-file workarounds merely to make the temporary Codespace inject the secret.

## 19. Dependency notice

GitHub reported 228 dependency vulnerabilities on the default branch during push:

- 12 critical
- 99 high
- 79 moderate
- 38 low

Dependency remediation is a separate future task.
Do not mix it into the 1S milestone.

## 20. Recovery procedure

After a chat/session reset, recover from durable repository state rather than assumed chat memory.

Start with:

```bash
cd /workspaces/profitbot_project
git status --short
git log --oneline -8
git rev-parse HEAD
git rev-parse origin/repair/simulation-safety
```

Then read this checkpoint and the relevant 1S utilities/tests before continuing.

## 21. State at checkpoint creation

At the start of checkpoint creation:

- 1S.6 implementation was fully committed;
- implementation was pushed;
- fetch verification passed;
- local and remote matched;
- worktree was clean;
- no checkpoint commit had yet been created.

## 22. Next-step constraint

Do not jump directly from this orchestration layer to live execution.

Any next milestone must preserve the established separation between:

- protected observation evidence;
- qualification-time provider policy evidence;
- explicit execution-gas assumptions/evidence;
- execution-plan construction;
- signer / transaction / broadcast authorization.

In particular, unresolved exact execution-gas provenance must remain explicit rather than being silently replaced by the conservative 700000 policy estimate.

Live broadcast remains a separate explicit decision boundary.
