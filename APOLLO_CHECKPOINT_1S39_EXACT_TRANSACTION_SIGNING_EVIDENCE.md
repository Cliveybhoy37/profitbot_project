# Apollo Checkpoint — 1S.39 Exact Transaction Signing Evidence

Date: 2026-10-06
Branch: repair/simulation-safety

## Milestone

1S.39 — Exact Transaction Signing Evidence

## Objective

Prove that the exact already-authorized Polygon transaction envelope is signed by the already-authorized and capability-bound signer, and independently verify the resulting raw EIP-1559 transaction without granting live execution or broadcast authorization.

## Safety boundary

1S.39 performs signing evidence only.

It does not:
- acquire a private key
- construct a Wallet or Signer
- acquire a provider or perform RPC
- send or broadcast a transaction
- authorize live execution
- authorize broadcast

The production utility receives only the preserved 1S.38 evidence and a narrow injected signTransaction capability.

## Frozen architecture

Input:
- exact signerCapabilityBindingEvidence from 1S.38
- narrow injected signTransaction capability

Required upstream state:
- signerCapabilityBindingReady === true
- signerAuthorized === true
- signingAuthorized === true
- liveExecutionAuthorized === false
- broadcastAuthorized === false

Before signing, 1S.39 independently normalizes and requires:
- signerAddress === signerCapabilityAddress
- signerCapabilityAddress === transactionEnvelope.from

1S.39 does not mutate the exact 1S.33 transaction envelope.

Because ethers v5 requires an explicit transaction type when signing EIP-1559 fee fields, the signing layer creates a type-2 signable projection containing:
- type: 2
- from
- to
- data
- value
- chainId
- nonce
- maxFeePerGas
- maxPriorityFeePerGas
- gasLimit

The preserved `from` field acts as a pre-sign signer identity assertion. It is not serialized into the signed transaction.

The narrow signing capability is invoked exactly once with the signable transaction.

## Independent signed-transaction verification

The returned raw transaction is treated as untrusted evidence.

1S.39 requires it to be:
- a string
- valid hex
- non-empty raw transaction bytes

It is independently parsed with ethers.utils.parseTransaction.

The parsed transaction must exactly match the authorized transaction for:
- EIP-1559 type 2
- chainId
- nonce
- recovered signer/from
- to
- data
- value
- gasLimit
- maxFeePerGas
- maxPriorityFeePerGas

The parsed accessList must be exactly empty.

The signed transaction hash is independently derived as keccak256 of the raw signed transaction bytes and must equal the parsed transaction hash.

The resulting evidence sets:
- transactionSigningReady === true
- signerAuthorized === true
- signingAuthorized === true
- liveExecutionAuthorized === false
- broadcastAuthorized === false

This evidence proves exact signing and verification only. It does not prove or authorize sending, broadcasting, mining, or execution.

## Architecture audits

Architecture audit:
- ethers version: 5.8.0
- offline throwaway-wallet experiment confirmed type-2 transaction parsing and signer recovery
- no provider was used
- no live key or production credential was used

Exact-envelope signability audit established:
- EIP-1559 envelope without explicit type is rejected by ethers v5 signing
- adding type: 2 makes the exact envelope signable
- retaining the correct from address succeeds
- removing from produces identical serialized raw transaction bytes
- supplying a mismatched from address is rejected by ethers before signing

Therefore type: 2 is owned by the 1S.39 signing projection and is not added to or reconstructed inside the preserved 1S.33 envelope.

Exact-shape/collision audit passed before implementation.

## RED and GREEN development

Minimum RED was performed while the production module was absent.

Expected failure:
- MODULE_NOT_FOUND

Result:
- RED gate PASS

Initial GREEN established exact signing evidence behavior.

The focused suite was subsequently hardened beyond the minimum implementation.

## Supplemental signed-raw and access-list audit

An offline supplemental audit demonstrated that a malicious type-2 transaction containing a non-empty access list could otherwise match every previously checked authorized envelope field while producing different raw bytes and a different transaction hash.

