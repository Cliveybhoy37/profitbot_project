# APOLLO SESSION HANDOFF — POST-1S.34

Date: 2026-10-05

## Purpose

This is the durable recovery checkpoint for the session immediately
after full local and remote closure of 1S.34.

Use repository state, Git history, milestone checkpoints, source, and
tests as authority after recovery. Do not rely on chat memory when those
durable sources are available.

This checkpoint does NOT authorize live execution, private-key access,
signer construction, signing, transaction sending, flashloan execution,
or broadcast.

---

## Repository Authority

Repository:

`/workspaces/profitbot_project`

Branch:

`repair/simulation-safety`

Authoritative completed HEAD at the end of 1S.34:

`bdc979ac395913d2c22b4493b369b8df7446b4a5`

At 1S.34 remote closure:

local HEAD and `origin/repair/simulation-safety` were exactly identical
at that commit.

Divergence was:

`0 0`

The push was a normal non-force push.

---

## 1S.34 Final Lineage

Completed lineage:

`7575521ddc01557a858024c41e0cd0af4ba73ce7`
— Add 1S.33 recovery checkpoint

↓

`a8e0e32dc87354970530a69288a7feab9e480b61`
— Add current transaction pre-send simulation evidence

↓

`bdc979ac395913d2c22b4493b369b8df7446b4a5`
— Add 1S.34 recovery checkpoint

Exactly two commits closed 1S.34 above the completed 1S.33 checkpoint.

---

## 1S.34 Boundary

1S.34 is:

**Current Transaction Pre-Send Simulation Evidence**

Production source:

`scripts/utils/polygonV4CurrentTransactionPreSendSimulationEvidence.js`

SHA-256:

`dacd8423c610ed95de9c419f49646606a5dd21d28993d2b8a99081d39f78b42f`

Test:

`test/polygonV4CurrentTransactionPreSendSimulationEvidence.test.js`

SHA-256:

`2c7b1c6c1fe8bae932ed1c2f7b92df7efca4c2f08ac9ea7ec3cd5f99c27ce934`

1S.34 checkpoint:

`APOLLO_CHECKPOINT_1S34_CURRENT_TRANSACTION_PRE_SEND_SIMULATION_EVIDENCE.md`

SHA-256:

`95b1b8e67821811774fd0f03909efe93572d5bc338c70076a1996fddb5a597f5`

---

## 1S.34 Architecture

1S.34 consumes the exact validated 1S.33 transaction-envelope evidence
and an injected provider exposing `call`.

The authoritative 1S.33 transaction envelope contains:

- `from`
- `to`
- `data`
- `value`
- `chainId`
- `nonce`
- `maxFeePerGas`
- `maxPriorityFeePerGas`
- `gasLimit`

For ethers v5.8.0 `provider.call`, 1S.34 deliberately derives the
seven-field call projection:

- `from`
- `to`
- `data`
- `value`
- `gasLimit`
- `maxFeePerGas`
- `maxPriorityFeePerGas`

`chainId` and `nonce` remain part of the authoritative 1S.33 envelope,
but are deliberately not claimed to be fields of the ethers-v5
`provider.call` request.

1S.34 does not add:

- `gasPrice`
- transaction `type`

The provider simulation result is return data, not a transaction
receipt.

Simulation success does not mean a transaction was sent or mined and
does not guarantee future execution success.

---

## 1S.34 Anti-Drift / Safety Properties

Before calling the injected provider, 1S.34 validates the provable
1S.33 evidence graph.

It checks relevant readiness and authorization state for:

- 1S.32 gas-limit selection;
- 1S.31 gas estimation;
- 1S.30 current transaction parameters;
- 1S.29 unsigned transaction intent.

Authorization remains false throughout:

- `liveExecutionAuthorized === false`
- `signerAuthorized === false`
- `broadcastAuthorized === false`

It verifies transaction-intent fields against the envelope.

It verifies current parameter fields against the envelope.

It verifies exact selected-gas-limit object identity.

