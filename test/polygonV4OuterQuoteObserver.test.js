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
