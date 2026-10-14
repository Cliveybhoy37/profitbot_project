# Apollo Recovery Checkpoint — 1S.5

## 1. Milestone

1S.5 — Provider-Backed Qualification Policy Acquisition.

Implementation is complete, committed, pushed, fetched, and remote-verified.

## 2. Authoritative Repository State

Branch: `repair/simulation-safety`

Implementation commit:
`76de7e59f308338ff4aa5c0bf190c2775d50dfd9`

Subject: `Add provider-backed qualification policy acquisition`

Parent:
`d14d802825619ce2889e95c2b623c0abb3fb9c91`

At implementation closure, local HEAD and fetched remote matched exactly and the worktree was clean.

## 3. Relevant 1S History

- `e1fc5f36b8eed73516d5b2fd2917ebb83d6b4d7e` — 1S.3 implementation
- `556b4c35dee1f9293e15ec79abf5f75cb989ccbc` — 1S.3 checkpoint
- `012db3ee73e9656f2d2c084797a6e8fff58b9af8` — 1S.4 implementation
- `d14d802825619ce2889e95c2b623c0abb3fb9c91` — 1S.4 checkpoint
- `76de7e59f308338ff4aa5c0bf190c2775d50dfd9` — 1S.5 implementation

## 4. Core 1S Safety Rule

**1S validates and selects evidence; it does not recreate evidence.**

The protected handoff uses exact preserved QUOTE_OK evidence.
It must not re-quote, reconstruct quote metadata, or fall back to an older cycle.

## 5. 1S.3 Foundation

1S.3 established the protected-peak handoff.

It requires completed acquisition, stable interior peak evidence, one stable protected amount, increasing snapshot blocks, matching observation/snapshot block identity, and QUOTE_OK selected evidence.

The newest operational cycle is authoritative. Degraded latest evidence fails closed rather than falling back.

## 6. 1S.4 Foundation

Utility: `scripts/utils/polygonV4ProtectedPeakQualification.js`

Composition:
`selectProtectedPeakHandoff()` → `buildObservedV4Candidate()` → `buildV4ExecutionLegs()` → `preflightObservedV4Candidate()`.

1S.4 consumes explicit `currentBlock`, `gasPriceWei`, and `premiumBps` policy values.
It performs no provider acquisition, signer work, transaction, broadcast, or quote regeneration.

## 7. 1S.5 Gap

1S.5 supplies dedicated provider-backed qualification-policy acquisition.
This establishes policy provenance without changing preserved quote evidence.

## 8. 1S.5 Architecture

Acquisition sequence:

1. call `provider.getBlockNumber()`;
2. validate the positive safe-integer `currentBlock`;
3. concurrently acquire `provider.getGasPrice()` and Aave economics;
4. bind Aave economics to that exact `currentBlock`;
5. validate the resulting policy values;
6. return the qualification policy snapshot.

Malformed current-block evidence fails before gas or Aave acquisition.

## 9. Implementation Files

- `scripts/utils/polygonV4QualificationPolicySnapshot.js`
- `test/polygonV4QualificationPolicySnapshot.test.js`

Implementation commit contains exactly 2 files and 428 insertions.

## 10. Qualification Policy Schema

Returned policy fields:

- `currentBlock`
- `gasPriceWei`
- `premiumBps`
- `provenance.currentBlock = PROVIDER_OBSERVED`
- `provenance.gasPrice = OBSERVED_AT_QUALIFICATION`
- `provenance.aavePremium = QUALIFICATION_BLOCK_PINNED`

Qualification uses `currentBlock`, not research-snapshot `blockTag` semantics.

## 11. Block-Binding Semantics

Aave economics are acquired with the qualification-time block:
`resolveAaveEconomicsFn(provider, undefined, currentBlock)`.

Therefore the Aave premium is qualification-block pinned.

Gas price is obtained from `provider.getGasPrice()` during qualification acquisition.
Gas price is contemporaneously observed but is NOT block-pinned.

Do not describe the gas price as block-pinned.

## 12. Validation

- `currentBlock` must be a positive safe integer.
- gas price must be coercible to a positive ethers BigNumber.
- `premiumBps` must be a safe integer from 0 through 9999.
- malformed provider/Aave evidence fails closed.

## 13. Test Evidence

New 1S.5 focused tests: 6/6 passed.

Combined focused 1S regression: 26/26 passed.

Canonical Node regression: 460/460 passed.

Canonical Hardhat regression: 29/29 passed.

