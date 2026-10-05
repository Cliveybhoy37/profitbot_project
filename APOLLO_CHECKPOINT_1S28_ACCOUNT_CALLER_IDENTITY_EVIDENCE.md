# Apollo Checkpoint — 1S.28 Account/Caller Identity Evidence

## Status

1S.28 implementation is complete and committed locally.

Implementation commit:

`2aa44794cf5b444eefb74c11c5e2a2bd0f8a2af9`

Parent / closed 1S.27 checkpoint commit:

`b65d7040090fb11c5fc15f8acac3f37607288ba5`

Branch:

`repair/simulation-safety`

The implementation has not yet been pushed as part of the 1S.28 remote closure.

## Milestone boundary

1S.28 owns only account/caller identity evidence.

It consumes the exact preserved 1S.27 current-state execution preflight evidence plus injected account identity evidence.

It does not recreate candidate, quote, route, execution-leg, execution-plan, gas, policy, qualification, or preflight evidence.

Governing rule remains:

**1S validates and selects preserved evidence; it does not recreate evidence.**

## Required evidence

The boundary requires:

- 1S.27 current-state preflight evidence is ready.
- Upstream live execution authorization is explicitly false.
- Upstream signer authorization is explicitly false.
- Upstream broadcast authorization is explicitly false.
- Caller address is a valid nonzero EVM address.
- Deployed owner address is a valid nonzero EVM address.
- Caller identity matches the deployed ProfitBot owner.
- Account executor deployment address is a valid nonzero EVM address.
- Account executor deployment identity matches the executor address preserved by 1S.27.
- Preserved upstream evidence identities remain unchanged.

Successful output sets:

- `accountCallerIdentityReady: true`
- `liveExecutionAuthorized: false`
- `signerAuthorized: false`
- `broadcastAuthorized: false`

## Implementation

Source:

`scripts/utils/polygonV4AccountCallerIdentityEvidence.js`

SHA-256:

`915101056121477b384c57f9c1c2359884d6403930ed3d2d970ca72f8f41aaf5`

Test:

`test/polygonV4AccountCallerIdentityEvidence.test.js`

SHA-256:

`951fb6cfd425874865a43ab6a3fbdf56b0fcf311c35b3b209a61c5e81cc0ad9e`

Implementation commit:

`2aa44794cf5b444eefb74c11c5e2a2bd0f8a2af9`

The implementation commit contains exactly the source and test above.

## Fail-closed authorization hardening

All three upstream authorization fields must be explicitly false:

- `liveExecutionAuthorized`
- `signerAuthorized`
- `broadcastAuthorized`

True, missing, or undefined authorization state is rejected.

The test suite covers both true values and absence of each authorization field.

## Identity semantics

Address identity comparison uses normalized EVM-address comparison.

Tests include genuine alphabetic case differences for the same address.

The boundary separately proves:

1. caller address equals deployed owner address;
2. account executor deployment address equals the executor deployment address preserved by 1S.27.

## Explicit non-ownership

1S.28 does not own or perform:

- provider or RPC acquisition;
- `owner()` RPC calls;
- bytecode RPC calls;
- signer acquisition;
- wallet/private-key handling;
- transaction construction;
- populate-transaction operations;
- nonce acquisition;
- fee acquisition;
- transaction gas-limit ownership;
- transaction signing;
- transaction sending;
- receipt waiting;
- broadcast authorization;
- fork acquisition or mutation;
- candidate reconstruction;
- quote reconstruction;
- route reconstruction;
- execution-leg reconstruction;
- execution-plan reconstruction;
- policy reconstruction;
- gas-evidence reconstruction;
- preflight reruns.

No private key, seed phrase, password, API secret, or credential is stored in this checkpoint.

## Validation

Final hardened validation:

- focused 1S.28 tests: **20/20**
- affected execution-evidence regression set: **66/66**
- canonical Node suite: **640/640**
- canonical Hardhat suite: **29/29**

Canonical project runtime:

- Node: `v18.20.8`
- npm: `10.8.2`
- NVM: `0.40.7`
- `.nvmrc`: `18.20.8`

## Controlled-fork decision

A new controlled-fork test is not required for 1S.28.

Reason: 1S.28 is a pure validation/preservation boundary. It introduces no RPC, fork, execution, transaction, or simulation semantics.

The existing controlled prepared lifecycle evidence remains the downstream execution/simulation evidence boundary; 1S.28 does not replace or broaden it.

## Live execution boundary

This milestone does not authorize live execution.

It does not authorize a signer.

It does not authorize transaction signing.

It does not authorize transaction sending.

It does not authorize broadcast.

Passing tests and account/caller identity readiness must not be interpreted as authorization for a real flashloan transaction.

## Deferred boundaries

Still deferred to separately scoped evidence and authorization boundaries:

- unsigned transaction-intent/request evidence;
- exact transaction field binding;
- nonce;
- chain transaction parameters;
- fee parameters;
- transaction gas limit;
- signer acquisition;
- signing authorization;
- transaction sending;
- broadcast authorization.

Signer and broadcast remain separately gated.

## Recovery state

At implementation closure:

- branch: `repair/simulation-safety`
- implementation HEAD: `2aa44794cf5b444eefb74c11c5e2a2bd0f8a2af9`
- implementation parent: `b65d7040090fb11c5fc15f8acac3f37607288ba5`
- source SHA-256: `915101056121477b384c57f9c1c2359884d6403930ed3d2d970ca72f8f41aaf5`
- test SHA-256: `951fb6cfd425874865a43ab6a3fbdf56b0fcf311c35b3b209a61c5e81cc0ad9e`
- implementation worktree was clean;
- implementation had not yet been pushed;
- live execution authorization: **NO**
- signer authorization: **NO**
- broadcast authorization: **NO**

Next closure sequence:

1. verify this checkpoint content and repository scope;
2. commit this checkpoint separately;
3. verify the checkpoint commit contains only this checkpoint;
4. only then perform exact remote closure;
5. fetch and verify local/remote equality and zero divergence;
6. select any later milestone only through a fresh read-only architecture/safety audit.

Do not infer authorization for a later execution boundary from completion of 1S.28.
