"use strict";

const assert = require("assert");
const { ethers } = require("hardhat");

const {
  runProtectedPeakProviderTimedCadence
} = require(
  "../scripts/research/runPolygonV4ProtectedPeakProviderTimedCadence"
);

const {
  runPreparedExecutionLifecycleComposition
} = require(
  "../scripts/utils/polygonV4PreparedExecutionLifecycleComposition"
);

const {
  buildExecutionReadinessEvidence
} = require(
  "../scripts/utils/polygonV4ExecutionReadinessEvidence"
);

const {
  PROTECTED_QUALIFICATION_RUNTIME_POLICY
} = require(
  "../scripts/utils/polygonV4ProtectedQualificationRuntimePolicy"
);

const {
  HISTORICAL_EXECUTION_GAS_EVIDENCE
} = require(
  "../scripts/utils/polygonV4HistoricalExecutionGasEvidence"
);

const FORK_BLOCK =
  HISTORICAL_EXECUTION_GAS_EVIDENCE
    .observationBlock;

const WPOL =
  HISTORICAL_EXECUTION_GAS_EVIDENCE
    .loanToken;

const START_AMOUNT =
  HISTORICAL_EXECUTION_GAS_EVIDENCE
    .loanAmount;

const HISTORICAL_LEGS =
  HISTORICAL_EXECUTION_GAS_EVIDENCE
    .executionLegs;

const DAI =
  HISTORICAL_LEGS[0].tokenOut;

const APEPE =
  HISTORICAL_LEGS[2].tokenIn;

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)"
];

function requireForkUrl() {
  const value =
    process.env.ALCHEMY_POLYGON;

  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    throw new Error(
      "ALCHEMY_POLYGON is required for controlled fork integration"
    );
  }

  return value;
}

const ENTRY_OUT =
  "14481764747850506";

const V4_OUT =
  "12592522662788687883109";

const FINAL_OUT =
  "141808483715718886";

const HISTORICAL_POOL_KEY = {
  currency0: DAI,
  currency1: APEPE,
  fee: 10000,
  tickSpacing: 100,
  hooks:
    ethers.constants.AddressZero
};

function historicalObservation(blockTag) {
  return {
    status: "QUOTE_OK",
    blockTag,

    startAmount:
      START_AMOUNT.toString(),

    amounts: {
      start:
        START_AMOUNT.toString()
    },

    /*
     * This controlled execution fixture intentionally uses the
     * historically executed WPOL -> DAI V3 fee tier (100).
     *
     * Earlier protected-handoff unit fixtures use fee 500 with
     * the same frozen quote amounts. That fixture is suitable
     * for identity/qualification tests but is not the executable
     * route proven by the historical fork receipt.
     *
     * 1S.24 crosses the execution boundary, so preserve the
     * execution-proven historical route here.
     */
    entry: {
      status: "QUOTE_OK",
      venue: "UNISWAP_V3",
      fee: 100,
      amountOut: ENTRY_OUT
    },

    v4: {
      status: "QUOTE_OK",
      zeroForOne: true,
      poolKey:
        HISTORICAL_POOL_KEY,
      amountOut: V4_OUT
    },

    exit: {
      status: "QUOTE_OK",
      venue: "UNISWAP_V3",
      fee: 100,
      amountOut: FINAL_OUT
    }
  };
}

function stabilityRow(blockTag) {
  return {
    snapshot: {
      blockTag,
      gasPriceWei:
        ethers.utils
          .parseUnits(
            "10",
            "gwei"
          )
          .toString(),
      premiumBps: 5
    },

    quoteOkCount: 3,
    rowCount: 3,
    durationMs: 10,

    bestProtected:
      historicalObservation(
        blockTag
      ),

    peakPosition: "INTERIOR"
  };
}

