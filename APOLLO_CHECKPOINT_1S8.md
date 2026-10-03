# APOLLO CHECKPOINT — 1S.8

## Milestone

1S.8 — Controlled Exact Execution-Gas Evidence Producer

Status: CLOSED

Implementation commit:
`0ef0b3d09748f6e6dcdeae960da8c3f09397ab16`

Implementation subject:
`Add controlled fork receipt gas evidence producer`

Parent / 1S.7 checkpoint commit:
`b7a8fc702d0c7a3c5d4529e2c5d7854bfd62730b`

## Objective

Produce exact execution-gas evidence from a successful transaction receipt on a controlled historical Polygon Hardhat fork, while binding that evidence to the exact protected execution identity.

The evidence is deliberately constrained to `FORK_RECEIPT` provenance.

No live Polygon execution, signer, broadcast, MetaMask interaction, policy weakening, or production execution-policy change was introduced.

## Implementation Files

- `scripts/utils/polygonV4ForkReceiptGasEvidence.js`
- `scripts/utils/polygonV4ForkReceiptGasEvidenceProducer.js`
- `test/polygonV4ForkReceiptGasEvidence.test.js`
- `test/polygonV4ForkReceiptGasEvidenceIntegration.test.js`
- `test/polygonV4ForkReceiptGasEvidenceProducer.test.js`

## Evidence Contract

Exact fork-receipt evidence is bound to:

- historical Polygon observation/source block;
- exact loan token;
- exact loan amount;
- exact three protected execution legs;
- exact encoded execution-plan hash;
- actual successful receipt `gasUsed`;
- deployed executor runtime-code hash;
- executor V3 router;
- executor V4 router;
- Permit2;
- Aave provider;
- resolved Aave pool;
- controlled historical fork provenance.

The producer requires explicit controlled fork provenance:

- method: `hardhat_reset`
- source block must equal the candidate observation block.

The emitted evidence provenance is:

- method: `FORK_RECEIPT`
- measurement block: historical Polygon source-state block
- source: controlled historical Polygon fork receipt

Important semantic boundary:

`measurementBlock` is the historical Polygon fork source-state block to which the receipt measurement is scoped. It is not the later local Hardhat block number produced by deployment/execution transactions.

The producer does not use `provider.getBlockNumber()` to infer historical provenance.

## Controlled Historical Fork Measurement

Historical Polygon source block:
`94709817`

Loan amount:
`0.125 WPOL`

Controlled Hardhat fork execution result:
`1 / 1 PASS`

Measured receipt gas:
`652106`

Execution-plan hash:
`0xf3dddb908db797d2732935ea25dfb48215c98ef85587ac012c2ba1093b94e009`

Executor runtime-code hash:
`0x347dca910e2d4b7dd6b4ba19151fc2cd28e33c268cbb38511169a0b4a753facc`

The measurement came from the actual successful local Hardhat-fork transaction receipt.

The fork used historical Polygon state obtained through the configured read-only upstream RPC. No transaction was broadcast to Polygon.

## Gas Policy Boundary

The measured `652106` gas units are exact evidence for this specific historical execution identity.

The existing conservative policy gas input remains `700000`.

1S.8 did not replace, lower, or otherwise modify that policy value.

Measured evidence must not be generalized to a different block, amount, route, encoded plan, executor deployment, or dependency context without matching evidence.

## Validation Evidence

Focused 1S.3 through 1S.8:
`61 / 61 PASS`

Controlled historical fork integration:
`1 / 1 PASS`

Canonical Node suite:
`495 / 495 PASS`

Canonical Hardhat suite:
`29 / 29 PASS`

Canonical Node + Hardhat total:
`524 / 524 PASS`

Final boundaries:

- hardcoded-address boundary: PASS
- local-block-provenance boundary: PASS
- secret/signer/broadcast boundary: PASS
- `git diff --check`: PASS
- generated Hardhat artifacts/cache restored after fork and Hardhat validation
- exact implementation-file boundary: PASS

Toolchain:

- Node `v18.20.8`
- npm `10.8.2`
- Hardhat `2.24.3`

## Safety Boundaries Preserved

- no live Polygon transaction
- no MetaMask interaction
- no private key, seed phrase, password, or API credential persisted
- no signer/live broadcast path added
- no `ProfitBot.sol` modification
- no `ThreeLegExecution` modification
- no production execution-helper modification
- no frontend modification
- no deployment-address modification
- no `.env` modification
- no minimum-profit weakening
- no slippage weakening
- no freshness weakening
- no gas-policy weakening
- no HP/Bugs modification

## Canonical Address Provenance

The 1S.8 integration test reuses the current V4 token exports from:

`scripts/research/runPolygonV4LiveQualification.js`

Executor dependency addresses are read from the freshly deployed `PolygonV4CandidateExecutor` rather than duplicated as new address literals.

## Historical Live Interaction Boundary

The earlier confirmed Polygon/MetaMask interaction from 28 September is separate historical live context and is not 1S.8 evidence.

1S.8 evidence comes only from the controlled historical Hardhat fork receipt described above.

## Provider Note

The controlled fork used the existing `ALCHEMY_POLYGON` environment configuration.

No RPC credential value is recorded in this checkpoint.

The separate Codespaces Infura secret-injection issue remains parked and is not part of 1S.8.

## HP/Bugs Boundary

HP/Bugs remains an independent environment and was not touched during 1S.8.

Do not modify or restart HP/Bugs as part of 1S.8 closure.

## Recovery Instructions

After chat/session loss, reconstruct state from durable repository evidence rather than assuming chat memory.

Start with:

1. checkpoints from 23 September through this checkpoint;
2. `git status`;
3. `git log --oneline --decorate -20`;
4. implementation commit `0ef0b3d09748f6e6dcdeae960da8c3f09397ab16`;
5. the five 1S.8 implementation/test files;
6. current package test scripts and source before planning the next milestone.

Never place private keys, seed phrases, passwords, or API secrets in checkpoints or chat.

## Closure State

1S.8 is closed once this checkpoint commit is verified and pushed.

Do not reopen 1S.8 merely to change the existing conservative `700000` gas policy. Any policy change requires separate evidence and a separately scoped milestone.

## Next Step

After checkpoint commit/push verification, reconstruct the next milestone from the 23 September through current checkpoint chain and current repository state before implementation.
