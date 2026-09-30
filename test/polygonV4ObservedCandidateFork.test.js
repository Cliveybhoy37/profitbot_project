"use strict";

const assert = require("assert");
const { ethers } = require("hardhat");

const {
  buildObservedV4Candidate
} = require(
  "../scripts/utils/polygonV4ObservedCandidate"
);

const {
  buildV4ExecutionLegs,
  encodeV4ExecutionLegs
} = require(
  "../scripts/utils/polygonV4ExecutionRoute"
);

const {
  preflightObservedV4Candidate
} = require(
  "../scripts/utils/polygonV4CandidatePreflight"
);

describe(
  "Polygon V4 observed candidate -> Aave execution",
  function () {
    const FORK_BLOCK = 94709817;

    const WPOL =
      "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";

    const DAI =
      "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";

    const APEPE =
      "0xA3f751662e282E83EC3cBc387d225Ca56dD63D3A";

    const START =
      ethers.BigNumber.from(
        "125000000000000000"
      );

    const EXPECTED_ENTRY =
      "14481764747850506";

    const EXPECTED_V4 =
      "12592522662788687883109";

    const EXPECTED_FINAL =
      ethers.BigNumber.from(
        "141808483715718886"
      );

    const POOL_KEY = {
      currency0: DAI,
      currency1: APEPE,
      fee: 10000,
      tickSpacing: 100,
      hooks:
        ethers.constants.AddressZero
    };

    before(function () {
      if (
        process.env.USE_FORK_BLOCK !==
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
    });

    it(
      "executes a candidate derived from frozen observed evidence through Aave",
      async function () {
        const provider =
          ethers.provider;

        // ----------------------------------------------------------
        // 1. Load frozen historical observation evidence.
        //
        // These values were observed independently at Polygon block
        // 94709817. The local Hardhat historical fork can execute the
        // contracts correctly in transactions, but its eth_call path
        // fails for the V3 reads used by the observer. Therefore this
        // test deliberately starts at the observation -> candidate
        // boundary rather than pretending to perform a fresh quote.
        // ----------------------------------------------------------

        const observation = {
          status: "QUOTE_OK",
          blockTag:
            FORK_BLOCK,

          amounts: {
            start:
              START.toString()
          },

          entry: {
            venue:
              "UNISWAP_V3",
            status:
              "QUOTE_OK",
            fee:
              100,
            pool:
              "0x7A7374873de28b06386013DA94CBd9b554f6AC6E",
            amountOut:
              EXPECTED_ENTRY
          },

          v4: {
            status:
              "QUOTE_OK",
            amountOut:
              EXPECTED_V4,
            poolKey:
              POOL_KEY,
            zeroForOne:
              true
          },

          exit: {
            venue:
              "UNISWAP_V3",
            status:
              "QUOTE_OK",
            fee:
              100,
            pool:
              "0x00a59c2d0f0f4837028D47a391decbffC1e10608",
            amountOut:
              EXPECTED_FINAL.toString()
          }
        };

        assert.strictEqual(
          observation.status,
          "QUOTE_OK",
          "historical observation fixture invalid"
        );

        assert.strictEqual(
          observation.entry.fee,
          100,
          "unexpected observed entry fee"
        );

        assert.strictEqual(
          observation.entry.amountOut,
          EXPECTED_ENTRY,
          "entry evidence changed"
        );

        assert.strictEqual(
          observation.v4.amountOut,
          EXPECTED_V4,
          "V4 evidence changed"
        );

        assert.strictEqual(
          observation.v4.zeroForOne,
          true,
          "V4 direction changed"
        );

        assert.strictEqual(
          observation.v4.poolKey.fee,
          10000,
          "V4 PoolKey fee changed"
        );

        assert.strictEqual(
          observation.exit.fee,
          100,
          "unexpected observed exit fee"
        );

        assert.strictEqual(
          observation.exit.amountOut,
          EXPECTED_FINAL.toString(),
          "exit evidence changed"
        );

        // ----------------------------------------------------------
        // 2. Transform observed evidence into executable candidate.
        // ----------------------------------------------------------

        const candidate =
          buildObservedV4Candidate({
            observation,
            startToken:
              WPOL,
            entryToken:
              DAI,
            exitToken:
              APEPE
          });

        assert.strictEqual(
          candidate.blockTag,
          FORK_BLOCK
        );

        assert(
          candidate.amountIn.eq(
            START
          ),
          "candidate amount differs from observed start amount"
        );

        assert.strictEqual(
          candidate.legs[0].fee,
          observation.entry.fee
        );

        assert.strictEqual(
          candidate.legs[2].fee,
          observation.exit.fee
        );

        assert.strictEqual(
          candidate.legs[1]
            .poolKey.fee,
          observation.v4
            .poolKey.fee
        );

        // ----------------------------------------------------------
        // 3. Fail-closed preflight using frozen historical inputs.
        //
        // The fork is pinned to the observation block, so age is zero.
        // The 5-bps premium and 650,723 gas are measurements from this
        // same historical route, not assumptions about live Polygon.
        // ----------------------------------------------------------

        const preflight =
          preflightObservedV4Candidate({
            candidate,
            requestedAmount:
              START,
            currentBlock:
              FORK_BLOCK,
            maxAgeBlocks:
              3,
            slippageBps:
              50,
            maxSlippageBps:
              100,
            premiumBps:
              5,
            estimatedGas:
              ethers.BigNumber.from(
                "650723"
              ),
            gasPriceWei:
              ethers.utils.parseUnits(
                "10",
                "gwei"
              ),
            safetyReserveWei:
              ethers.utils.parseEther(
                "0.001"
              ),
            minimumNetProfitWei:
              ethers.utils.parseEther(
                "0.005"
              )
          });

        assert.strictEqual(
          preflight.ageBlocks,
          0,
          "historical candidate unexpectedly aged"
        );

        assert(
          preflight.amountIn.eq(
            START
          ),
          "preflight amount mismatch"
        );

        assert(
          preflight.expectedNetProfit.gte(
            ethers.utils.parseEther(
              "0.005"
            )
          ),
          "preflight accepted insufficient expected profit"
        );

        console.log(
          "preflight age blocks:",
          preflight.ageBlocks
        );

        console.log(
          "preflight expected net WPOL:",
          ethers.utils.formatEther(
            preflight.expectedNetProfit
          )
        );

        // ----------------------------------------------------------
        // 4. Apply 50-bps protection and encode the candidate.
        // ----------------------------------------------------------

        const legs =
          buildV4ExecutionLegs(
            candidate.legs,
            50
          );

        const params =
          encodeV4ExecutionLegs(
            legs
          );

        assert(
          ethers.utils.isHexString(
            params
          ),
          "params not encoded"
        );

        assert(
          legs[0].minAmountOut.gt(0),
          "entry minOut zero"
        );

        assert(
          legs[1].minAmountOut.gt(0),
          "V4 minOut zero"
        );

        assert(
          legs[2].minAmountOut.gt(0),
          "exit minOut zero"
        );

        // ----------------------------------------------------------
        // 5. Deploy isolated generic executor with zero prefunding.
        // ----------------------------------------------------------

        const Executor =
          await ethers.getContractFactory(
            "PolygonV4CandidateExecutor"
          );

        const executor =
          await Executor.deploy();

        await executor.deployed();

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

        const before =
          await wpol.balanceOf(
            executor.address
          );

        assert(
          before.eq(0),
          "executor unexpectedly pre-funded"
        );

        // ----------------------------------------------------------
        // 6. Execute exactly the candidate derived above.
        // ----------------------------------------------------------

        const tx =
          await executor
            .initiateFlashloan(
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
          await executor
            .lastRouteOutput();

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
          "loan amount changed"
        );

        assert(
          routeOutput.eq(
            EXPECTED_FINAL
          ),
          "executed output differs from observed quote"
        );

        assert(
          debt.eq(
            amount.add(premium)
          ),
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
          "retained WPOL mismatch"
        );

        assert(
          retained.gt(0),
          "no retained profit"
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

        const breakEvenGasPriceWei =
          retained.div(
            receipt.gasUsed
          );

        console.log(
          "observed entry fee:",
          observation.entry.fee
        );

        console.log(
          "observed V4 fee:",
          observation.v4
            .poolKey.fee
        );

        console.log(
          "observed exit fee:",
          observation.exit.fee
        );

        console.log(
          "observed final:",
          observation.exit
            .amountOut
        );

        console.log(
          "encoded bytes:",
          (params.length - 2) / 2
        );

        console.log(
          "premium:",
          premium.toString()
        );

        console.log(
          "retained WPOL:",
          retained.toString()
        );

        console.log(
          "retained formatted:",
          ethers.utils
            .formatEther(retained)
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
          "OBSERVED_CANDIDATE_AAVE_OK"
        );
      }
    );
  }
);
