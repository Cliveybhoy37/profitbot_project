"use strict";

const assert = require("assert");
const { ethers } = require("hardhat");

const {
  qualifyAndPreserveExecutionContext
} = require(
  "../scripts/utils/polygonV4QualifiedExecutionContext"
);

const {
  runQualifiedExecutionForkSimulation
} = require(
  "../scripts/utils/polygonV4QualifiedExecutionForkSimulation"
);

const {
  HISTORICAL_EXECUTION_GAS_EVIDENCE
} = require(
  "../scripts/utils/polygonV4HistoricalExecutionGasEvidence"
);

const {
  encodeV4ExecutionPlan
} = require(
  "../scripts/utils/polygonV4ExecutionRoute"
);

const FORK_BLOCK =
  HISTORICAL_EXECUTION_GAS_EVIDENCE.observationBlock;

const WPOL =
  HISTORICAL_EXECUTION_GAS_EVIDENCE.loanToken;

const START_AMOUNT =
  HISTORICAL_EXECUTION_GAS_EVIDENCE.loanAmount;

const EXECUTION_LEGS =
  HISTORICAL_EXECUTION_GAS_EVIDENCE.executionLegs;

const DEADLINE =
  HISTORICAL_EXECUTION_GAS_EVIDENCE.executionDeadline;

const MINIMUM_PROFIT =
  HISTORICAL_EXECUTION_GAS_EVIDENCE.minimumProfit;

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)"
];

