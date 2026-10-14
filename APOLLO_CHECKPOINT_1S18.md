# Apollo Checkpoint — Milestone 1S.18

## Status

1S.18 implementation is complete and locally committed.

Implementation commit:

`9604bba55065b81aed53d6bece73c67aeb7ceb78`

Subject:

`Bind protected qualification runtime policy`

Parent / closed 1S.17 checkpoint:

`7318f06ac995d4502d9fdf6a2ce47790baddc8e3`

Branch:

`repair/simulation-safety`

At checkpoint creation time, 1S.18 had not been pushed.

## Objective

1S.18 consumes the immutable protected qualification runtime policy introduced
by 1S.17 and binds it into the existing 1S.15 protected operational
qualification composition.

It closes the runtime-policy ownership/consumption gap without changing the
existing protected qualification, execution-plan, gas-evidence, provider,
contract, signer, or transaction layers.

## Implementation Scope

Exactly two implementation/test files were added:

- `scripts/utils/polygonV4ProtectedQualificationRuntimeComposition.js`
- `test/polygonV4ProtectedQualificationRuntimeComposition.test.js`

Implementation commit scope:

- 2 files
- 422 insertions
- no existing production file modified

## Runtime Policy Binding

The wrapper consumes the authoritative 1S.17 policy and forwards:

Route:
- WPOL start token
- DAI entry token
- APEPE exit token

Qualification:
- slippage: 50 bps
- maximum slippage: 100 bps
- maximum age: 3 blocks
- deadline: 300 seconds
- safety reserve: 0.001 WPOL
- minimum protected net profit: 0.005 WPOL

Operational cadence:
- count: 2
- minimum block gap: 1
- maximum attempts: 3
- maximum cycles: 2
- wait: 5000 ms

The caller's exact provider and exact gasEvidence object are preserved.

If amounts are supplied, the exact value is forwarded.
If amounts are omitted, the wrapper does not invent an amounts property.

## Gas-Evidence Boundary

The 1S.17 runtime policy owns conservative:

`policyGasUnits = 700000`

with provenance:

`CONSERVATIVE_QUALIFICATION_POLICY`

1S.18 deliberately does not forward policyGasUnits or estimatedGas.

Caller-supplied gasEvidence remains the separate execution-gas authority and
is forwarded by exact object identity.

The historical 1S.16 fork receipt measurement of 652106 gas remains historical
evidence only. 1S.18 does not import, reconstruct, generalize, or substitute
that measurement.

Conservative policy gas and exact execution gas evidence remain separate.

## Provider and Execution Boundary

1S.18 does not:

- construct a provider
- read an RPC URL
- call getBlock, getBlockNumber, or getGasPrice
- obtain a signer
- construct a wallet
- read a private key
- send or broadcast a transaction
- initiate a flashloan
- import historical execution gas evidence
- reconnect the old live qualifier
- reconnect the old live candidate set
- modify ProfitBot.sol
- modify ThreeLegExecution
- modify deployment addresses
- modify .env
- modify HP/Bugs

No blockchain transaction, signer, broadcast, or live flashloan occurred.

Passing tests do not authorize execution.

## Validation

Focused 1S.18:

- 5 / 5 passed

Affected protected composition:

- 87 / 87 passed

Canonical Node:

- 550 / 550 passed
- command: `npm run test:node`

Canonical Hardhat:

- 29 / 29 passed
- command: `npm run test:hardhat`

Canonical total:

- 579 / 579 passed

Hardhat-generated tracked artifacts/cache churn was restored only after the
successful Hardhat run. No source or test file was changed by that restore.

Final implementation review:

- staged diff check passed
- forbidden production-content scan was empty
- policy gas consumption was NONE
- existing protected files were unchanged
- implementation commit contained exactly two files
- implementation parent was the closed 1S.17 checkpoint
- worktree was clean after implementation commit

## Architectural Position

The protected lineage now includes runtime-policy operational qualification
binding above the existing 1S.15 operational qualification composition.

1S.18 remains a qualification composition layer. It is not an execution or
authorization layer.

The next architecture boundary is the transition from a newly qualified
protected runtime result to the required final fork/execution-path simulation.

That future boundary must preserve exact candidate, route, amount, policy,
deadline, freshness, profitability, and execution-gas evidence identity.

It must not introduce signer or broadcast capability as part of this
milestone.

## Live Execution Boundary

If qualifying live evidence is observed:

1. preserve the qualifying evidence;
2. independently requalify against current head and current gas;
3. verify freshness;
4. run final fork/execution-path simulation;
5. verify protected slippage;
6. verify Aave premium;
7. verify gas economics;
8. verify minimum protected net profit;
9. preserve final simulation evidence;
10. review execution as a separate stage;
11. only then consider signer or broadcast capability.

## Recovery

After session loss, use durable repository state:

`git status --short`

`git --no-pager log -5 --oneline`

`git rev-parse HEAD`

Then read:

`APOLLO_CHECKPOINT_1S18.md`

Expected implementation commit immediately before the checkpoint commit:

`9604bba55065b81aed53d6bece73c67aeb7ceb78`

Persisted Git history and project files are authoritative.

Do not assume terminal processes, dev servers, watchers, unsaved editor state,
Codespace runtime state, or chat context survived suspension.

Never place private keys, seed phrases, passwords, RPC secrets, or API secrets
in checkpoints or chat.
