# Apollo Session Recovery — Post 1S.25

Date: 2026-10-05

This supplements, and does not replace, APOLLO_CHECKPOINT_1S25_PROTECTED_OPERATIONAL_PREPARED_LIFECYCLE.md.

## Durable recovery state

- Branch: `repair/simulation-safety`
- Remotely closed HEAD: `59861754bbf16e780860e69cbf8a025131e75497`
- 1S.25 checkpoint commit: `5986175 Add 1S.25 recovery checkpoint`
- 1S.25 implementation: `4c6c8e76a52913046b67087601023446aa7e3558`
- Previous 1S.24 checkpoint: `9eb4d4f479a6d44039682836e37a7617ff14e59c`
- At closure: local=remote, divergence `0 0`, clean worktree.

## 1S.25 implementation

- Milestone: Protected Operational Prepared-Lifecycle Composition.
- Source: `scripts/utils/polygonV4ProtectedPreparedExecutionLifecycleComposition.js`
- Test: `test/polygonV4ProtectedPreparedExecutionLifecycleComposition.test.js`
- Source SHA-256: `c395f6aa9e528fa35c53c07db53a37177c8f2bc9349d4a7ceb58fbb63cac43f8`
- Test SHA-256: `be6a9e5913b53fc45f0c0b2f671b966ee7a6a749bf97edd66de361ca333692c2`

Composition order:

`protected operational timed cadence -> exact operational result -> prepared execution lifecycle`

Frozen invariants:

- same authoritative provider required;
- exact operational-result identity required;
- optional amounts omission preserved;
- lifecycle result returned unchanged;
- both composition dependencies validated before cadence;
- fork infrastructure injected;
- executor injected;
- execution callbacks injected;
- signer ownership forbidden;
- transaction ownership forbidden;
- broadcast ownership forbidden.

1S.25 does NOT own provider construction, signer acquisition, fork reset/snapshot/revert, plan reconstruction, gas production, initiateFlashloan, transaction submission/waiting, or broadcast.

## Validation evidence

- Focused: `6/6 PASS`
- Affected composition: `41/41 PASS`
- Canonical Node: `587/587 PASS`
- Canonical Hardhat: `29/29 PASS`
- Final implementation audit: `PASS`
- Exact staging gate: `PASS`
- Implementation commit gate: `PASS`
- Checkpoint commit gate: `PASS`
- Remote closure: `PASS`

No new 1S.25 controlled-fork run was required because 1S.24 already supplies downstream controlled prepared-lifecycle integration evidence. 1S.25 adds the upstream composition seam.

## Node / Codespace recovery

- Repository `.nvmrc`: `18.20.8`
- Verified Node: `v18.20.8`
- Verified npm: `10.8.2`
- Verified NVM: `0.40.7`

After Codespace restart:

1. `cd /workspaces/profitbot_project`
2. `cat .nvmrc`
3. If nvm is available: `nvm install && nvm use`
4. Verify: `node --version && npm --version && nvm --version`
5. Expected Node is `v18.20.8`.

If nvm is unavailable, restore/install NVM first and then install the version from `.nvmrc`. Do not change the project Node major merely to accommodate a rebuilt Codespace.

Codespace shutdown does NOT preserve running processes, dev servers, shell variables, active NVM selection, temporary fork/RPC processes, terminal scrollback, or unsaved buffers. Git files/history and pushed commits are the durable authority.

## Canonical test authority

- `npm run test:node`
- `npm run test:hardhat`
- combined: `npm test`

Do not substitute `node --test test/*.test.js` or bare `npx hardhat test` for the canonical package scripts.

Hardhat may generate tracked artifacts/cache churn. Generated-only churn can be restored after successful tests when source/test immutability and worktree boundaries are verified.

## Tomorrow — first recovery gate

Before writing new code:

1. Restore Node from `.nvmrc`.
2. Verify Node/npm/NVM.
3. Run `git status --short`.
4. Run `git rev-parse HEAD`.
5. Run `git fetch origin repair/simulation-safety`.
6. Verify local and remote HEAD.
7. Verify divergence is `0 0`.
8. Read `APOLLO_CHECKPOINT_1S25_PROTECTED_OPERATIONAL_PREPARED_LIFECYCLE.md`.
9. Read this session checkpoint.
10. Reconstruct state before modifying anything.

Expected recovery HEAD before this session-checkpoint commit is `59861754bbf16e780860e69cbf8a025131e75497`.

## Next development step

Do NOT invent the next milestone contract from memory.

The next action is a READ-ONLY NEXT-MILESTONE DESIGN GATE.

Use current repository source, tests, Git history, and checkpoints to determine the smallest ownership boundary immediately after the now-closed protected operational cadence -> prepared lifecycle composition.

Before implementation: identify the next architectural seam; distinguish it from older qualification/live paths; freeze ownership and non-ownership; determine required evidence; then create tests first and implement minimally.

Do not reuse an older live/qualification path merely because it already exists.

## Safety boundary

- `LIVE_NETWORK_TRANSACTION=NO`
- `LIVE_SIGNER=NO`
- `LIVE_BROADCAST=NO`
- production execution authorization: `NO`

Repository/test closure does not authorize a live flashloan.

Before any real send, separately verify chain, deployed addresses, route/amount identity, current policy/economics, exact plan binding, gas evidence, deadline/freshness, balances/allowances, simulation/preflight, signer/account, transaction parameters, and protected minimum net profit.

Signer authorization and broadcast authorization remain separate explicit go/no-go boundaries.

## Protected boundaries

Do not casually modify ProfitBot.sol, ThreeLegExecution, production execution helpers outside explicit scope, frontend/MetaMask, deployment addresses, .env, or HP/Bugs observer configuration.

Do not weaken minimum-profit, slippage, gas, freshness, or worst-case protections. Do not increase maxAgeBlocks merely to hide latency. Do not substitute policy gas estimates for measured execution gas.

GitHub dependency vulnerabilities are a separate security-maintenance workstream and must not be silently mixed into the execution-critical lineage.

Never put private keys, seed phrases, mnemonics, passwords, RPC credentials, API secrets, or GitHub tokens in checkpoints or chat.

## Apollo recovery rule

If chat context is unavailable, repository files and Git history are authoritative. Start with `git status --short`, `git rev-parse HEAD`, and `git log --oneline --decorate -10`; read both 1S.25 checkpoints; reconstruct a concise state summary; do not claim memory of unavailable context.

## End state

- 1S.25 implementation: CLOSED
- 1S.25 milestone checkpoint: CLOSED
- 1S.25 remote publication: CLOSED
- Next milestone implementation: NOT STARTED
- Next action: READ-ONLY NEXT-MILESTONE DESIGN GATE
- Live execution authorization: NO
