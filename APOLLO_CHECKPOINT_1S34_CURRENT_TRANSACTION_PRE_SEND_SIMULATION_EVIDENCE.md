# Apollo Recovery Checkpoint — 1S.34 Current Transaction Pre-Send Simulation Evidence

## Status

1S.34 implementation is complete and locally committed.

This checkpoint does **not** authorize live execution, signer use,
transaction signing, transaction sending, or broadcast.

## Boundary

1S.34 is the **Current Transaction Pre-Send Simulation Evidence**
boundary.

It consumes the exact validated 1S.33 Current Transaction Envelope
Evidence and an injected provider with `call` capability.

It validates that the preserved 1S.33 evidence graph has not drifted,
derives the current pre-send call projection, performs
`provider.call(...)`, and records the simulation result as evidence.

It does not acquire a provider or RPC connection.

## Git Authority

Branch:

`repair/simulation-safety`

1S.33 recovery checkpoint parent:

`7575521ddc01557a858024c41e0cd0af4ba73ce7`

1S.34 implementation commit:

`a8e0e32dc87354970530a69288a7feab9e480b61`

Implementation commit subject:

`Add current transaction pre-send simulation evidence`

At checkpoint preparation time, remote
`origin/repair/simulation-safety` remains at the completed 1S.33
checkpoint and 1S.34 has not been pushed.

## Production Files

Source:

`scripts/utils/polygonV4CurrentTransactionPreSendSimulationEvidence.js`

SHA-256:

`dacd8423c610ed95de9c419f49646606a5dd21d28993d2b8a99081d39f78b42f`

Test:

`test/polygonV4CurrentTransactionPreSendSimulationEvidence.test.js`

SHA-256:

`2c7b1c6c1fe8bae932ed1c2f7b92df7efca4c2f08ac9ea7ec3cd5f99c27ce934`

## Upstream Ownership

1S.34 consumes the exact 1S.33 envelope evidence and preserves the
validated upstream evidence graph.

The relevant upstream ownership remains:

- 1S.29 owns the exact unsigned transaction intent;
- 1S.30 owns current chain ID, pending nonce, and EIP-1559 fee evidence;
- 1S.31 owns the current raw gas estimate;
- 1S.32 selects the exact 1S.31 gas-estimate object as the gas limit;
- 1S.33 owns construction of the complete nine-field transaction
  envelope;
- 1S.34 owns only final current pre-send simulation evidence.

1S.34 revalidates the relevant 1S.33 nested readiness and authorization
state and verifies identity/non-drift relationships before simulation.

It does not reacquire or reconstruct upstream transaction parameters.

## Authoritative 1S.33 Envelope

The preserved 1S.33 envelope contains exactly:

- `from`
- `to`
- `data`
- `value`
- `chainId`
- `nonce`
- `maxFeePerGas`
- `maxPriorityFeePerGas`
- `gasLimit`

1S.33 does not add `gasPrice` or transaction `type`.

## 1S.34 Provider Call Projection

For ethers v5.8.0 `provider.call`, 1S.34 derives a separate frozen
seven-field call request from the validated 1S.33 envelope:

- `from`
- `to`
- `data`
- `value`
- `gasLimit`
- `maxFeePerGas`
- `maxPriorityFeePerGas`

`chainId` and `nonce` remain preserved in the authoritative 1S.33
transaction envelope but are deliberately not represented as fields of
the 1S.34 `provider.call` request.

1S.34 also does not add:

- `gasPrice`
- transaction `type`

This distinction is intentional: 1S.34 does not claim that ethers v5
simulates the literal nine-field transaction envelope.

## Simulation Semantics

The injected provider must expose:

`provider.call(transaction)`

1S.34 invokes that capability once with the derived seven-field call
request.

The returned value is simulation return data.

It is **not** a transaction receipt and does not prove that a live
transaction was sent, mined, or will succeed in future state.

Provider failures propagate without being converted into execution
authorization.

## Readiness and Anti-Drift Validation

Before simulation, 1S.34 requires:

- `currentTransactionEnvelopeReady === true`;
- top-level live execution authorization exactly false;
- top-level signer authorization exactly false;
- top-level broadcast authorization exactly false;
- 1S.32 gas-limit-selection readiness true and authorization false;
- 1S.31 gas-estimation readiness true and authorization false;
- 1S.30 current-transaction-parameter readiness true and authorization
  false;
- 1S.29 unsigned-transaction-intent readiness true and authorization
  false.

It also verifies the authoritative upstream identity graph, including:

- gas-limit-selection evidence to gas-estimation evidence;
- gas-estimation evidence to parameter evidence;
- parameter evidence to unsigned transaction intent evidence;
- preserved transaction-intent identity;
- transaction-intent fields against the envelope;
- current parameter fields against the envelope;
- exact selected-gas-limit object identity against the envelope.

A shallow copy of the 1S.32 selection object cannot be given provenance
that the existing object graph does not actually encode. 1S.34
therefore validates the provable nested identities/readiness state
rather than inventing a stronger provenance claim.

## Output

Successful 1S.34 evidence preserves:

- the exact 1S.33 current transaction envelope evidence;
- the exact 1S.33 transaction envelope;
- the frozen seven-field call request;
- the provider simulation return data.

It reports:

`currentTransactionPreSendSimulationReady === true`

and leaves:

