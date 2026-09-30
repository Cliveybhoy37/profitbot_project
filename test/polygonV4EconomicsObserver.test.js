"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const { ethers } =
  require("ethers");

const {
  QUOTE_OK,
  NO_ROUTE,
  RPC_FAILURE
} = require(
  "../scripts/utils/polygonV4OuterQuoteObserver"
);

const {
  V4_QUOTER,
  V4_QUOTER_ABI,
  classifyV4Failure,
  observeV4Quote,
  grossMetrics,
  observeThreeLegEconomics
} = require(
  "../scripts/utils/polygonV4EconomicsObserver"
);

const BLOCK = 94709817;

const WPOL =
  "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";

const WETH =
  "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";

const USDT0 =
  "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";

const POOL_KEY = {
  currency0: WETH,
  currency1: USDT0,
  fee: 75,
  tickSpacing: 1,
  hooks:
    "0x0000000000000000000000000000000000000000"
};

test(
  "uses verified Polygon V4Quoter address",
  () => {
    assert.equal(
      V4_QUOTER.toLowerCase(),
      "0xb3d5c3dfc3a7aebff71895a7191796bffc2c81b9"
    );
  }
);

test(
  "V4 ABI keeps the required nested single struct",
  () => {
    assert.equal(
      V4_QUOTER_ABI.length,
      1
    );

    assert.match(
      V4_QUOTER_ABI[0],
      /poolKey,bool zeroForOne,uint128 exactAmount,bytes hookData/
    );
  }
);

test(
  "V4 quote uses exact chained amount and pinned block",
  async () => {
    let received;

    const quoter = {
      callStatic: {
        async quoteExactInputSingle(
          params,
          overrides
        ) {
          received = {
            params,
            overrides
          };

          return {
            amountOut:
              ethers.BigNumber.from(
                "456"
              ),
            gasEstimate:
              ethers.BigNumber.from(
                "789"
              )
          };
        }
      }
    };

    const result =
      await observeV4Quote({
        provider: {},
        blockTag: BLOCK,
        poolKey: POOL_KEY,
        zeroForOne: false,
        amountIn:
          ethers.BigNumber.from(
            "123"
          ),
        quoter
      });

    assert.equal(
      result.status,
      QUOTE_OK
    );

    assert.equal(
      result.amountOut,
      "456"
    );

    assert.equal(
      result.gasEstimate,
      "789"
    );

    assert.deepEqual(
      result.poolKey,
      {
        currency0:
          ethers.utils.getAddress(
            POOL_KEY.currency0
          ),
        currency1:
          ethers.utils.getAddress(
            POOL_KEY.currency1
          ),
        fee:
          POOL_KEY.fee,
        tickSpacing:
          POOL_KEY.tickSpacing,
        hooks:
          ethers.utils.getAddress(
            POOL_KEY.hooks
          )
      }
    );

    assert.equal(
      result.zeroForOne,
      false
    );

    assert.equal(
      received.params
        .exactAmount
        .toString(),
      "123"
    );

    assert.equal(
      received.params
        .zeroForOne,
      false
    );

    assert.equal(
      received.overrides.blockTag,
      BLOCK
    );
  }
);

test(
  "V4 deterministic revert is NO_ROUTE",
  async () => {
    const error =
      new Error(
        "do not persist this text"
      );

    error.code =
      "CALL_EXCEPTION";

    const result =
      classifyV4Failure(
        error
      );

    assert.deepEqual(
      result,
      {
        status: NO_ROUTE,
        errorCode:
          "CALL_EXCEPTION"
      }
    );
  }
);

test(
  "V4 infrastructure uncertainty stays RPC_FAILURE",
  async () => {
    const error =
      new Error(
        "provider details must not be persisted"
      );

    error.code =
      "SERVER_ERROR";

    assert.deepEqual(
      classifyV4Failure(error),
      {
        status:
          RPC_FAILURE,
        errorCode:
          "SERVER_ERROR"
      }
    );
  }
);

