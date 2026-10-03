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
  RPC_FAILURE,
  safeErrorCode,
  classifyCallFailure,
  observeV2Quote,
  observeV3Quote
} = require(
  "../scripts/utils/polygonV4OuterQuoteObserver"
);

const TOKEN_A =
  "0x1111111111111111111111111111111111111111";

const TOKEN_B =
  "0x2222222222222222222222222222222222222222";

const POOL_100 =
  "0x3333333333333333333333333333333333333333";

const POOL_500 =
  "0x4444444444444444444444444444444444444444";

const AMOUNT =
  ethers.BigNumber.from(
    "1000000"
  );

function serverError() {
  const error =
    new Error(
      "provider failed"
    );

  error.code =
    "SERVER_ERROR";

  return error;
}

function callException() {
  const error =
    new Error(
      "execution reverted"
    );

  error.code =
    "CALL_EXCEPTION";

  return error;
}

test(
  "safeErrorCode never persists raw error message",
  () => {
    const error =
      new Error(
        "secret endpoint text"
      );

    error.code =
      "SERVER_ERROR";

    assert.equal(
      safeErrorCode(error),
      "SERVER_ERROR"
    );
  }
);

test(
  "unknown failures remain retryable",
  () => {
    const result =
      classifyCallFailure(
        new Error(
          "ambiguous"
        )
      );

    assert.deepEqual(
      result,
      {
        status:
          RPC_FAILURE,
        errorCode:
          "UNKNOWN"
      }
    );
  }
);