function historicalCadenceEnvelope() {
  const rows = [
    stabilityRow(
      FORK_BLOCK - 3
    ),
    stabilityRow(
      FORK_BLOCK
    )
  ];

  return {
    complete: true,
    maxCycles: 1,
    completedCycles: 1,
    waitMs: 0,

    cycles: [{
      cycle: 1,

      result: {
        acquisition: {
          complete: true,

          snapshots: [
            rows[0].snapshot,
            rows[1].snapshot
          ]
        },

        stability: {
          snapshots: rows,

          summary: {
            snapshotCount: 2,
            snapshotsWithPeak: 2,

            distinctBestAmounts: [
              START_AMOUNT.toString()
            ],

            interiorPeakCount: 2,
            lowerBoundaryPeakCount: 0,
            upperBoundaryPeakCount: 0
          }
        }
      }
    }]
  };
}

describe(
  "Polygon V4 prepared execution lifecycle controlled-fork integration",
  function () {
    before(function () {
      if (
        process.env.USE_1S24_FORK_LIFECYCLE !==
        "true"
      ) {
        this.skip();
      }

      assert.strictEqual(
        Number(
          process.env
            .POLYGON_FORK_BLOCK || 0
        ),
        FORK_BLOCK,
        "wrong fork block"
      );

      assert(
        process.env.ALCHEMY_POLYGON,
        "ALCHEMY_POLYGON is required"
      );
    });

    it(
      "preserves one prepared execution identity through measurement, fresh qualification, and final controlled-fork simulation",
      async function () {
        const forkUrl =
          requireForkUrl();

        await ethers.provider.send(
          "hardhat_reset",
          [{
            forking: {
              jsonRpcUrl: forkUrl,
              blockNumber: FORK_BLOCK
            }
          }]
        );

        assert.strictEqual(
          await ethers.provider
            .getBlockNumber(),
          FORK_BLOCK
        );

        const [deployer] =
          await ethers.getSigners();

        const Executor =
          await ethers.getContractFactory(
            "PolygonV4CandidateExecutor",
            deployer
          );

        const executor =
          await Executor.deploy();

        await executor.deployed();

        /*
         * 1S.24 intentionally preserves the real timed-cadence
         * envelope while dependency-controlling its historical
         * acquisition result.
         *
         * This fixture proves lifecycle composition against the
         * pinned historical fork. It is not current-market
         * qualification or LIVE_READY evidence.
         */
        /*
         * Authoritative policy/context acquisition identity is
         * intentionally distinct from the mutable controlled-
         * fork provider. Historical acquisition is injected and
         * performs no RPC through this identity token.
         */
        const authoritativeProvider = {};

        const historicalOperationalResult =
          historicalCadenceEnvelope();

        let cadenceDelegations = 0;

        const operationalResult =
          await runProtectedPeakProviderTimedCadence({
            provider:
              authoritativeProvider,
            count: 2,
            minimumBlockGap: 1,
            maxAttempts: 3,
            maxCycles: 1,
            waitMs: 0,

            runCadenceFn:
              async received => {
                cadenceDelegations += 1;

                assert.strictEqual(
                  received.provider,
                  authoritativeProvider
                );

                return historicalOperationalResult;
              },

            waitFn:
              async () => {
                throw new Error(
                  "historical controlled cadence must not wait"
                );
              }
          });

        assert.strictEqual(
          cadenceDelegations,
          1
        );

        assert.strictEqual(
          operationalResult,
          historicalOperationalResult
        );

        const {
          qualification
        } =
          PROTECTED_QUALIFICATION_RUNTIME_POLICY;

        const forkProvenance = {
          method: "hardhat_reset",
          sourceBlock: FORK_BLOCK
        };

        const block =
          await ethers.provider.getBlock(
            FORK_BLOCK
          );

        assert(block);

        /*
         * Preparation and fresh qualification contexts are
         * dependency-controlled to the same historical source
         * block. The immutable deadline remains the one encoded
         * into the exact prepared plan.
         */
        let contextAcquisitions = 0;

        const acquireHistoricalContext =
          async ({
            provider,
            deadlineSeconds
          }) => {
            contextAcquisitions += 1;

            assert.strictEqual(
              provider,
              authoritativeProvider
            );

            assert.strictEqual(
              deadlineSeconds,
              qualification
                .deadlineSeconds
            );

            return {
              policySnapshot: {
                currentBlock:
                  FORK_BLOCK,

                gasPriceWei:
                  ethers.utils
                    .parseUnits(
                      "10",
                      "gwei"
                    ),

                premiumBps: 5
              },

              policyBlockTimestamp:
                block.timestamp,

              deadline:
                block.timestamp +
                deadlineSeconds
            };
          };

        let measurementExecutionPlan =
          null;

        let finalExecutionPlan =
          null;

        const executeExactPlanFn =
          async ({
            executor:
              exactExecutor,
            candidate,
            executionPlan
          }) => {
            assert.strictEqual(
              exactExecutor,
              executor
            );

            assert.strictEqual(
              candidate.blockTag,
              FORK_BLOCK
            );

            assert(
              candidate.amountIn.eq(
                START_AMOUNT
              ),
              "measurement amount mismatch"
            );

            measurementExecutionPlan =
              executionPlan;

            const tx =
              await exactExecutor
                .initiateFlashloan(
                  WPOL,
                  candidate.amountIn,
                  executionPlan
                );

            const receipt =
              await tx.wait();

            assert.strictEqual(
              receipt.status,
              1,
              "measurement fork execution failed"
            );

            return {
              receipt
            };
          };

        const executeExactQualifiedPlanFn =
          async context => {
            const reverted =
              await ethers.provider.send(
                "evm_revert",
                [preMeasurementSnapshot]
              );

            assert.strictEqual(
              reverted,
              true,
              "pre-measurement fork snapshot revert failed"
            );

            assert.strictEqual(
              context.candidate.blockTag,
              FORK_BLOCK
            );

            assert(
              context.candidate
                .amountIn.eq(
                  START_AMOUNT
                ),
              "final amount mismatch"
            );

            assert.strictEqual(
              context.executionPlan,
              measurementExecutionPlan,
              "final simulation reconstructed execution plan"
            );

            finalExecutionPlan =
              context.executionPlan;

            const wpol =
              new ethers.Contract(
                WPOL,
                ERC20_ABI,
                ethers.provider
              );

            const startingBalance =
              await wpol.balanceOf(
                executor.address
              );

            /*
             * Measurement state has been reverted. Final
             * simulation therefore starts from the same
             * pre-measurement controlled-fork state.
             */
            const tx =
              await executor
                .initiateFlashloan(
                  WPOL,
                  context.candidate
                    .amountIn,
                  context.executionPlan
                );

            const receipt =
              await tx.wait();

            assert.strictEqual(
              receipt.status,
              1,
              "final fork execution failed"
            );

            const amount =
              await executor.lastAmount();

            const premium =
              await executor.lastPremium();

            const routeOutput =
              await executor
                .lastRouteOutput();

            const debt =
              await executor.lastDebt();

            const profit =
              await executor
                .lastProfitBeforeRepayment();

            const endingBalance =
              await wpol.balanceOf(
                executor.address
              );

            assert(
              amount.eq(
                START_AMOUNT
              ),
              "executed amount mismatch"
            );

            assert(
              debt.eq(
                amount.add(premium)
              ),
              "debt != amount + premium"
            );

            assert(
              routeOutput.gte(debt),
              "route output does not cover debt"
            );

            assert(
              profit.eq(
                routeOutput.sub(debt)
              ),
              "profit accounting mismatch"
            );

            assert(
              profit.gte(
                qualification
                  .minimumNetProfitWei
              ),
              "profit below preserved minimum"
            );

            assert(
              endingBalance.eq(
                startingBalance.add(
                  profit
                )
              ),
              "retained WPOL delta mismatch"
            );

            const dai =
              new ethers.Contract(
                DAI,
                ERC20_ABI,
                ethers.provider
              );

            const apepe =
              new ethers.Contract(
                APEPE,
                ERC20_ABI,
                ethers.provider
              );

            const aavePool =
              await executor.AAVE_POOL();

            const v3Router =
              await executor.V3_ROUTER();

            const permit2 =
              await executor.PERMIT2();

            const aaveAllowance =
              await wpol.allowance(
                executor.address,
                aavePool
              );

            const wpolV3Allowance =
              await wpol.allowance(
                executor.address,
                v3Router
              );

            const daiPermit2Allowance =
              await dai.allowance(
                executor.address,
                permit2
              );

            const apepeV3Allowance =
              await apepe.allowance(
                executor.address,
                v3Router
              );

            assert(
              aaveAllowance.isZero(),
              "Aave repayment allowance remains"
            );

            assert(
              wpolV3Allowance.isZero(),
              "WPOL V3 allowance remains"
            );

            assert(
              daiPermit2Allowance.isZero(),
              "DAI Permit2 token allowance remains"
            );

            assert(
              apepeV3Allowance.isZero(),
              "APEPE V3 allowance remains"
            );

            assert(
              receipt.gasUsed.gt(0),
              "final receipt gasUsed must be positive"
            );

            return {
              receipt,
              amount,
              premium,
              routeOutput,
              debt,
              profit,
              startingBalance,
              endingBalance
            };
          };

        /*
         * Measurement executes the exact prepared plan and
         * mutates fork state. Preserve the pre-measurement
         * controlled-fork state so final simulation evaluates
         * the same prepared opportunity independently.
         */
        const preMeasurementSnapshot =
          await ethers.provider.send(
            "evm_snapshot",
            []
          );

        const result =
          await runPreparedExecutionLifecycleComposition({
            provider:
              authoritativeProvider,

            operationalResult,

            startToken: WPOL,
            entryToken: DAI,
            exitToken: APEPE,

            slippageBps:
              qualification
                .slippageBps,

            maxSlippageBps:
              qualification
                .maxSlippageBps,

            maxAgeBlocks:
              qualification
                .maxAgeBlocks,

            deadlineSeconds:
              qualification
                .deadlineSeconds,

            minimumNetProfitWei:
              qualification
                .minimumNetProfitWei,

            safetyReserveWei:
              qualification
                .safetyReserveWei,

            forkProvider:
              ethers.provider,

            executor,
            forkProvenance,

            executeExactPlanFn,
            executeExactQualifiedPlanFn,

            acquirePreparationExecutionContextFn:
              acquireHistoricalContext,

            acquireQualificationExecutionContextFn:
              acquireHistoricalContext
          });

        assert.strictEqual(
          contextAcquisitions,
          2,
          "expected preparation and fresh qualification contexts"
        );

        assert(
          result.preparedExecutionContext,
          "prepared execution context missing"
        );

        assert.strictEqual(
          result
            .preparedExecutionContext
            .candidate
            .blockTag,
          FORK_BLOCK
        );

        assert(
          result
            .preparedExecutionContext
            .candidate
            .amountIn
            .eq(
              START_AMOUNT
            ),
          "prepared amount mismatch"
        );

        assert.strictEqual(
          result
            .preparedExecutionContext
            .executionPlan,
          measurementExecutionPlan,
          "measurement did not consume exact prepared plan"
        );

        assert(
          result.gasEvidence,
          "gas evidence missing"
        );

        assert.strictEqual(
          result.gasEvidence
            .observationBlock,
          FORK_BLOCK
        );

        assert(
          result.gasEvidence
            .gasUnits.gt(0),
          "measured gas must be positive"
        );

        assert(
          result.qualifiedContext,
          "qualified context missing"
        );

        assert.strictEqual(
          result
            .qualifiedContext
            .qualificationResult
            .qualified,
          true,
          "historical lifecycle did not qualify"
        );

        assert.strictEqual(
          result
            .qualifiedContext
            .executionPlan,
          measurementExecutionPlan,
          "qualification reconstructed execution plan"
        );

        assert.strictEqual(
          finalExecutionPlan,
          measurementExecutionPlan,
          "final simulation did not preserve measured plan"
        );

        assert(
          result.simulationResult,
          "final simulation missing"
        );

        assert(
          result
            .simulationResult
            .simulationResult
            .receipt
            .gasUsed
            .gt(0),
          "final simulation receipt gas missing"
        );

        /*
         * Historical fork lifecycle -> production readiness integration.
         *
         * This proves evidence lineage only. The controlled Hardhat fork
         * is not current Polygon chain state, and no live execution is
         * authorized by this test.
         */
        const readinessEvidence =
          buildExecutionReadinessEvidence({
            lifecycleResult: result
          });

        assert.strictEqual(
          readinessEvidence.executionEvidenceReady,
          true,
          "genuine historical lifecycle did not produce readiness evidence"
        );

        assert.strictEqual(
          readinessEvidence.lifecycleResult,
          result,
          "readiness reconstructed the lifecycle result"
        );

        assert.strictEqual(
          readinessEvidence.preparedExecutionContext,
          result.preparedExecutionContext,
          "readiness reconstructed the prepared execution context"
        );

        assert.strictEqual(
          readinessEvidence.executionPlan,
          measurementExecutionPlan,
          "readiness reconstructed the measured execution plan"
        );

        assert.strictEqual(
          readinessEvidence.gasEvidence,
          result.gasEvidence,
          "readiness reconstructed the measured gas evidence"
        );

        assert.strictEqual(
          readinessEvidence.qualificationPolicySnapshot,
          result.qualificationPolicySnapshot,
          "readiness reconstructed the qualification policy"
        );

        assert.strictEqual(
          readinessEvidence.qualifiedContext,
          result.qualifiedContext,
          "readiness reconstructed the qualified context"
        );

        assert.strictEqual(
          readinessEvidence.simulationResult,
          result.simulationResult,
          "readiness reconstructed the final simulation wrapper"
        );

        assert.strictEqual(
          readinessEvidence.receipt,
          result.simulationResult.simulationResult.receipt,
          "readiness reconstructed the final simulation receipt"
        );

        assert.strictEqual(
          readinessEvidence.receipt.status,
          1,
          "historical final simulation receipt was unsuccessful"
        );

        assert.strictEqual(
          readinessEvidence.liveExecutionAuthorized,
          false,
          "historical evidence must not authorize live execution"
        );

        assert.strictEqual(
          readinessEvidence.signerAuthorized,
          false,
          "historical evidence must not authorize signing"
        );

        assert.strictEqual(
          readinessEvidence.broadcastAuthorized,
          false,
          "historical evidence must not authorize broadcasting"
        );

        /*
         * Validate the measured executor identity against the actual
         * executor deployed inside the controlled historical fork.
         */
        assert.strictEqual(
          result.gasEvidence.executorContext.executorAddress.toLowerCase(),
          executor.address.toLowerCase(),
          "measured executor address differs from fork deployment"
        );

        const deployedRuntimeCode =
          await ethers.provider.getCode(executor.address);

        assert.notStrictEqual(
          deployedRuntimeCode,
          "0x",
          "historical executor runtime bytecode missing"
        );

        assert.strictEqual(
          result.gasEvidence.executorContext.executorCodeHash.toLowerCase(),
          ethers.utils.keccak256(deployedRuntimeCode).toLowerCase(),
          "measured executor code hash differs from fork deployment"
        );

        const deployedExecutorOwner =
          await executor.owner();

        assert.strictEqual(
          deployedExecutorOwner.toLowerCase(),
          (await deployer.getAddress()).toLowerCase(),
          "historical executor owner differs from deployment signer"
        );
      }
    );
  }
);