This exposed an exactness gap.

The production boundary was hardened to require:
- non-empty raw hex transaction bytes
- an exactly empty parsed accessList
- parsed transaction hash equality with independently calculated keccak256(raw transaction bytes)

Dedicated regression tests were added for all three properties.

The archived experimental gas fixture value 827233 was removed from the 1S.39 test and replaced with a neutral fixture value. 1S.39 does not own or promote experimental gas policy.

## Final artifacts

Production:
- scripts/utils/polygonV4ExactTransactionSigningEvidence.js
- 291 lines
- SHA256 adb8ddfdeb2513bd9071eb8e70e129bc98e7963ba76ec172820bc72d37e2f511

Test:
- test/polygonV4ExactTransactionSigningEvidence.test.js
- 841 lines
- SHA256 75acaae0fbb4b4c4e898b096698272c15d1963f9e22753aeeab367c8c1ad7ce5

Final static audit:
- exact signing call count: 1
- raw hex byte validation count: 1
- exact empty access-list validation count: 1
- raw/hash binding validation count: 1
- archived 827233 references: 0
- forbidden key, wallet, RPC, send, and broadcast capabilities: 0

## Final validation

Focused 1S.39 suite:
- 14 tests
- 14 pass
- 0 fail

Affected Polygon V4 Node-compatible regression:
- 683 tests
- 683 pass
- 0 fail

Canonical Node suite:
- command: npm run test:node
- 830 tests
- 830 pass
- 0 fail

Canonical Hardhat suite:
- command: npm run test:hardhat
- 29 passing
- 0 failing

Hardhat compilation generated tracked artifact/cache churn. Only artifacts/ and cache/ were restored afterward. No source, 1S.39, or protected gas experiment file was restored or modified during cleanup.

Post-Hardhat cleanup:
- tracked worktree diff: empty
- staged diff: empty

## Protected gas experiments

These files remain deliberately untracked and were not modified, staged, committed, promoted, or executed as part of 1S.39:

- test/polygonV4GasStateSensitivityProbe.test.js
  SHA256 5c2f95dcce48b1a2346a6ec8c29b61c372d6e2271fa79d9892aa23cb972df6d7

- test/polygonV4PairedGasMeasurementIntegration.test.js
  SHA256 5b99cc2bf6ddb753960829a94f8928e91f765475187caed0dcf5b337b9e2f139

- test/polygonV4PairedGasStateSensitivityIntegration.test.js
  SHA256 3155abbaef3d0438e85daf7b79c2f2e200649e3b994d01428e5d765d79190d77

## Authority before 1S.39 commit

HEAD:
ef03ba920c2c57c7f3f24529eac5789069030237

origin/repair/simulation-safety:
ef03ba920c2c57c7f3f24529eac5789069030237

Divergence:
0 0

This is the remote-backed post-1S.38 handoff authority.

## Pipeline position

1S.35 prospective signer identity
-> 1S.36 signer authorization
-> 1S.37 transaction-signing authorization
-> 1S.38 signer capability-to-identity binding
-> 1S.39 exact signed transaction-to-envelope-to-signer proof

1S.39 does not advance the system to live execution or broadcast.

Later milestones must separately own:
- final immediate safety validation
- explicit broadcast authorization
- transaction broadcast

## Exact next steps

1. Fingerprint and audit this completed checkpoint.
2. Stage only:
   - scripts/utils/polygonV4ExactTransactionSigningEvidence.js
   - test/polygonV4ExactTransactionSigningEvidence.test.js
   - APOLLO_CHECKPOINT_1S39_EXACT_TRANSACTION_SIGNING_EVIDENCE.md
3. Verify the exact staged file set and staged content.
4. Commit the 1S.39 implementation checkpoint.
5. Push and fetch, then verify local/remote divergence is 0 0.
6. Create a separate post-1S.39 session handoff checkpoint.
7. Commit and push that handoff separately.
8. Do not proceed automatically to live execution or broadcast.