test(
  "known server failure is RPC_FAILURE",
  () => {
    assert.deepEqual(
      classifyCallFailure(
        serverError()
      ),
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
  "known contract revert is deterministic NO_ROUTE evidence",
  () => {
    assert.deepEqual(
      classifyCallFailure(
        callException()
      ),
      {
        status:
          NO_ROUTE,
        errorCode:
          "CALL_EXCEPTION"
      }
    );
  }
);

test(
  "V2 positive quote is QUOTE_OK",
  async () => {
    const router = {
      async getAmountsOut() {
        return [
          AMOUNT,
          ethers.BigNumber.from(
            "900000"
          )
        ];
      }
    };

    const result =
      await observeV2Quote({
        venueName:
          "QUICKSWAP_V2",
        path:
          [TOKEN_A, TOKEN_B],
        amountIn:
          AMOUNT,
        provider: {},
        blockTag: 123,
        router
      });

    assert.equal(
      result.status,
      QUOTE_OK
    );

    assert.equal(
      result.amountOut,
      "900000"
    );
  }
);

test(
  "V2 CALL_EXCEPTION is NO_ROUTE",
  async () => {
    const router = {
      async getAmountsOut() {
        throw callException();
      }
    };

    const result =
      await observeV2Quote({
        venueName:
          "SUSHISWAP_V2",
        path:
          [TOKEN_A, TOKEN_B],
        amountIn:
          AMOUNT,
        provider: {},
        blockTag: 123,
        router
      });

    assert.equal(
      result.status,
      NO_ROUTE
    );

    assert.equal(
      result.errorCode,
      "CALL_EXCEPTION"
    );
  }
);

test(
  "V2 server error is retryable",
  async () => {
    const router = {
      async getAmountsOut() {
        throw serverError();
      }
    };

    const result =
      await observeV2Quote({
        venueName:
          "QUICKSWAP_V2",
        path:
          [TOKEN_A, TOKEN_B],
        amountIn:
          AMOUNT,
        provider: {},
        blockTag: 123,
        router
      });

    assert.equal(
      result.status,
      RPC_FAILURE
    );

    assert.equal(
      result.errorCode,
      "SERVER_ERROR"
    );
  }
);

test(
  "V3 all missing pools is NO_ROUTE",
  async () => {
    const factory = {
      async getPool() {
        return ethers.constants
          .AddressZero;
      }
    };

    const quoter = {
      callStatic: {
        async quoteExactInputSingle() {
          throw new Error(
            "must not quote absent pool"
          );
        }
      }
    };

    const result =
      await observeV3Quote({
        venueName:
          "UNISWAP_V3",
        path:
          [TOKEN_A, TOKEN_B],
        amountIn:
          AMOUNT,
        provider: {},
        blockTag: 123,
        factory,
        quoter,
        feeTiers:
          [100, 500]
      });

    assert.equal(
      result.status,
      NO_ROUTE
    );

    assert.equal(
      result.tierResults.length,
      2
    );
  }
);

test(
  "V3 chooses best successful tier",
  async () => {
    const factory = {
      async getPool(
        tokenA,
        tokenB,
        fee
      ) {
        return fee === 100
          ? POOL_100
          : POOL_500;
      }
    };

    const quoter = {
      callStatic: {
        async quoteExactInputSingle(
          tokenIn,
          tokenOut,
          fee
        ) {
          return fee === 100
            ? ethers.BigNumber.from(
                "900000"
              )
            : ethers.BigNumber.from(
                "950000"
              );
        }
      }
    };

    const result =
      await observeV3Quote({
        venueName:
          "UNISWAP_V3",
        path:
          [TOKEN_A, TOKEN_B],
        amountIn:
          AMOUNT,
        provider: {},
        blockTag: 123,
        factory,
        quoter,
        feeTiers:
          [100, 500]
      });

    assert.equal(
      result.status,
      QUOTE_OK
    );

    assert.equal(
      result.fee,
      500
    );

    assert.equal(
      result.amountOut,
      "950000"
    );
  }
);

test(
  "V3 successful tier wins despite another tier RPC failure",
  async () => {
    const factory = {
      async getPool(
        tokenA,
        tokenB,
        fee
      ) {
        if (fee === 100) {
          throw serverError();
        }

        return POOL_500;
      }
    };

    const quoter = {
      callStatic: {
        async quoteExactInputSingle() {
          return ethers.BigNumber.from(
            "910000"
          );
        }
      }
    };

    const result =
      await observeV3Quote({
        venueName:
          "UNISWAP_V3",
        path:
          [TOKEN_A, TOKEN_B],
        amountIn:
          AMOUNT,
        provider: {},
        blockTag: 123,
        factory,
        quoter,
        feeTiers:
          [100, 500]
      });

    assert.equal(
      result.status,
      QUOTE_OK
    );

    assert.equal(
      result.fee,
      500
    );

    assert.equal(
      result.tierResults[0]
        .status,
      RPC_FAILURE
    );
  }
);

test(
  "V3 unresolved infrastructure failure prevents NO_ROUTE conclusion",
  async () => {
    const factory = {
      async getPool(
        tokenA,
        tokenB,
        fee
      ) {
        if (fee === 100) {
          throw serverError();
        }

        return ethers.constants
          .AddressZero;
      }
    };

    const quoter = {
      callStatic: {
        async quoteExactInputSingle() {
          throw new Error(
            "must not run"
          );
        }
      }
    };

    const result =
      await observeV3Quote({
        venueName:
          "UNISWAP_V3",
        path:
          [TOKEN_A, TOKEN_B],
        amountIn:
          AMOUNT,
        provider: {},
        blockTag: 123,
        factory,
        quoter,
        feeTiers:
          [100, 500]
      });

    assert.equal(
      result.status,
      RPC_FAILURE
    );

    assert.equal(
      result.errorCode,
      "SERVER_ERROR"
    );
  }
);

test(
  "V3 existing pool deterministic revert can resolve to NO_ROUTE",
  async () => {
    const factory = {
      async getPool() {
        return POOL_100;
      }
    };

    const quoter = {
      callStatic: {
        async quoteExactInputSingle() {
          throw callException();
        }
      }
    };

    const result =
      await observeV3Quote({
        venueName:
          "UNISWAP_V3",
        path:
          [TOKEN_A, TOKEN_B],
        amountIn:
          AMOUNT,
        provider: {},
        blockTag: 123,
        factory,
        quoter,
        feeTiers:
          [100]
      });

    assert.equal(
      result.status,
      NO_ROUTE
    );

    assert.equal(
      result.tierResults[0]
        .errorCode,
      "CALL_EXCEPTION"
    );
  }
);

test(
  "V3 unknown error remains RPC_FAILURE",
  async () => {
    const factory = {
      async getPool() {
        throw new Error(
          "ambiguous failure"
        );
      }
    };

    const quoter = {
      callStatic: {}
    };

    const result =
      await observeV3Quote({
        venueName:
          "UNISWAP_V3",
        path:
          [TOKEN_A, TOKEN_B],
        amountIn:
          AMOUNT,
        provider: {},
        blockTag: 123,
        factory,
        quoter,
        feeTiers:
          [100]
      });

    assert.equal(
      result.status,
      RPC_FAILURE
    );

    assert.equal(
      result.errorCode,
      "UNKNOWN"
    );
  }
);

test(
  "V3 records deterministic per-tier RPC durations",
  async () => {
    const times = [
      1000, 1011,
      2000, 2023,
      3000, 3037
    ];

    const nowFn = () => {
      if (times.length === 0) {
        throw new Error(
          "unexpected nowFn call"
        );
      }

      return times.shift();
    };

    const factory = {
      async getPool(
        tokenA,
        tokenB,
        fee
      ) {
        return fee === 100
          ? ethers.constants
              .AddressZero
          : POOL_500;
      }
    };

    const quoter = {
      callStatic: {
        async quoteExactInputSingle() {
          return ethers.BigNumber.from(
            "950000"
          );
        }
      }
    };

    const result =
      await observeV3Quote({
        venueName:
          "UNISWAP_V3",
        path:
          [TOKEN_A, TOKEN_B],
        amountIn:
          AMOUNT,
        provider: {},
        blockTag: 123,
        factory,
        quoter,
        feeTiers:
          [100, 500],
        nowFn
      });

    assert.equal(
      result.status,
      QUOTE_OK
    );

    assert.deepEqual(
      result.tierResults.map(
        tier => ({
          fee: tier.fee,
          poolLookupDurationMs:
            tier.poolLookupDurationMs,
          quoteDurationMs:
            tier.quoteDurationMs
        })
      ),
      [
        {
          fee: 100,
          poolLookupDurationMs: 11,
          quoteDurationMs: null
        },
        {
          fee: 500,
          poolLookupDurationMs: 23,
          quoteDurationMs: 37
        }
      ]
    );

    assert.equal(
      times.length,
      0
    );
  }
);

test(
  "V3 successful quote rejects invalid duration without reclassification",
  async () => {
    const times = [
      1000,
      1010,
      2000,
      1999
    ];

    let poolCalls = 0;
    let quoteCalls = 0;

    const nowFn = () => {
      if (times.length === 0) {
        throw new Error(
          "unexpected nowFn call"
        );
      }

      return times.shift();
    };

    const factory = {
      async getPool() {
        poolCalls += 1;
        return POOL_100;
      }
    };

    const quoter = {
      callStatic: {
        async quoteExactInputSingle() {
          quoteCalls += 1;

          return ethers.BigNumber.from(
            "950000"
          );
        }
      }
    };

    await assert.rejects(
      observeV3Quote({
        venueName:
          "UNISWAP_V3",
        path:
          [TOKEN_A, TOKEN_B],
        amountIn:
          AMOUNT,
        provider: {},
        blockTag: 123,
        factory,
        quoter,
        feeTiers:
          [100],
        nowFn
      }),
      /Invalid V3 quote duration/
    );

    assert.equal(
      poolCalls,
      1
    );

    assert.equal(
      quoteCalls,
      1
    );

    assert.equal(
      times.length,
      0
    );
  }
);

test(
  "V3 reuses successful pinned-block pool resolution from supplied cache",
  async () => {
    const poolCache = new Map();
    let poolCalls = 0;
    let quoteCalls = 0;

    const factory = {
      async getPool() {
        poolCalls += 1;
        return POOL_100;
      }
    };

    const quoter = {
      callStatic: {
        async quoteExactInputSingle() {
          quoteCalls += 1;

          return ethers.BigNumber.from(
            "950000"
          );
        }
      }
    };

    const first =
      await observeV3Quote({
        venueName:
          "UNISWAP_V3",
        path:
          [TOKEN_A, TOKEN_B],
        amountIn:
          AMOUNT,
        provider: {},
        blockTag: 123,
        factory,
        quoter,
        feeTiers:
          [100],
        poolCache
      });

    const second =
      await observeV3Quote({
        venueName:
          "UNISWAP_V3",
        path:
          [TOKEN_B, TOKEN_A],
        amountIn:
          AMOUNT,
        provider: {},
        blockTag: 123,
        factory,
        quoter,
        feeTiers:
          [100],
        poolCache
      });

    assert.equal(
      first.status,
      QUOTE_OK
    );

    assert.equal(
      second.status,
      QUOTE_OK
    );

    assert.equal(
      poolCalls,
      1
    );

    assert.equal(
      quoteCalls,
      2
    );

    assert.equal(
      first.tierResults[0]
        .poolLookupCacheHit,
      false
    );

    assert.equal(
      second.tierResults[0]
        .poolLookupCacheHit,
      true
    );

    assert.equal(
      second.tierResults[0]
        .poolLookupDurationMs,
      0
    );
  }
);

test(
  "V3 caches successful pinned-block NO_POOL resolution",
  async () => {
    const poolCache = new Map();
    let poolCalls = 0;
    let quoteCalls = 0;

    const factory = {
      async getPool() {
        poolCalls += 1;

        return ethers.constants
          .AddressZero;
      }
    };

    const quoter = {
      callStatic: {
        async quoteExactInputSingle() {
          quoteCalls += 1;

          throw new Error(
            "quoter must not run without pool"
          );
        }
      }
    };

    const first =
      await observeV3Quote({
        venueName:
          "UNISWAP_V3",
        path:
          [TOKEN_A, TOKEN_B],
        amountIn:
          AMOUNT,
        provider: {},
        blockTag: 123,
        factory,
        quoter,
        feeTiers:
          [100],
        poolCache
      });

    const second =
      await observeV3Quote({
        venueName:
          "UNISWAP_V3",
        path:
          [TOKEN_B, TOKEN_A],
        amountIn:
          AMOUNT,
        provider: {},
        blockTag: 123,
        factory,
        quoter,
        feeTiers:
          [100],
        poolCache
      });

    assert.equal(
      first.status,
      NO_ROUTE
    );

    assert.equal(
      second.status,
      NO_ROUTE
    );

    assert.equal(
      poolCalls,
      1
    );

    assert.equal(
      quoteCalls,
      0
    );

    assert.equal(
      first.tierResults[0]
        .poolLookupCacheHit,
      false
    );

    assert.equal(
      second.tierResults[0]
        .poolLookupCacheHit,
      true
    );

    assert.equal(
      second.tierResults[0]
        .poolLookupDurationMs,
      0
    );

    assert.equal(
      second.tierResults[0]
        .reason,
      "NO_POOL"
    );
  }
);

test(
  "V3 pool cache is isolated by pinned block",
  async () => {
    const poolCache = new Map();
    let poolCalls = 0;

    const factory = {
      async getPool() {
        poolCalls += 1;
        return POOL_100;
      }
    };

    const quoter = {
      callStatic: {
        async quoteExactInputSingle() {
          return ethers.BigNumber.from(
            "950000"
          );
        }
      }
    };

    for (const blockTag of [123, 124]) {
      await observeV3Quote({
        venueName:
          "UNISWAP_V3",
        path:
          [TOKEN_A, TOKEN_B],
        amountIn:
          AMOUNT,
        provider: {},
        blockTag,
        factory,
        quoter,
        feeTiers:
          [100],
        poolCache
      });
    }

    assert.equal(
      poolCalls,
      2
    );
  }
);

test(
  "V3 pool cache never stores factory RPC failures",
  async () => {
    const poolCache = new Map();
    let poolCalls = 0;

    const factory = {
      async getPool() {
        poolCalls += 1;

        if (poolCalls === 1) {
          const error =
            new Error(
              "temporary factory failure"
            );

          error.code =
            "SERVER_ERROR";

          throw error;
        }

        return POOL_100;
      }
    };

    const quoter = {
      callStatic: {
        async quoteExactInputSingle() {
          return ethers.BigNumber.from(
            "950000"
          );
        }
      }
    };

    const first =
      await observeV3Quote({
        venueName:
          "UNISWAP_V3",
        path:
          [TOKEN_A, TOKEN_B],
        amountIn:
          AMOUNT,
        provider: {},
        blockTag: 123,
        factory,
        quoter,
        feeTiers:
          [100],
        poolCache
      });

    const second =
      await observeV3Quote({
        venueName:
          "UNISWAP_V3",
        path:
          [TOKEN_A, TOKEN_B],
        amountIn:
          AMOUNT,
        provider: {},
        blockTag: 123,
        factory,
        quoter,
        feeTiers:
          [100],
        poolCache
      });

    assert.equal(
      first.status,
      RPC_FAILURE
    );

    assert.equal(
      second.status,
      QUOTE_OK
    );

    assert.equal(
      poolCalls,
      2
    );

    assert.equal(
      second.tierResults[0]
        .poolLookupCacheHit,
      false
    );
  }
);

test(
  "V3 rejects invalid timing dependency before RPC work",
  async () => {
    let poolCalls = 0;

    const factory = {
      async getPool() {
        poolCalls += 1;

        return POOL_100;
      }
    };

    await assert.rejects(
      observeV3Quote({
        venueName:
          "UNISWAP_V3",
        path:
          [TOKEN_A, TOKEN_B],
        amountIn:
          AMOUNT,
        provider: {},
        blockTag: 123,
        factory,
        quoter: {
          callStatic: {}
        },
        feeTiers:
          [100],
        nowFn: null
      }),
      /V3 observation requires nowFn/
    );

    assert.equal(
      poolCalls,
      0
    );
  }
);
