const assert = require("assert");
const { ethers } = require("hardhat");

const {
  WPOL,
  DAI,
  APEPE
} = require(
  "../scripts/research/runPolygonV4LiveQualification"
);

const {
  buildV4ExecutionLegs,
  encodeV4ExecutionPlan
} = require(
  "../scripts/utils/polygonV4ExecutionRoute"
);

const {
  produceForkReceiptGasEvidence
} = require(
  "../scripts/utils/polygonV4ForkReceiptGasEvidenceProducer"
);

describe(
  "Polygon V4 controlled fork receipt gas evidence",
  function () {
    const FORK_BLOCK = 94709817;

    const START =
      ethers.BigNumber.from(
        "125000000000000000"
      );

    const EXPECTED_ROUTE_OUTPUT =
      ethers.BigNumber.from(
        "141808483715718886"
      );

    before(function () {
      if (
        process.env.USE_1S8_FORK_RECEIPT !==
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

    beforeEach(async function () {
      await ethers.provider.send(
        "hardhat_reset",
        [
          {
            forking: {
              jsonRpcUrl:
                process.env.ALCHEMY_POLYGON,
              blockNumber:
                FORK_BLOCK
            }
          }
        ]
      );
    });

    it(
      "produces exact gas evidence from the protected historical execution receipt",
      async function () {
        const Executor =
          await ethers.getContractFactory(
            "PolygonV4CandidateExecutor"
          );

        const executor =
          await Executor.deploy();

        await executor.deployed();

        const observedCandidate = [
          {
            venue: "UNISWAP_V3",
            tokenIn: WPOL,
            tokenOut: DAI,
            amountOut:
              ethers.BigNumber.from(
                "14481764747850506"
              ),
            fee: 100
          },
          {
            venue: "UNISWAP_V4",
            tokenIn: DAI,
            tokenOut: APEPE,
            amountOut:
              ethers.BigNumber.from(
                "12592522662788687883109"
              ),
            poolKey: {
              currency0: DAI,
              currency1: APEPE,
              fee: 10000,
              tickSpacing: 100,
              hooks:
                ethers.constants.AddressZero
            },
            zeroForOne: true
          },
          {
            venue: "UNISWAP_V3",
            tokenIn: APEPE,
            tokenOut: WPOL,
            amountOut:
              EXPECTED_ROUTE_OUTPUT,
            fee: 100
          }
        ];

        const executionLegs =
          buildV4ExecutionLegs(
            observedCandidate,
            50
          );

        const latestBlock =
          await ethers.provider.getBlock(
            "latest"
          );

        const deadline =
          latestBlock.timestamp + 300;

        const minimumProfit =
          ethers.utils.parseEther(
            "0.005"
          );

        const executionPlan =
          encodeV4ExecutionPlan({
            legs: executionLegs,
            deadline,
            minimumProfit
          });

        const candidate = {
          blockTag: FORK_BLOCK,
          amountIn: START
        };

        const evidence =
          await produceForkReceiptGasEvidence({
            provider: ethers.provider,
            executor,
            candidate,
            executionLegs,
            executionPlan,
            forkProvenance: {
              method: "hardhat_reset",
              sourceBlock: FORK_BLOCK
            },
            execute:
              async ({
                executor:
                  exactExecutor,
                candidate:
                  exactCandidate,
                executionPlan:
                  exactPlan
              }) => {
                const tx =
                  await exactExecutor
                    .initiateFlashloan(
                      executionLegs[0]
                        .tokenIn,
                      exactCandidate
                        .amountIn,
                      exactPlan
                    );

                const receipt =
                  await tx.wait();

                assert.strictEqual(
                  receipt.status,
                  1,
                  "fork execution receipt failed"
                );

                return {
                  receipt
                };
              }
          });

        assert.strictEqual(
          evidence.observationBlock,
          FORK_BLOCK
        );

        assert.strictEqual(
          evidence.provenance
            .measurementBlock,
          FORK_BLOCK
        );

        assert.strictEqual(
          evidence.provenance.method,
          "FORK_RECEIPT"
        );

        assert(
          evidence.loanAmount.eq(START),
          "loan amount mismatch"
        );

        assert(
          evidence.gasUnits.gt(0),
          "receipt gas evidence missing"
        );

        assert.strictEqual(
          evidence.executionPlanHash,
          ethers.utils
            .keccak256(executionPlan)
            .toLowerCase()
        );

        const deployedCode =
          await ethers.provider.getCode(
            executor.address
          );

        assert.strictEqual(
          evidence.executorContext
            .executorCodeHash,
          ethers.utils.keccak256(
            deployedCode
          )
        );

        assert.strictEqual(
          evidence.executorContext
            .v3Router,
          await executor.V3_ROUTER()
        );

        assert.strictEqual(
          evidence.executorContext
            .v4Router,
          await executor.V4_ROUTER()
        );

        assert.strictEqual(
          evidence.executorContext
            .permit2,
          await executor.PERMIT2()
        );

        assert.strictEqual(
          evidence.executorContext
            .aaveProvider,
          await executor.AAVE_PROVIDER()
        );

        assert.strictEqual(
          evidence.executorContext
            .aavePool,
          await executor.AAVE_POOL()
        );

        console.log(
          "1S8_FORK_RECEIPT_GAS_UNITS=" +
          evidence.gasUnits.toString()
        );

        console.log(
          "1S8_EXECUTION_PLAN_HASH=" +
          evidence.executionPlanHash
        );

        console.log(
          "1S8_EXECUTOR_CODE_HASH=" +
          evidence.executorContext
            .executorCodeHash
        );

        console.log(
          "1S8_MEASUREMENT_BLOCK=" +
          evidence.provenance
            .measurementBlock
        );
      }
    );
  }
);