It does not invent stronger object provenance than the existing
evidence graph can prove.

---

## 1S.34 Validation Record

Focused 1S.34:

`13 / 13 PASS`

Affected 1S.27 through 1S.34:

`169 / 169 PASS`

Canonical Node:

`767 / 767 PASS`

Canonical Hardhat:

`29 / 29 PASS`

Runtime:

- Node `v18.20.8`
- npm `10.8.2`
- `.nvmrc` `18.20.8`

Hardhat generated tracked artifact/cache churn during canonical testing.

Only generated Hardhat churn was restored from HEAD.

There was no non-generated tracked churn.

No rerun was required after restoring generated-only churn because the
production source/test hashes remained unchanged.

---

## Gas Ownership Remains Unchanged

Do not promote any of these values into transaction gas policy:

- `700000` — qualification policy gas only;
- `652106` — historical successful local Hardhat fork receipt gas;
- `827233` — archived experimental estimate;
- `12685` — archived experimental estimate/receipt ratio.

Do not invent:

- arbitrary percentage margin;
- arbitrary multiplier;
- fixed additive buffer.

1S.32 remains authoritative:

the selected gas limit is the exact current validated 1S.31
`estimatedGasUnits` object.

---

## Long-Lived Experimental Files

These three files remain intentionally UNTRACKED:

`test/polygonV4GasStateSensitivityProbe.test.js`

SHA-256:

`5c2f95dcce48b1a2346a6ec8c29b61c372d6e2271fa79d9892aa23cb972df6d7`

`test/polygonV4PairedGasMeasurementIntegration.test.js`

SHA-256:

`5b99cc2bf6ddb753960829a94f8928e91f765475187caed0dcf5b337b9e2f139`

`test/polygonV4PairedGasStateSensitivityIntegration.test.js`

SHA-256:

`3155abbaef3d0438e85daf7b79c2f2e200649e3b994d01428e5d765d79190d77`

They were NOT included in the 1S.34 commits and were NOT pushed.

Do not silently stage, commit, modify, delete, or promote them.

---

## Important Architectural Lineage

The primary modern safety lineage is the post-23-September build.

Do not casually import genuinely old/pre-23-September execution code
into the current path.

Earlier post-23-September components may still be historical rather
than the correct current integration target.

Before introducing a new execution boundary, inspect:

- current source;
- relevant tests;
- `CHECKPOINT*.md` / `checkpoint*.md`;
- `APOLLO_CHECKPOINT*.md`;
- Git history and diffs;
- 23-September-to-current lineage;
- 1A through 1S milestone sequencing;
- existing integration evidence;
- safety and ownership boundaries.

If durable sources disagree, stop and resolve the disagreement rather
than guessing.

---

## Package Test Authority

Use the repository package scripts.

Canonical Node:

`npm run test:node`

Canonical Hardhat:

`npm run test:hardhat`

Do not substitute broad bare Node or Hardhat discovery commands.

The three experimental gas tests are not part of canonical
`test:node`.

---

## Current Safety State

At completed 1S.34:

`RPC_USED=NO`

`PRIVATE_KEY_ACCESSED=NO`

`SIGNER_CONSTRUCTED=NO`

`TRANSACTION_EXECUTED=NO`

`FLASHLOAN_EXECUTED=NO`

`LIVE_EXECUTION_AUTHORIZED=NO`

`BROADCAST_AUTHORIZED=NO`

1S.34 readiness is NOT authorization for live execution.

---

## Dependency Warning

GitHub reported 228 vulnerabilities on the repository default branch:

- 12 critical
- 99 high
- 79 moderate
- 38 low

Treat dependency remediation as a separate maintenance workstream.

Do not mix broad dependency upgrades into the execution-path milestone
sequence.

---

## What We Were About To Do

The next task is NOT yet an implementation task.

The next task is a READ-ONLY architecture/ownership investigation.

The session was about to investigate whether the smallest legitimate
post-1S.34 boundary concerns signer-address acquisition or whether
another non-signing validation/authorization boundary must come first.

