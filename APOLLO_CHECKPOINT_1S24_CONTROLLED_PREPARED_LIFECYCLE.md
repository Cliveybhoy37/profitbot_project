# Apollo Checkpoint — 1S.24 Controlled Prepared Execution Lifecycle Integration

## Status

1S.24 implementation is complete and regression-closed.

This milestone is controlled-fork integration evidence only.

It is **not** LIVE_READY evidence and does **not** authorize a live signer,
live transaction, or broadcast.

## Implementation

Implementation commit:

`1301eec2c50b4acded53bef80a7dcce842a9accc`

Implementation file:

`test/polygonV4PreparedExecutionLifecycleIntegration.test.js`

Reviewed implementation SHA-256:

`09081f67ef5d81af97654197bdbf303343900b530e07512652d560c5224a8235`

Parent / pre-1S.24 checkpoint:

`438de934b5df8028187ccf2a1875c1f8791e97a6`

## Objective Proven

1S.24 proves controlled composition of the prepared execution lifecycle across:

1. protected timed-cadence operational evidence;
2. preparation execution context;
3. one exact prepared execution plan;
4. controlled-fork execution measurement of that exact plan;
5. fresh authoritative qualification context;
6. qualification of the unchanged prepared plan using measured gas evidence;
7. final controlled-fork simulation of the exact qualified execution identity.

## Historical Controlled Fixture

The integration uses the pinned historical execution fixture and fork block.

It is deterministic historical evidence.

It is not fresh current-market qualification.

The executable historical entry route uses the execution-proven
Uniswap V3 fee tier `100`.

The historical protected-handoff unit fixture using fee tier `500`
remains suitable for its existing identity/qualification tests but is
not substituted for the execution-proven route in 1S.24.

## Provider Ownership Boundary

1S.24 explicitly separates provider identities.

`authoritativeProvider` is the dependency-controlled identity supplied to:

- protected timed cadence;
- preparation execution-context acquisition;
- fresh qualification execution-context acquisition.

The mutable controlled Hardhat provider remains the `forkProvider` used for:

- `hardhat_reset`;
- local Hardhat signer/deployment;
- exact-plan fork measurement;
- controlled final simulation;
- controlled snapshot/revert.

The authoritative provider is not reset.

No production provider construction is added by this milestone.

## Controlled Fork State Isolation

Exact-plan gas measurement mutates fork state.

The integration therefore takes an `evm_snapshot` immediately before the
lifecycle begins.

After successful qualification and immediately before final controlled
simulation, the test performs `evm_revert` to that snapshot.

This makes measurement and final simulation independent executions from
the same pre-measurement controlled-fork state.

The final simulation does not rely on profit or token state retained by
the measurement transaction.

## Gas Boundary

No explicit transaction `gasLimit` workaround is present in the committed
milestone.

The earlier diagnostic explicit-gas experiment was not retained.

Gas evidence is produced from the exact prepared-plan controlled-fork
receipt through the existing lifecycle dependency boundary.

Conservative policy gas and exact execution gas evidence remain distinct.

## Execution Identity

The integration asserts preservation of the exact prepared execution plan
through:

- measurement;
- qualification;
- final simulation.

The lifecycle result shape is intentionally nested:

`result.simulationResult.simulationResult.receipt`

The outer simulation result is the 1S.20 controlled-fork wrapper and its
inner `simulationResult` is the injected final execution callback result.

## Final Simulation Assertions

The controlled final simulation verifies:

- exact loan amount;
- exact preserved execution plan;
- successful receipt;
- debt equals amount plus Aave premium;
- route output covers debt;
- profit accounting equals route output minus debt;
- profit meets preserved minimum;
- retained WPOL delta equals incremental profit;
- Aave repayment allowance is cleared;
- WPOL V3 allowance is cleared;
- DAI Permit2 token allowance is cleared;
- APEPE V3 allowance is cleared;
- receipt gas used is positive.

## Test Evidence

Focused 1S.24 controlled-fork integration:

`1/1 PASS`

Affected 1S.20–1S.23 composition tests:

`24/24 PASS`

Canonical Node suite:

`581/581 PASS`

Canonical Hardhat suite:

`29/29 PASS`

Final implementation review:

`ONE_S24_FINAL_IMPLEMENTATION_REVIEW=PASS`

Implementation commit verification:

`ONE_S24_IMPLEMENTATION_COMMIT=PASS`

## Safety Boundary

No live-network transaction was performed.

No live signer was used.

No live broadcast was performed.

No production execution helper was modified.

No `ProfitBot.sol` modification was made.

No `ThreeLegExecution` modification was made.

No frontend or MetaMask modification was made.

No deployment address modification was made.

No `.env` credential or secret is recorded here.

No HP/Bugs observer configuration was modified.

## Next Boundary

Before any live-capable execution work, independently verify current:

- chain identity;
- deployed executor and protocol addresses;
- exact route and amount identity;
- current policy/economics;
- current gas evidence;
- current Aave premium;
- immutable execution-plan binding;
- deadline and freshness;
- allowances and balances;
- simulation/preflight;
- signer/account identity;
- transaction parameters.

Live signer and broadcast authorization remain separate explicit
go/no-go boundaries.

## Repository State at Checkpoint Creation

Branch:

`repair/simulation-safety`

1S.24 implementation commit:

`1301eec2c50b4acded53bef80a7dcce842a9accc`

Remote was intentionally still at:

`438de934b5df8028187ccf2a1875c1f8791e97a6`

The checkpoint should be committed separately before any push.