Post-Hardhat cleanup focused recheck: 6/6 passed.

Syntax and diff checks passed.

## 14. Hardhat Generated Output Recovery

The canonical Hardhat run regenerated tracked `artifacts/` and `cache/` output.
An initial cleanup helper had an awk syntax error and did not restore it.

A guarded recovery then proved all tracked changes were generated output only and restored exactly `artifacts/` and `cache/`.

After recovery the tracked worktree was clean and the two intended 1S.5 files remained intact.

This was test-environment cleanup, not a product-code regression.

## 15. Remote Verification

Implementation commit:
`76de7e59f308338ff4aa5c0bf190c2775d50dfd9`

Guarded push: PASS.
Explicit fetch: PASS.
Local/fetched-remote hash equality: PASS.

## 16. Safety Boundary

1S.5 performs provider-only read acquisition by architecture.

No signer was used.
No live transaction was sent.
No broadcast occurred.
No execution plan was encoded.
No protected route was re-quoted.
No older evidence fallback was introduced.
HP/Bugs was not modified.

## 17. Execution Gas Provenance — Still Unresolved

1S.5 does NOT establish measured current execution gas for the selected protected V4 route.

`estimatedGas` remains an explicit caller-owned qualification policy input.

The existing `700000` value is a conservative qualification policy estimate.
It must NOT be represented as current measured execution gas.

Historical gas measurements from other routes, amounts, blocks, or execution contexts must not be extrapolated to the selected protected V4 route.

Route-specific gas provenance remains a separate future milestone.

## 18. Economic Policy Boundary

1S.5 does not weaken minimum profit, slippage, maximum slippage, premium accounting, gas-cost accounting, safety reserve, freshness, or worst-case profitability policy.

## 19. Provider Boundary

Required provider methods are `getBlockNumber()` and `getGasPrice()`.
Aave policy evidence is read through `resolveAaveEconomics`.

There is no signer, transaction, or execution dependency.

## 20. Existing Live Qualifier Boundary

1S.5 does not modify the existing live qualification runner.

Do not silently rewrite that runner while recovering this milestone.

## 21. No Re-Quote / No Fallback

Do not insert `observeThreeLegEconomics()` or equivalent quote regeneration into the protected handoff.

If newest operational evidence is degraded or non-qualifying, fail closed.
Do not fall back to older executable-looking evidence.

## 22. Codespaces Provider Issue

The separate Codespaces secret-injection investigation is parked by user choice.
Do not resume it unless explicitly requested.
Do not weaken credential security or store provider credentials in the repository.

## 23. HP/Bugs

HP/Bugs is an independent environment.
Do not stop, restart, modify, or repurpose it during 1S continuation.

## 24. Dependency Notice

GitHub reported 228 vulnerabilities on the default branch during push: 12 critical, 99 high, 79 moderate, and 38 low.

Dependency remediation is a separate future task and must not be mixed into 1S.5.

## 25. Toolchain

- Node v18.20.8
- npm 10.8.2
- `.nvmrc=18.20.8`

NVM already works. Do not reinstall it merely because `$HOME/.nvm/nvm.sh` is absent.

## 26. Protected Paths

Do not casually modify `ProfitBot.sol`, `ThreeLegExecution`, production execution helpers, frontend/MetaMask code, deployment addresses, or `.env`.

No live-network transaction is authorized by this checkpoint.

## 27. Current Architecture

protected operational evidence
→ 1S.3 exact preserved-evidence handoff
→ 1S.4 pure qualification composition
→ 1S.5 provider-backed qualification policy acquisition.

## 28. Recommended Next Step

Begin with a repository-only architecture audit for the next thin composition layer.

Likely target: acquire the exact 1S.5 policy snapshot and supply it to `qualifyProtectedPeakHandoff()` while keeping `estimatedGas` explicit.

The next layer must perform no re-quote, fallback, signer work, transaction, broadcast, or gas-evidence invention.

## 29. Recovery Procedure

After context loss:

1. `cd /workspaces/profitbot_project`
2. inspect `git status --short`
3. inspect `git log --oneline --decorate -10`
4. read this checkpoint
5. verify local and remote branch hashes
6. confirm Node 18.20.8
7. do not assume transient shell/provider state survived
8. do not touch HP/Bugs
9. continue only from the next audited milestone

## 30. Secrets

This checkpoint intentionally contains no private keys, seed phrases, mnemonics, passwords, API keys, or RPC credentials.
Never add them.
