# Apollo ProfitBot Checkpoint — 2026-09-30

## Safe State
- Repo: `/workspaces/profitbot_project`
- Branch: `repair/simulation-safety`
- Live execution: OFF
- ProfitBot known-good build: UNCHANGED
- Working tree was clean immediately before this checkpoint.
- Existing regression baseline: 160/160 PASS.
- V4 remains RESEARCH ONLY; ProfitBot has no V4 execution integration.
- Native POL V4 markets remain quarantined from the current WPOL-based architecture.

## Corrected Polygon V4 Research Result
Pinned block: `94684210`
Discovery range: `94184211 -> 94684210`

- Initialize events: 234
- Verified V4 PoolIds: 234
- Active V4 pools: 138
- StateView failures: 0
- Non-native structural candidates: 27
- Native-POL candidates quarantined: 11
- V4 quote passes: 1030
- V4 quote failures: 386
- Complete exact-three-leg routes: 1170
- Gross-positive routes: 0

Conclusion:
No gross-positive exact-three-leg candidate was found in this screen.

## Critical V4Quoter Fix
The previous 0-pass / 1488-failure economics run was INVALID because the
V4Quoter ABI used the wrong call shape.

Correct V4Quoter uses ONE struct parameter:

`quoteExactInputSingle(QuoteExactSingleParams params)`

The corrected ABI/call was independently proven against WPAY/WETH and then
used successfully in the completed bulk screen above.

Therefore the corrected 1030-pass / 1170-route screen supersedes the earlier
broken-ABI economics result.

## Best Research Candidate
V4 WETH/USDT0

PoolId:
`0x429e60d564e16b246d82f5cc44e7db043f870b3d6407f7362c509f1bd1a8f3e0`

Pool:
- fee: 75
- tickSpacing: 1
- hooks: zero address

Best observed route:
- Start: WPOL 1
- Topology: UNISWAP_V3 -> V4 -> UNISWAP_V3
- V4 direction: USDT0 -> WETH
- Gross: -4.15 bps

Other observations:
- WPOL 10: -6.28 bps
- USDC 1: -6.37 bps
- USDC_E 1: -6.61 bps
- WPOL 100: -11.18 bps

Known Polygon Aave flashloan premium: 5 bps.

The best -4.15 bps observation therefore still fails before gas once the
Aave premium is considered. No execution/integration action is justified.

## Next Research Step
Do NOT repeat the full 500k-block scan first.

Run a focused read-only WETH/USDT0 size-resolution probe:
1. Pin the block.
2. Preserve UNISWAP_V3 -> V4 -> UNISWAP_V3.
3. Expose exact V3 fee tiers/pools selected.
4. Test finer sizes below and around WPOL 1.
5. Determine whether gross economics remain negative, approach zero,
   or cross gross-positive.
6. Only if gross-positive: test size persistence -> Aave 5 bps -> gas ->
   simulation/safety.

## Scanner Engineering Follow-Up
After the focused probe, build a resumable/checkpointed research scanner.

Requirements:
- stage-level resume
- pinned-block metadata
- persistent discovery/candidate results
- safe quote caching where appropriate
- no signer or transactions
- no credentials in checkpoint files
- strict separation from ProfitBot execution code
- Codespaces restart must not require repeating completed research stages

## Recovery After Restart
Run:

`git status --short`
`git --no-pager log --oneline -8`
`git branch --show-current`

Expected branch: `repair/simulation-safety`

Do not use broad `git reset --hard` or `git clean`.

RPC shell exports are transient and may need to be restored after a
Codespaces restart.

## Security
Never store private keys, seed phrases, RPC API keys, passwords, Infura
credentials, Alchemy credentials, or other secrets in this checkpoint.

The previously exposed Infura API credential should be rotated/revoked
before operational use.

## Resume Point
Corrected Polygon V4 discovery and quoting are operational.

At block 94684210:
- 1170 complete exact-three-leg routes were evaluated.
- 0 were gross-positive.
- WETH/USDT0 at -4.15 bps was nearest to zero.

ProfitBot remains unchanged.
Live execution remains OFF.
