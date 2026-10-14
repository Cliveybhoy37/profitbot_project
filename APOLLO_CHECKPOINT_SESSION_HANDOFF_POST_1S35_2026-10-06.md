# Apollo Session Handoff — Post 1S.35

Date: 2026-10-06
Branch: repair/simulation-safety

## Authoritative repository state

HEAD:

14c0ad5a9c188ea98949709b89630c166b3cb195

Commit:

Add 1S.35 prospective signer identity evidence

Remote:

origin/repair/simulation-safety

Local/remote divergence after push:

0 0

## Completed milestone

1S.35 — Prospective Signer Identity Evidence

Status: COMPLETE / FROZEN / PUSHED

Checkpoint:

APOLLO_CHECKPOINT_1S35_PROSPECTIVE_SIGNER_IDENTITY_EVIDENCE.md

Checkpoint SHA-256:

d60ff9ad725a75ca9a7d35e3fd3f8664dddce59bb5959a466e3508324da949a6

Production utility:

scripts/utils/polygonV4ProspectiveSignerIdentityEvidence.js

Production SHA-256:

40dd5e968c78bb6630f97e8b683bff32774f6c431599bda84f8121942330e182

Test:

test/polygonV4ProspectiveSignerIdentityEvidence.test.js

## Validation

1S.35 focused hardening:

10 / 10 PASS

Affected 1S.28 -> 1S.35 chain:

157 / 157 PASS

Canonical Node:

777 / 777 PASS

Canonical Hardhat:

29 / 29 PASS

Ownership guard:

PASS

## 1S.35 ownership

1S.35 consumes exact validated 1S.34 evidence.

Identity chain:

1S.28 callerAddress
-> 1S.29 transactionIntent.from
-> 1S.33 transactionEnvelope.from
-> 1S.34 callRequest.from
-> 1S.35 prospective signerAddress

1S.35 accepts only a narrow injected getSignerAddress capability.

It proves prospective signer identity only.

It does NOT authorize signing, execution, sending, or broadcast.

## Authorization state

liveExecutionAuthorized=false
signerAuthorized=false
broadcastAuthorized=false

Prospective signer identity readiness is NOT signer authorization.

## Safety state

PRIVATE_KEY_ACCESSED=NO
REAL_SIGNER_CONSTRUCTED=NO
REAL_SIGNER_ADDRESS_REQUESTED=NO
TRANSACTION_SIGNED=NO
TRANSACTION_SENT=NO
FLASHLOAN_EXECUTED=NO
BROADCAST_AUTHORIZED=NO

## Protected gas experiments

These remain deliberately untracked:

test/polygonV4GasStateSensitivityProbe.test.js

SHA-256:

5c2f95dcce48b1a2346a6ec8c29b61c372d6e2271fa79d9892aa23cb972df6d7

test/polygonV4PairedGasMeasurementIntegration.test.js

SHA-256:

5b99cc2bf6ddb753960829a94f8928e91f765475187caed0dcf5b337b9e2f139

test/polygonV4PairedGasStateSensitivityIntegration.test.js

SHA-256:

3155abbaef3d0438e85daf7b79c2f2e200649e3b994d01428e5d765d79190d77

Do not silently modify, stage, commit, delete, or promote these files.

## Gas ownership

Current transaction gas ownership remains:

1S.31 current exact estimateGas
-> 1S.32 exact selected gasLimit
-> 1S.33 complete transaction envelope
-> 1S.34 provider.call pre-send simulation

1S.35 introduces no gas policy.

Historical fork receipt gas remains separate from current estimate/selection.

Future successful live Polygon receipt gasUsed is exact evidence for that mined
transaction only and must not become a universal hardcoded gas constant.

## Next architectural work

Next milestone has NOT been implemented.

Provisional direction:

1S.36 — signer authorization boundary

Do not assume the exact 1S.36 contract until audited/designed.

Required separation should remain:

1S.35 prospective signer identity
-> signer authorization
-> signing authorization
-> final immediate safety checks
-> explicit broadcast authorization
-> actual Polygon transaction
-> successful mined receipt
-> validated live receipt evidence

Do not collapse these boundaries.

Do not load or expose a private key during architecture/audit work.

Do not ask for private keys, seed phrases, passwords, or API secrets.

## Dependency-security notice

GitHub currently reports 228 dependency vulnerabilities on the default branch:

12 critical
99 high
79 moderate
38 low

Treat dependency remediation as a separate workstream.

Do not mix broad dependency upgrades into the execution-pipeline milestone.

## Recovery instruction

On session recovery, first verify:

git status --short
git log -3 --oneline
git rev-parse HEAD
git rev-parse origin/repair/simulation-safety
git rev-list --left-right --count origin/repair/simulation-safety...HEAD

Then verify the three protected gas experiment hashes.

Do not infer execution progress from chat memory when repository evidence is
available.

1S36_AUDIT_RUN=NO