A proposed audit had been labelled:

**1S.35 Signer Address Acquisition Ownership Audit**

That label is PROVISIONAL.

Do not treat 1S.35 as architecturally frozen merely because the audit
block used that name.

The audit must determine ownership before implementation.

---

## Proposed Next Audit

The intended next audit is read-only.

It should inspect:

1. current HEAD/local/remote authority;
2. ethers version;
3. ethers v5 Signer/Wallet `getAddress()` behavior;
4. repository `getAddress()` precedent;
5. signer dependency-injection precedent;
6. current 1S.28 caller-identity evidence;
7. current 1S.34 input/output contract;
8. the 1S.34 checkpoint's next-boundary language;
9. historical signer/wallet/signing commits;
10. signer-related historical files;
11. worktree integrity afterward.

The audit must NOT:

- invoke an RPC;
- read `.env`;
- access a private key;
- construct a wallet;
- construct a signer;
- request a real signer address;
- authorize a signer;
- authorize a transaction;
- sign a transaction;
- send a transaction;
- authorize broadcast;
- commit;
- push.

---

## Proposed Audit Command — Preserve for Next Session

The proposed block begins with:

`EXPECTED_HEAD="bdc979ac395913d2c22b4493b369b8df7446b4a5"`

and is titled:

`1S.35 SIGNER ADDRESS ACQUISITION OWNERSHIP AUDIT`

Before running it in the next session, first independently verify:

- HEAD;
- remote;
- branch;
- worktree;
- experimental hashes;
- 1S.34 checkpoint;
- whether calling the investigation “1S.35” is justified.

If those checks are sound, run the audit as a read-only investigation.

Do not move directly from recovery to signer construction.

---

## Live-Execution Boundary

Before any actual Polygon flashloan send, independently verify at
minimum:

- Polygon chain identity;
- deployed contract/executor addresses;
- deployed bytecode identity;
- exact route;
- exact amount;
- candidate qualification;
- current-state preflight;
- caller/owner identity;
- exact unsigned transaction intent;
- current chain ID;
- pending nonce;
- EIP-1559 fees;
- current gas estimate;
- selected gas limit;
- complete transaction envelope;
- current pre-send simulation;
- balances;
- allowances;
- deadline/freshness;
- economics/minimum-profit policy;
- explicit signer authorization;
- explicit transaction authorization;
- explicit broadcast authorization.

Signer acquisition, signing, sending, and broadcast remain separately
gated.

A successful live transaction, if eventually separately authorized,
would be evidence for that exact state/route. It cannot guarantee
future success because liquidity, prices, gas, state, and MEV can
change.

---

## Recovery Procedure for New Chat

In the next Apollo session, start by saying that this is continuation
of ProfitBot after completed 1S.34 and ask Apollo to recover from this
checkpoint and repository authority.

Then run/inspect:

`git status --short`

`git log --oneline --decorate -6`

`git rev-parse HEAD`

`git rev-parse origin/repair/simulation-safety`

and:

`sha256sum APOLLO_CHECKPOINT_SESSION_HANDOFF_POST_1S34_2026-10-05.md`

Also verify the three experimental hashes recorded above.

The expected pre-handoff-commit authority is:

`bdc979ac395913d2c22b4493b369b8df7446b4a5`

After this handoff file itself is committed and pushed, the NEW
handoff checkpoint commit becomes the recovery HEAD.

Read this file plus:

`APOLLO_CHECKPOINT_1S34_CURRENT_TRANSACTION_PRE_SEND_SIMULATION_EVIDENCE.md`

before deciding the next milestone.

Do not claim to remember missing chat content. Reconstruct from these
durable sources.

---

## Immediate Next Step

After recovery in a new chat:

**perform the read-only post-1S.34 signer-address/next-boundary
ownership audit before creating any production code.**

No live signer, signing, transaction, flashloan, or broadcast is
authorized by this handoff.