function requireForkUrl() {
  const value = process.env.ALCHEMY_POLYGON;

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

describe(
  "Polygon V4 qualified execution controlled-fork simulation",
  function () {
    before(function () {
      if (
        process.env.USE_1S20_FORK_SIMULATION !==
        "true"
      ) {
        this.skip();
      }

      assert.strictEqual(
        Number(
          process.env.POLYGON_FORK_BLOCK || 0
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
      "executes the exact execution plan preserved by successful qualification on its controlled Polygon fork",
      async function () {
        const forkUrl = requireForkUrl();

    await ethers.provider.send(
      "hardhat_reset",
      [{
        forking: {
          jsonRpcUrl: forkUrl,
          blockNumber: FORK_BLOCK
        }
      }]
    );

    assert.equal(
      await ethers.provider.getBlockNumber(),
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
     * Historical inputs enter the qualification/composition boundary here.
     *
     * The encoded execution plan created inside this boundary is then
     * preserved by 1S.19. The final-simulation layer below must consume
     * that returned plan directly and must not reconstruct it.
     */

    const handoff = {
      observation: {
        blockTag: FORK_BLOCK
      }
    };

    const candidate = {
      blockTag: FORK_BLOCK,
      loanToken: WPOL,
      loanAmount: START_AMOUNT,
      legs: EXECUTION_LEGS
    };

    const policySnapshot = Object.freeze({
      integrationFixture:
        "historical-controlled-fork"
    });

    const qualificationResult = {
      qualified: true,
      stage: "QUALIFIED"
    };

    let encodedInsideQualification = null;
    let planReceivedByQualification = null;

    const qualifiedContext =
      await qualifyAndPreserveExecutionContext({
        provider: ethers.provider,
        operationalResult: {
          integrationFixture:
            "historical-controlled-fork"
        },
        startToken: WPOL,
        entryToken:
          EXECUTION_LEGS[0].tokenOut,
        exitToken:
          EXECUTION_LEGS[2].tokenIn,
        slippageBps: 50,
        maxSlippageBps: 100,
        maxAgeBlocks: 3,
        deadline: DEADLINE,
        gasEvidence:
          HISTORICAL_EXECUTION_GAS_EVIDENCE,
        safetyReserveWei:
          ethers.utils.parseEther("0.001"),
        minimumNetProfitWei:
          MINIMUM_PROFIT,
        policySnapshot,

        selectProtectedPeakHandoffFn:
          () => handoff,

        buildObservedCandidateFn:
          () => candidate,

        buildV4ExecutionLegsFn:
          () => EXECUTION_LEGS,

        encodeV4ExecutionPlanFn:
          args => {
            encodedInsideQualification =
              encodeV4ExecutionPlan(args);

            return encodedInsideQualification;
          },

        qualifyGasEvidenceProtectedPeakHandoffFn:
          async args => {
            planReceivedByQualification =
              args.executionPlan;

            assert.strictEqual(
              args.policySnapshot,
              policySnapshot
            );

            assert.strictEqual(
              args.gasEvidence,
              HISTORICAL_EXECUTION_GAS_EVIDENCE
            );

            return qualificationResult;
          }
      });

    assert.strictEqual(
      qualifiedContext.qualificationResult,
      qualificationResult
    );

    assert.strictEqual(
      qualifiedContext.candidate,
      candidate
    );

    assert.strictEqual(
      qualifiedContext.executionLegs,
      EXECUTION_LEGS
    );

    assert.strictEqual(
      qualifiedContext.executionPlan,
      encodedInsideQualification
    );

    assert.strictEqual(
      qualifiedContext.executionPlan,
      planReceivedByQualification
    );

    assert.strictEqual(
      qualifiedContext.policySnapshot,
      policySnapshot
    );

    assert.strictEqual(
      qualifiedContext.gasEvidence,
      HISTORICAL_EXECUTION_GAS_EVIDENCE
    );

    const preservedExecutionPlan =
      qualifiedContext.executionPlan;

    const expectedPlanHash =
      ethers.utils.keccak256(
        preservedExecutionPlan
      );

    assert.equal(
      expectedPlanHash,
      HISTORICAL_EXECUTION_GAS_EVIDENCE
        .executionPlanHash
    );

    const forkProvenance = {
      method: "hardhat_reset",
      sourceBlock: FORK_BLOCK
    };

    let delegated = null;

    const result =
      await runQualifiedExecutionForkSimulation({
        qualifiedContext,
        forkProvenance,

        executeExactQualifiedPlanFn:
          async context => {
            delegated = context;

            assert.strictEqual(
              context.qualifiedContext,
              undefined
            );

            assert.strictEqual(
              context.qualificationResult,
              qualificationResult
            );

            assert.strictEqual(
              context.candidate,
              candidate
            );

            assert.strictEqual(
              context.executionLegs,
              EXECUTION_LEGS
            );

            assert.strictEqual(
              context.executionPlan,
              preservedExecutionPlan
            );

            assert.strictEqual(
              context.policySnapshot,
              policySnapshot
            );

            assert.strictEqual(
              context.gasEvidence,
              HISTORICAL_EXECUTION_GAS_EVIDENCE
            );

            assert.strictEqual(
              context.forkProvenance,
              forkProvenance
            );

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

            assert(
              startingBalance.isZero(),
              "executor unexpectedly pre-funded"
            );

            const tx =
              await executor.initiateFlashloan(
                WPOL,
                START_AMOUNT,
                context.executionPlan
              );

            const receipt =
              await tx.wait();

            assert.equal(
              receipt.status,
              1
            );

            const amount =
              await executor.lastAmount();

            const premium =
              await executor.lastPremium();

            const routeOutput =
              await executor.lastRouteOutput();

            const debt =
              await executor.lastDebt();

            const profit =
              await executor
                .lastProfitBeforeRepayment();

            const retainedBalance =
              await wpol.balanceOf(
                executor.address
              );

            const dai =
              new ethers.Contract(
                EXECUTION_LEGS[1].tokenIn,
                ERC20_ABI,
                ethers.provider
              );

            const apepe =
              new ethers.Contract(
                EXECUTION_LEGS[2].tokenIn,
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
              amount.eq(START_AMOUNT),
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
              profit.gte(MINIMUM_PROFIT),
              "profit below preserved minimum"
            );

            assert(
              retainedBalance.eq(profit),
              "retained WPOL mismatch"
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
              "receipt gasUsed must be positive"
            );

            return {
              receipt,
              amount,
              premium,
              routeOutput,
              debt,
              profit,
              retainedBalance,
              aaveAllowance,
              wpolV3Allowance,
              daiPermit2Allowance,
              apepeV3Allowance
            };
          }
      });

    assert(delegated);

    assert.strictEqual(
      result.qualifiedContext,
      qualifiedContext
    );

    assert.strictEqual(
      result.forkProvenance,
      forkProvenance
    );

    assert.strictEqual(
      delegated.executionPlan,
      qualifiedContext.executionPlan
    );

    assert(
      result.simulationResult.receipt.gasUsed.gt(0)
    );

    /*
     * Final simulation evidence remains semantically distinct from the
     * qualification gas evidence preserved by 1S.19.
     */
    assert.notStrictEqual(
      result.simulationResult,
      qualifiedContext.gasEvidence
    );
      }
    );
  }
);