- `liveExecutionAuthorized === false`
- `signerAuthorized === false`
- `broadcastAuthorized === false`

## Explicit Non-Ownership

1S.34 does not own or perform:

- provider acquisition;
- RPC URL acquisition;
- environment-secret access;
- private-key access;
- wallet construction;
- signer construction;
- signer authorization;
- transaction signing;
- transaction sending;
- receipt waiting;
- transaction broadcast;
- flashloan execution;
- live execution authorization;
- broadcast authorization;
- nonce reacquisition;
- fee reacquisition;
- gas estimation;
- gas-limit policy or transformation;
- arbitrary gas margins;
- fixed gas buffers;
- historical gas-limit promotion.

Passing 1S.34 tests does not authorize a live transaction.

## Gas Policy Separation

No production rule was introduced from:

- qualification policy gas `700000`;
- historical successful fork receipt gas `652106`;
- archived experimental estimate `827233`;
- archived experimental ratio `12685`;
- arbitrary percentage margin;
- arbitrary multiplier;
- fixed additive buffer.

The 1S.32 rule remains unchanged:

the selected transaction gas limit is the exact validated current
1S.31 `estimatedGasUnits` object.

## Composition Evidence

The focused 1S.34 suite includes a real production composition test
covering:

1. 1S.31 current transaction gas estimation;
2. 1S.32 current transaction gas-limit selection;
3. 1S.33 current transaction envelope construction;
4. 1S.34 current transaction pre-send simulation.

The test uses injected provider doubles only.

It verifies:

- one gas-estimation call;
- one simulation call;
- exact upstream evidence identities;
- exact seven-field call projection;
- deliberate absence of `chainId` and `nonce` from the call request;
- absence of `gasPrice` and transaction `type`;
- frozen 1S.34 call request/output;
- all execution authorization remains false.

No live RPC is used by this composition test.

## Validation

Focused 1S.34:

`13 / 13 PASS`

Affected 1S.27 through 1S.34:

`169 / 169 PASS`

Canonical Node:

`767 / 767 PASS`

Canonical Hardhat:

`29 / 29 PASS`

Canonical runtime:

- Node `v18.20.8`
- npm `10.8.2`
- `.nvmrc` `18.20.8`

Canonical package authority remains:

`npm run test:node`

and:

`npm run test:hardhat`

The Hardhat suite regenerated tracked `artifacts/` and `cache/` data.
Only generated Hardhat churn was restored from HEAD afterward.
No non-generated tracked churn occurred, and the exact 1S.34 source and
test hashes remained unchanged.

## Experimental Gas Tests

The three long-lived experimental gas files remain untracked and are
not part of the 1S.34 implementation commit:

`test/polygonV4GasStateSensitivityProbe.test.js`

SHA-256:

`5c2f95dcce48b1a2346a6ec8c29b61c372d6e2271fa79d9892aa23cb972df6d7`

`test/polygonV4PairedGasMeasurementIntegration.test.js`

SHA-256:

`5b99cc2bf6ddb753960829a94f8928e91f765475187caed0dcf5b337b9e2f139`

`test/polygonV4PairedGasStateSensitivityIntegration.test.js`

SHA-256:

`3155abbaef3d0438e85daf7b79c2f2e200649e3b994d01428e5d765d79190d77`

They must not be silently staged, committed, or promoted into production
policy.

## Safety State

At completion of the implementation validation:

`RPC_USED=NO`

`PRIVATE_KEY_ACCESSED=NO`

`SIGNER_CONSTRUCTED=NO`

`TRANSACTION_EXECUTED=NO`

`FLASHLOAN_EXECUTED=NO`

`LIVE_EXECUTION_AUTHORIZED=NO`

`BROADCAST_AUTHORIZED=NO`

No live transaction or flashloan has been authorized by 1S.34.

## Next Boundary

1S.34 closes the current transaction pre-send simulation evidence
boundary.

Do not infer signer acquisition, transaction signing, sending, or
broadcast from this checkpoint.

Any later live-capable boundary must remain separately gated and must
revalidate the exact current execution state immediately before use.

Before an actual Polygon flashloan send, independently verify at
minimum:

- intended Polygon chain;
- deployed contract and executor addresses;
- deployed code identity;
- exact route and amount identity;
- current candidate qualification;
- current-state preflight evidence;
- caller/owner identity;
- exact unsigned transaction intent;
- current chain ID and pending nonce;
- current EIP-1559 fee evidence;
- current gas estimate;
- selected gas limit;
- complete current transaction envelope;
- successful current pre-send simulation;
- current balances and allowances;
- deadline/freshness constraints;
- current economics and minimum-profit policy;
- explicit signer authorization;
- explicit transaction authorization;
- explicit broadcast authorization.

Signer acquisition, signing, sending, and broadcast remain separate
go/no-go boundaries.

## Recovery

On recovery:

1. verify branch `repair/simulation-safety`;
2. verify implementation commit
   `a8e0e32dc87354970530a69288a7feab9e480b61`;
3. verify the exact source and test SHA-256 values recorded above;
4. verify the three experimental files remain untracked with their exact
   recorded hashes;
5. verify the eventual 1S.34 checkpoint commit is the direct child of
   the implementation commit;
6. verify local/remote lineage before any later push or live-capable
   work;
7. do not interpret readiness evidence as signer or broadcast
   authorization.
