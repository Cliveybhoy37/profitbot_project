const assert = require("assert");
const { ethers } = require("hardhat");

const {
  buildV4ExecutionLegs,
  encodeV4ExecutionPlan
} = require(
  "../scripts/utils/polygonV4ExecutionRoute"
);

describe(
  "Polygon V4 candidate-driven Aave execution",
  function () {
    const FORK_BLOCK = 94709817;

    const WPOL =
      "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";

    const DAI =
      "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";

    const APEPE =
      "0xA3f751662e282E83EC3cBc387d225Ca56dD63D3A";

    const V3_ROUTER =
      "0xE592427A0AEce92De3Edee1F18E0157C05861564";

    const V4_ROUTER =
      "0xDc264714F68d84CF29BC605589405E78bDBE7C9f";

    const PERMIT2 =
      "0x000000000022D473030F116dDEE9F6B43aC78BA3";

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
        process.env.USE_FORK_BLOCK !== "true"
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
      "executes candidate-generated protected V3 -> V4 -> V3 calldata through Aave",
      async function () {
        const Executor =
          await ethers.getContractFactory(
            "PolygonV4CandidateExecutor"
          );

        const executor =
          await Executor.deploy();

        await executor.deployed();

        const candidate = [
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

        // 50 bps protection relative to the pinned quote.
        const legs =
          buildV4ExecutionLegs(
            candidate,
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

        const params =
          encodeV4ExecutionPlan({
            legs,
            deadline,
            minimumProfit
          });

        const wpol =
          await ethers.getContractAt(
            [
              "function balanceOf(address) view returns (uint256)",
              "function allowance(address,address) view returns (uint256)"
            ],
            WPOL
          );

        const dai =
          await ethers.getContractAt(
            [
              "function allowance(address,address) view returns (uint256)"
            ],
            DAI
          );

        const apepe =
          await ethers.getContractAt(
            [
              "function allowance(address,address) view returns (uint256)"
            ],
            APEPE
          );

        const pool =
          await executor.AAVE_POOL();

        const before =
          await wpol.balanceOf(
            executor.address
          );

        assert(
          before.eq(0),
          "executor unexpectedly pre-funded"
        );

        const tx =
          await executor.initiateFlashloan(
            WPOL,
            START,
            params
          );

        const receipt =
          await tx.wait();

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

        const retained =
          await wpol.balanceOf(
            executor.address
          );

        assert(
          amount.eq(START),
          "unexpected loan amount"
        );

        assert(
          premium.eq(
            ethers.BigNumber.from(
              "62500000000000"
            )
          ),
          "unexpected historical premium"
        );

        assert(
          routeOutput.eq(
            EXPECTED_ROUTE_OUTPUT
          ),
          "candidate route output changed"
        );

        assert(
          debt.eq(amount.add(premium)),
          "debt mismatch"
        );

        assert(
          profit.eq(
            routeOutput.sub(debt)
          ),
          "profit mismatch"
        );

        assert(
          retained.eq(profit),
          "retained profit mismatch"
        );

        assert(
          (
            await wpol.allowance(
              executor.address,
              pool
            )
          ).eq(0),
          "Aave allowance remains"
        );

        assert(
          (
            await wpol.allowance(
              executor.address,
              V3_ROUTER
            )
          ).eq(0),
          "WPOL V3 allowance remains"
        );

        assert(
          (
            await dai.allowance(
              executor.address,
              PERMIT2
            )
          ).eq(0),
          "DAI Permit2 token allowance remains"
        );

        assert(
          (
            await apepe.allowance(
              executor.address,
              V3_ROUTER
            )
          ).eq(0),
          "APEPE V3 allowance remains"
        );

        const premiumBps =
          premium.mul(10000).div(amount);

        const breakEvenGasPriceWei =
          retained.div(receipt.gasUsed);

        console.log(
          "executor:",
          executor.address
        );

        console.log(
          "candidate params bytes:",
          (params.length - 2) / 2
        );

        console.log(
          "premium bps:",
          premiumBps.toString()
        );

        console.log(
          "route output:",
          routeOutput.toString()
        );

        console.log(
          "retained WPOL:",
          retained.toString()
        );

        console.log(
          "retained formatted:",
          ethers.utils.formatEther(
            retained
          )
        );

        console.log(
          "gasUsed:",
          receipt.gasUsed.toString()
        );

        console.log(
          "break-even gas gwei:",
          ethers.utils.formatUnits(
            breakEvenGasPriceWei,
            "gwei"
          )
        );

        console.log(
          "GENERIC_AAVE_V4_ROUTE_OK"
        );
      }
    );


    it(
      "rejects an expired execution plan before requesting Aave",
      async function () {
        const Executor =
          await ethers.getContractFactory(
            "PolygonV4CandidateExecutor"
          );

        const executor =
          await Executor.deploy();

        await executor.deployed();

        const candidate = [
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

        const legs =
          buildV4ExecutionLegs(
            candidate,
            50
          );

        const block =
          await ethers.provider.getBlock(
            "latest"
          );

        const params =
          encodeV4ExecutionPlan({
            legs,
            deadline:
              block.timestamp - 1,
            minimumProfit:
              ethers.BigNumber.from(1)
          });

        await assert.rejects(
          executor.initiateFlashloan(
            WPOL,
            START,
            params
          ),
          /PLAN_EXPIRED/
        );
      }
    );

    it(
      "rejects a route whose realized profit is below the plan minimum",
      async function () {
        const Executor =
          await ethers.getContractFactory(
            "PolygonV4CandidateExecutor"
          );

        const executor =
          await Executor.deploy();

        await executor.deployed();

        const candidate = [
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

        const legs =
          buildV4ExecutionLegs(
            candidate,
            50
          );

        const block =
          await ethers.provider.getBlock(
            "latest"
          );

        // Historical realized profit is about
        // 0.0167459837 WPOL, so 0.02 must fail.
        const params =
          encodeV4ExecutionPlan({
            legs,
            deadline:
              block.timestamp + 300,
            minimumProfit:
              ethers.utils.parseEther(
                "0.02"
              )
          });

        await assert.rejects(
          executor.initiateFlashloan(
            WPOL,
            START,
            params
          ),
          /PROFIT_BELOW_MINIMUM/
        );

        const wpol =
          await ethers.getContractAt(
            [
              "function balanceOf(address) view returns (uint256)",
              "function allowance(address,address) view returns (uint256)"
            ],
            WPOL
          );

        const pool =
          await executor.AAVE_POOL();

        assert(
          (
            await wpol.balanceOf(
              executor.address
            )
          ).eq(0),
          "reverted execution retained funds"
        );

        assert(
          (
            await wpol.allowance(
              executor.address,
              pool
            )
          ).eq(0),
          "reverted execution left Aave allowance"
        );
      }
    );

    it(
      "rejects a zero minimum-profit execution plan",
      async function () {
        const Executor =
          await ethers.getContractFactory(
            "PolygonV4CandidateExecutor"
          );

        const executor =
          await Executor.deploy();

        await executor.deployed();

        const candidate = [
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

        const legs =
          buildV4ExecutionLegs(
            candidate,
            50
          );

        const block =
          await ethers.provider.getBlock(
            "latest"
          );

        // Bypass the JS encoder deliberately so Solidity itself
        // proves it rejects zero minimum profit.
        const planType =
          "tuple(uint256 deadline,uint256 minimumProfit,tuple(uint8 venue,address tokenIn,address tokenOut,uint256 minAmountOut,bytes venueData)[] legs)";

        const params =
          ethers.utils.defaultAbiCoder.encode(
            [planType],
            [[
              block.timestamp + 300,
              0,
              legs.map((leg) => [
                leg.venue,
                leg.tokenIn,
                leg.tokenOut,
                leg.minAmountOut,
                leg.venueData
              ])
            ]]
          );

        await assert.rejects(
          executor.initiateFlashloan(
            WPOL,
            START,
            params
          ),
          /MIN_PROFIT_ZERO/
        );
      }
    );
  }
);
