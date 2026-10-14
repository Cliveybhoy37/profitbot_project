# Apollo Checkpoint — Polygon V4 Paired Gas / State Sensitivity

Date: 2026-10-12
Branch: repair/simulation-safety
Status: HISTORICAL FORK EXPERIMENT COMPLETED / NOT LIVE READY

## Objective

Measure whether the initial storage state of the Polygon V4 candidate
executor changes flashloan receipt gas while holding execution inputs
and observable execution outcomes constant.

This is supplementary experimental evidence, separate from the
canonical 1S pipeline and original 1S.8 receipt evidence.

## Environment

- Original repository: /workspaces/profitbot_project
- Isolated Hardhat workspace: /tmp/apollo-177x-hardhat-joD7jCy3
- Hardhat version: 2.24.3
- Solidity compiler: 0.8.20+commit.a1b79de6
- Network: isolated Hardhat historical Polygon fork
- Historical source block: 94709817
- Fork initialization: hardhat_reset with historical RPC and block number
- No Polygon mainnet transaction was broadcast
- No original tracked files were modified during measurement

The isolated workspace path may not survive a Codespaces restart.
The original repository and git history are the durable recovery sources.

## Historical Execution

- Flashloan amount: 0.125 WPOL
- Route: Uniswap V3 WPOL -> DAI;
  Uniswap V4 DAI -> APEPE;
  Uniswap V3 APEPE -> WPOL
- Slippage: 50 bps
- Minimum profit: 0.005 WPOL
- Historical route output: 0.141808483715718886 WPOL
- Historical flashloan premium: 0.0000625 WPOL
- Historical debt: 0.1250625 WPOL
- Profit before transaction gas: 0.016745983715718886 WPOL

## Compiler-Verified Executor Storage Layout

| Variable | Slot | Type |
| --- | ---: | --- |
| lastAmount | 0 | uint256 |
| lastPremium | 1 | uint256 |
| lastRouteOutput | 2 | uint256 |
| lastDebt | 3 | uint256 |
| lastProfitBeforeRepayment | 4 | uint256 |

The layout was obtained using the original compiler version and
original compiler input, requesting storageLayout in memory only.

Static runtime-bytecode inspection identified five SSTORE instructions.
This does not establish individual executed opcode gas costs.

## Paired Experiment

Both runs independently reset the isolated historical fork and
deployed a fresh executor.

State A:
- Initial lastAmount (slot 0): 0
- Successful flashloan receipt gas: 652106

State B:
- Initial lastAmount (slot 0): 1
- Storage intervention: hardhat_setStorageAt on the freshly deployed
  executor in the isolated Hardhat provider only
- Successful flashloan receipt gas: 635006

Measured difference:
- State A minus State B: 17100 gas
- State B receipt gas approximately 2.62% lower

The storage intervention was explicitly authorized for this isolated
experiment. Its setup cost was excluded from the measured flashloan
receipt gas.

## Verified Execution Identity

Both successful runs reported:

- Fork source block: 94709817
- Executor address: 0x854dfec83EC9E75E2aF37074A927b4f23A9D9A9d
- Sender: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
- Execution plan hash:
  0xf3dddb908db797d2732935ea25dfb48215c98ef85587ac012c2ba1093b94e009
- Executor runtime code hash:
  0x347dca910e2d4b7dd6b4ba19151fc2cd28e33c268cbb38511169a0b4a753facc
- Deadline: 1790770167
- Local transaction block: 94709819
- Receipt status: 1

Both runs reported identical final executor values:

- lastAmount: 125000000000000000
- lastPremium: 62500000000000
- lastRouteOutput: 141808483715718886
- lastDebt: 125062500000000000
- lastProfitBeforeRepayment: 16745983715718886

The original 1S.8 historical receipt also measured 652106 gas.
That canonical evidence remains unchanged.

## Historical Break-Even Gas Prices

Using historical profit before transaction gas of
16745983715718886 wei:

| Gas basis | Gas units | Break-even effective gas price |
| --- | ---: | ---: |
| State A | 652106 | 25.679849 gwei |
| State B experimental | 635006 | 26.371379 gwei |
| Conservative policy | 700000 | 23.922834 gwei |

These are historical arithmetic thresholds, not current Polygon
gas quotations or proof of live profitability.

## Interpretation and Limitations

- The measured difference is consistent with EVM storage-state gas
  accounting, but no transaction opcode trace was captured.
- State B used artificially initialized storage. The cost of reaching
  that state is not included in the receipt comparison.
- One successful A/B pair was measured; broader repeatability was
  not established.
- Identical plan hashes, runtime code hashes, sender, executor address,
  deadline, receipt block and final result variables were observed.
- Historical route profitability does not establish current executable
  liquidity, prices, gas conditions or live net profit.
- Do not substitute the experimental 635006-gas result for a current
  transaction gas estimate.

## Protected Boundaries

- NOT LIVE READY.
- No mainnet broadcast, deployment, or live flashloan authorized.
- Existing conservative policy gas: 700000; unchanged.
- Canonical 1S.31 estimateGas and 1S.32 exact gas-limit selection:
  unchanged.
- Canonical 1S.72–1S.75 authorization composition: unchanged.
- No changes to production Solidity or canonical tests.
- The following untracked unfinished files are protected and must not
  be read, modified, deleted, copied, staged or executed without
  separate explicit permission:
  - test/polygonV4GasStateSensitivityProbe.test.js
  - test/polygonV4PairedGasMeasurementIntegration.test.js
  - test/polygonV4PairedGasStateSensitivityIntegration.test.js
- The separate untracked file named '=' is also untouched.

## Repository Verification

After the paired experiment, git status --short showed only the
three protected untracked tests and the separate untracked '=' file.

Both git diff --exit-code and git diff --cached --exit-code passed,
confirming no tracked working-tree or staged changes at that time.

This checkpoint is a newly created, separate file and should be
reviewed before any optional staging, commit or push.

## Recovery / Next Steps

1. Read this checkpoint alongside APOLLO_CHECKPOINT_1S8.md and
   APOLLO_CHECKPOINT_1S72_1S75.md.
2. Verify git status and recent git history before resuming.
3. Preserve the canonical 1S pipeline and protected experiments.
4. Consider repeated isolated A/B measurements and opcode tracing
   only with appropriate controls and authorization.
5. Require fresh profitability evidence and all established safety
   and authorization gates before considering live execution.

Never store private keys, seed phrases, passwords, RPC URLs or other
credentials in checkpoint files.