test(
  "gross metrics preserve signed bps",
  () => {
    assert.deepEqual(
      grossMetrics({
        amountIn: "1000000",
        amountOut: "1000200"
      }),
      {
        amountIn: "1000000",
        amountOut: "1000200",
        grossDelta: "200",
        grossBpsScaled:
          "2000000"
      }
    );

    assert.deepEqual(
      grossMetrics({
        amountIn: "1000000",
        amountOut: "999800"
      }),
      {
        amountIn: "1000000",
        amountOut: "999800",
        grossDelta: "-200",
        grossBpsScaled:
          "-2000000"
      }
    );
  }
);

test(
  "three-leg economics chains actual outputs",
  async () => {
    const outerCalls = [];
    let v4AmountIn = null;

    async function outer(args) {
      outerCalls.push({
        venueName:
          args.venueName,
        path:
          args.path.map(
            value =>
              value.toLowerCase()
          ),
        amountIn:
          args.amountIn.toString(),
        blockTag:
          args.blockTag
      });

      if (
        outerCalls.length === 1
      ) {
        return {
          venue:
            args.venueName,
          status:
            QUOTE_OK,
          amountOut:
            "250"
        };
      }

      return {
        venue:
          args.venueName,
        status:
          QUOTE_OK,
        amountOut:
          "1010"
      };
    }

    async function v4(args) {
      v4AmountIn =
        args.amountIn.toString();

      assert.equal(
        args.blockTag,
        BLOCK
      );

      assert.equal(
        args.zeroForOne,
        false
      );

      return {
        status:
          QUOTE_OK,
        amountOut:
          "400",
        gasEstimate:
          "1"
      };
    }

    const result =
      await observeThreeLegEconomics({
        provider: {},
        blockTag: BLOCK,
        startToken: WPOL,
        startAmount: "1000",
        entryVenue:
          "UNISWAP_V3",
        entryToken:
          USDT0,
        poolKey:
          POOL_KEY,

        // USDT0 -> WETH because:
        // currency0 = WETH
        // currency1 = USDT0
        zeroForOne: false,

        exitToken:
          WETH,
        exitVenue:
          "UNISWAP_V3",
        observeOuterQuoteFn:
          outer,
        observeV4QuoteFn:
          v4
      });

    assert.equal(
      outerCalls.length,
      2
    );

    assert.equal(
      outerCalls[0].amountIn,
      "1000"
    );

    assert.equal(
      v4AmountIn,
      "250"
    );

    assert.equal(
      outerCalls[1].amountIn,
      "400"
    );

    assert.deepEqual(
      result.amounts,
      {
        start: "1000",
        afterEntry: "250",
        afterV4: "400",
        final: "1010"
      }
    );

    assert.equal(
      result.grossDelta,
      "10"
    );

    assert.equal(
      result.grossBpsScaled,
      "100000000"
    );
  }
);

test(
  "three-leg economics stops on unresolved entry RPC",
  async () => {
    let v4Calls = 0;

    const result =
      await observeThreeLegEconomics({
        provider: {},
        blockTag: BLOCK,
        startToken: WPOL,
        startAmount: "1000",
        entryVenue:
          "UNISWAP_V3",
        entryToken:
          USDT0,
        poolKey:
          POOL_KEY,
        zeroForOne: false,
        exitToken:
          WETH,
        exitVenue:
          "UNISWAP_V3",

        async observeOuterQuoteFn() {
          return {
            venue:
              "UNISWAP_V3",
            status:
              RPC_FAILURE,
            errorCode:
              "SERVER_ERROR"
          };
        },

        async observeV4QuoteFn() {
          v4Calls += 1;

          return {
            status:
              QUOTE_OK,
            amountOut: "1"
          };
        }
      });

    assert.equal(
      result.status,
      RPC_FAILURE
    );

    assert.equal(
      result.failedLeg,
      "ENTRY"
    );

    assert.equal(
      v4Calls,
      0
    );
  }
);
