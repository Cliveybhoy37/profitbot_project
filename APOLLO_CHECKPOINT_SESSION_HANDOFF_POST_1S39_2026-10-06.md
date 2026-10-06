# Apollo Session Handoff — Post-1S.39

Date: 2026-10-06
Branch: repair/simulation-safety

## Remote-backed authority

1S.39 implementation commit:
43b5fee6c14c2e3ef965d4cff3d93067e325648a

Parent:
ef03ba920c2c57c7f3f24529eac5789069030237

Commit subject:
Add 1S.39 exact transaction signing evidence

Local and origin/repair/simulation-safety were fetched and verified at:
- local: 43b5fee6c14c2e3ef965d4cff3d93067e325648a
- remote: 43b5fee6c14c2e3ef965d4cff3d93067e325648a
- divergence: 0 0

## Completed milestone

1S.39 — Exact Transaction Signing Evidence

1S.39 proves that the exact already-authorized transaction envelope is signed by the already-authorized and capability-bound signer and independently verifies the resulting raw EIP-1559 transaction.

It does not authorize or perform live execution or broadcast.

## 1S.39 committed artifacts

Production:
- scripts/utils/polygonV4ExactTransactionSigningEvidence.js
- 291 lines
- SHA256 adb8ddfdeb2513bd9071eb8e70e129bc98e7963ba76ec172820bc72d37e2f511

Test:
- test/polygonV4ExactTransactionSigningEvidence.test.js
- 841 lines
- SHA256 75acaae0fbb4b4c4e898b096698272c15d1963f9e22753aeeab367c8c1ad7ce5

Milestone checkpoint:
- APOLLO_CHECKPOINT_1S39_EXACT_TRANSACTION_SIGNING_EVIDENCE.md
- 249 lines
- SHA256 3e3bbeeebda5cb576991c0a1c37664392e09121b5b2bde4cf1dfc2b9b0f7333a

## Final validation record

Focused 1S.39 suite:
- 14/14 pass

Affected Polygon V4 Node-compatible regression:
- 683/683 pass

Canonical Node suite:
- command: npm run test:node
- 830/830 pass

Canonical Hardhat suite:
- command: npm run test:hardhat
- 29/29 pass

Post-Hardhat cleanup was verified:
- tracked worktree diff empty
- staged diff empty
- generated artifacts/cache churn removed
- protected gas experiments unchanged

Final content and authority audit passed before commit.

## Exact signing boundary

1S.39 accepts:
- exact 1S.38 signerCapabilityBindingEvidence
- narrow injected signTransaction capability

Required upstream authorization remains:
- signerCapabilityBindingReady === true
- signerAuthorized === true
- signingAuthorized === true
- liveExecutionAuthorized === false
- broadcastAuthorized === false

The normalized identities must agree:
- signerAddress
- signerCapabilityAddress
- transactionEnvelope.from

The preserved 1S.33 transaction envelope is not mutated.

1S.39 creates the explicit type-2 signing projection required for ethers v5 EIP-1559 signing and invokes the narrow signing capability exactly once.

## Independent signed-transaction verification

The raw signed transaction returned by the injected capability is treated as untrusted evidence.

1S.39 requires:
- raw result is a string
- raw result is valid hex
- raw result contains non-empty bytes
- parsed transaction type is exactly 2
- parsed chainId matches
- parsed nonce matches
- recovered from address matches the authorized signer
- parsed to matches
- parsed data matches
- parsed value matches
- parsed gasLimit matches
- parsed maxFeePerGas matches
- parsed maxPriorityFeePerGas matches
- parsed accessList is exactly empty
- independently derived keccak256(raw transaction) equals parsed transaction hash

Successful evidence sets:
- transactionSigningReady === true
- signerAuthorized === true
- signingAuthorized === true
- liveExecutionAuthorized === false
- broadcastAuthorized === false

Signing evidence does not mean the transaction was sent, broadcast, mined, or executed.

## Protected local gas experiments

The following remain deliberately untracked and outside the 1S.39 commit:

- test/polygonV4GasStateSensitivityProbe.test.js
  SHA256 5c2f95dcce48b1a2346a6ec8c29b61c372d6e2271fa79d9892aa23cb972df6d7

- test/polygonV4PairedGasMeasurementIntegration.test.js
  SHA256 5b99cc2bf6ddb753960829a94f8928e91f765475187caed0dcf5b337b9e2f139

- test/polygonV4PairedGasStateSensitivityIntegration.test.js
  SHA256 3155abbaef3d0438e85daf7b79c2f2e200649e3b994d01428e5d765d79190d77

Do not silently modify, stage, commit, promote, delete, or execute these files.

No arbitrary gas margin, multiplier, or fixed buffer has been promoted into the execution lineage.

## Pipeline position

Completed:
1S.35 prospective signer identity
-> 1S.36 signer authorization
-> 1S.37 transaction-signing authorization
-> 1S.38 signer capability-to-identity binding
-> 1S.39 exact signed transaction-to-envelope-to-signer proof

Not yet granted:
- live execution authorization
- broadcast authorization
- transaction broadcast

A later milestone must own final immediate safety validation before any explicit broadcast authorization milestone.

## Recovery instructions

On a fresh session or terminal:

1. Enter /workspaces/profitbot_project.
2. Confirm branch repair/simulation-safety.
3. Confirm Node 18.20.8 before running canonical tests.
4. Inspect git status before modifying anything.
5. Confirm HEAD and origin/repair/simulation-safety authority.
6. Confirm the three protected gas experiment hashes before touching nearby gas work.
7. Treat commit 43b5fee6c14c2e3ef965d4cff3d93067e325648a as the remote-backed 1S.39 implementation authority until this handoff itself is committed and pushed.
8. Do not infer that signing evidence grants permission to broadcast.

## Next step

First close this post-1S.39 handoff as its own audited commit and push it.

After the handoff is remote-backed, define the next execution-safety milestone deliberately.

Do not automatically acquire a private key, construct a Wallet or Signer, perform RPC, sign another transaction, send a transaction, or broadcast anything.
