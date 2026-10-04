# Apollo Checkpoint — 1S.17

## 1. Milestone

1S.17 — Protected qualification runtime policy/configuration ownership.

This milestone centralizes the established protected qualification
runtime policy without changing execution behavior, provider behavior,
gas-evidence validation, signer behavior, or broadcast behavior.

## 2. Implementation Commit

Implementation commit:

5f872c0f1e5717ed289d94ca819e135772997956

Subject:

Add protected qualification runtime policy

Base before 1S.17 implementation:

554bf4042b7af39730f78c7bee5e7625dbcc5f38

## 3. Files Added

scripts/utils/polygonV4ProtectedQualificationRuntimePolicy.js

test/polygonV4ProtectedQualificationRuntimePolicy.test.js

No existing production files were modified.

## 4. Runtime Policy Identity

The immutable runtime policy owns:

- Polygon chain ID: 137
- start token: WPOL
  0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270
- entry token: DAI
  0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063
- exit token: APEPE
  0xA3f751662e282E83EC3cBc387d225Ca56dD63D3A
- slippageBps: 50
- maxSlippageBps: 100
- maxAgeBlocks: 3
- deadlineSeconds: 300
- policyGasUnits: 700000
- safetyReserveWei: 0.001 native-token units
- minimumNetProfitWei: 0.005 loan-token units

## 5. Operational Cadence Policy

The immutable operational policy owns:

- count: 2
- minimumBlockGap: 1
- maxAttempts: 3
- maxCycles: 2
- waitMs: 5000

These values are configuration ownership only.

The milestone does not create a provider and does not alter the
existing provider-backed operational composition.

## 6. Gas Provenance Boundary

700000 is conservative qualification policy gas.

It is NOT measured execution gas and must never be represented as
measured evidence.

The closed historical 1S.8 fork receipt measured:

652106 gas units

The immutable historical evidence remains separately owned by:

scripts/utils/polygonV4HistoricalExecutionGasEvidence.js

Historical execution evidence is exact-plan/candidate-specific and
must not be injected into arbitrary new protected observations.

Runtime execution gas evidence remains REQUIRED_SEPARATELY.

Do not weaken exact gas-evidence validators.

## 7. Architecture Boundary

1S.17 is additive policy/configuration ownership.

It does NOT yet switch existing runtime compositions to consume the
new policy object.

It does NOT:

- create or acquire a provider
- read blocks
- read gas price
- acquire execution gas evidence
- validate historical gas evidence
- validate fork receipt gas evidence
- create a signer
- create a wallet
- send a transaction
- initiate a flashloan
- broadcast anything

The existing 1S exact protected-evidence and execution-plan bindings
remain unchanged.

## 8. Protected Execution Invariants

Preserve the established lineage:

1A-1E protected amount search / peak discovery
-> 1F-1K acquisition, block, gating and stability controls
-> 1L-1Q provider observation, cadence and operational runner
-> 1R timing/provider performance and safe caching
-> 1S exact protected evidence, handoff, qualification, policy
   snapshot, execution context, gas evidence and execution-policy
   plan qualification.

1S validates/selects preserved evidence. It does not recreate or
silently substitute protected evidence.

Do not regress the protected path to caller-supplied estimatedGas.

Do not substitute policyGasUnits=700000 for exact validated execution
gas evidence.

## 9. Validation Evidence

Focused 1S.17 policy tests:

5 / 5 passed

Affected 1S composition suite:

82 / 82 passed

Canonical Node suite:

545 / 545 passed

Canonical Hardhat suite:

29 / 29 passed

Canonical total:

574 / 574 passed

Hardhat-generated tracked artifacts/cache churn was inspected and
restored after the successful canonical Hardhat run.

No source or test changes occurred after validation.

## 10. Static Boundary Evidence

Final staged implementation boundary before commit:

- exactly 2 added files
- 264 insertions
- git diff --cached --check passed
- no unstaged tracked changes

Static forbidden-surface scan found no:

- JsonRpcProvider
- WebSocketProvider
- getBlock(
- getBlockNumber(
- getGasPrice(
- getSigners(
- new ethers.Wallet
- sendTransaction(
- initiateFlashloan(
- HISTORICAL_EXECUTION_GAS_EVIDENCE
- validateHistoricalExecutionGasEvidence
- validateForkReceiptGasEvidence

## 11. External System Boundary

The HP laptop Bugs observer/scanner is a separate independent system.

Do not use HP/Bugs configuration or runtime behavior as authority for
the Codespace 1S execution path.

Do not modify or disturb HP/Bugs as part of 1S.17.

No 1S.17 action interacted with HP/Bugs.

## 12. Safety / Live Boundary

1S.17 does NOT authorize a live flashloan.

No signer was used.

No transaction was sent.

No broadcast occurred.

Before any future live-capable send, separately verify chain,
deployment addresses, route/amount identity, current policy/economics,
exact execution-plan binding, current gas evidence, freshness,
deadline, balances/allowances, simulation/preflight, signer/account,
and transaction parameters.

Signer and broadcast authorization remain separate go/no-go
boundaries.

## 13. Toolchain

Validated with:

Node v18.20.8
npm 10.8.2

Canonical Node command:

npm run test:node

Canonical Hardhat command:

npm run test:hardhat

Do not substitute bare `node --test test/*.test.js` for the canonical
Node suite.

Do not substitute bare `npx hardhat test` for the canonical Hardhat
suite.

## 14. Resume Point

1S.17 implementation is complete and committed locally.

Current implementation HEAD:

5f872c0f1e5717ed289d94ca819e135772997956

Next steps:

1. Verify this checkpoint content and repository boundary.
2. Commit APOLLO_CHECKPOINT_1S17.md separately.
3. Verify the checkpoint commit and clean worktree.
4. Push the implementation and checkpoint commits only after local
   closure is confirmed.
5. Fetch and verify exact remote branch HEAD after push.
6. Do not begin runtime-policy integration or any live-capable work
   implicitly; scope the next milestone separately.
