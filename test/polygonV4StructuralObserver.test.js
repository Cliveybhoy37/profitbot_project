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
  METADATA_OK,
  validateDecimals,
  oneTokenAmount,
  coreTokens,
  outerVenueNames,
  observeTokenDecimals,
  summarizeDirection,
  observeDirection,
  observeTokenAgainstCore
} = require(
  "../scripts/utils/polygonV4StructuralObserver"
);

const CORE = {
  symbol: "USDC_NATIVE",
  address:
    "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  decimals: 6
};

const EXOTIC =
  "0x1111111111111111111111111111111111111111";

test(
  "core token registry preserves all six explicit scanner assets",
  () => {
    const tokens =
      coreTokens();

    assert.equal(
      tokens.length,
      6
    );

    assert.deepEqual(
      tokens.map(
        token =>
          token.symbol
      ),
      [
        "USDC_NATIVE",
        "USDC_E",
        "WPOL",
        "DAI",
        "WETH",
        "WBTC"
      ]
    );

    assert.notEqual(
      tokens[0].address
        .toLowerCase(),
      tokens[1].address
        .toLowerCase()
    );
  }
);

test(
  "outer venues are exactly current supported research venues",
  () => {
    assert.deepEqual(
      outerVenueNames(),
      [
        "QUICKSWAP_V2",
        "SUSHISWAP_V2",
        "UNISWAP_V3"
      ]
    );
  }
);

test(
  "oneTokenAmount respects token decimals",
  () => {
    assert.equal(
      oneTokenAmount(6)
        .toString(),
      "1000000"
    );

    assert.equal(
      oneTokenAmount(18)
        .toString(),
      "1000000000000000000"
    );

    assert.equal(
      oneTokenAmount(8)
        .toString(),
      "100000000"
    );
  }
);

test(
  "validateDecimals rejects invalid values",
  () => {
    assert.throws(
      () =>
        validateDecimals(-1),
      /Invalid ERC20 decimals/
    );

    assert.throws(
      () =>
        validateDecimals(256),
      /Invalid ERC20 decimals/
    );
  }
);

test(
  "metadata observation reads decimals at pinned block",
  async () => {
    let seenBlockTag = null;

    const contract = {
      async decimals(
        overrides
      ) {
        seenBlockTag =
          overrides.blockTag;

        return 9;
      }
    };

    const result =
      await observeTokenDecimals({
        provider: {},
        tokenAddress:
          EXOTIC,
        blockTag:
          94709817,
        contract
      });

    assert.equal(
      seenBlockTag,
      94709817
    );

    assert.deepEqual(
      result,
      {
        tokenAddress:
          EXOTIC.toLowerCase(),
        blockTag:
          94709817,
        status:
          METADATA_OK,
        decimals: 9
      }
    );
  }
);

test(
  "metadata RPC failure stays retryable and stores no raw message",
  async () => {
    const contract = {
      async decimals() {
        const error =
          new Error(
            "secret RPC endpoint"
          );

        error.code =
          "SERVER_ERROR";

        throw error;
      }
    };

    const result =
      await observeTokenDecimals({
        provider: {},
        tokenAddress:
          EXOTIC,
        blockTag:
          94709817,
        contract
      });

    assert.deepEqual(
      result,
      {
        tokenAddress:
          EXOTIC.toLowerCase(),
        blockTag:
          94709817,
        status:
          RPC_FAILURE,
        errorCode:
          "SERVER_ERROR"
      }
    );

    assert.equal(
      JSON.stringify(result)
        .includes(
          "secret RPC endpoint"
        ),
      false
    );
  }
);

test(
  "metadata CALL_EXCEPTION is retryable rather than structural rejection",
  async () => {
    const contract = {
      async decimals() {
        const error =
          new Error(
            "execution reverted"
          );

        error.code =
          "CALL_EXCEPTION";

        throw error;
      }
    };

    const result =
      await observeTokenDecimals({
        provider: {},
        tokenAddress:
          EXOTIC,
        blockTag:
          94709817,
        contract
      });

    assert.equal(
      result.status,
      RPC_FAILURE
    );

    assert.equal(
      result.errorCode,
      "CALL_EXCEPTION"
    );
  }
);

test(
  "direction summary accepts positive connectivity despite another RPC failure",
  () => {
    const result =
      summarizeDirection([
        {
          venue:
            "QUICKSWAP_V2",
          status:
            RPC_FAILURE
        },
        {
          venue:
            "UNISWAP_V3",
          status:
            QUOTE_OK
        }
      ]);

    assert.deepEqual(
      result,
      {
        status:
          QUOTE_OK,
        connected: true,
        venues: [
          "UNISWAP_V3"
        ]
      }
    );
  }
);

test(
  "direction summary remains retryable without positive quote when RPC unresolved",
  () => {
    const result =
      summarizeDirection([
        {
          venue:
            "QUICKSWAP_V2",
          status:
            NO_ROUTE
        },
        {
          venue:
            "UNISWAP_V3",
          status:
            RPC_FAILURE
        }
      ]);

    assert.deepEqual(
      result,
      {
        status:
          RPC_FAILURE,
        connected: null,
        venues: []
      }
    );
  }
);

test(
  "direction summary is NO_ROUTE only when all observations are conclusive negatives",
  () => {
    const result =
      summarizeDirection([
        {
          venue:
            "QUICKSWAP_V2",
          status:
            NO_ROUTE
        },
        {
          venue:
            "SUSHISWAP_V2",
          status:
            NO_ROUTE
        }
      ]);

    assert.deepEqual(
      result,
      {
        status:
          NO_ROUTE,
        connected: false,
        venues: []
      }
    );
  }
);

test(
  "observeDirection probes every requested venue at same pinned block",
  async () => {
    const calls = [];

    const observeQuoteFn =
      async args => {
        calls.push(args);

        return {
          status:
            NO_ROUTE
        };
      };

    const result =
      await observeDirection({
        provider: {},
        blockTag:
          94709817,
        tokenIn:
          CORE.address,
        tokenOut:
          EXOTIC,
        amountIn:
          ethers.BigNumber.from(
            1000000
          ),
        venueNames: [
          "QUICKSWAP_V2",
          "UNISWAP_V3"
        ],
        observeQuoteFn
      });

    assert.equal(
      calls.length,
      2
    );

    assert.equal(
      calls[0].blockTag,
      94709817
    );

    assert.equal(
      calls[1].blockTag,
      94709817
    );

    assert.equal(
      result.summary.status,
      NO_ROUTE
    );
  }
);

test(
  "token against core uses one core token for entry and one exotic token for exit",
  async () => {
    const calls = [];

    const observeQuoteFn =
      async args => {
        calls.push(args);

        return {
          status:
            QUOTE_OK,
          amountOut:
            "123"
        };
      };

    const result =
      await observeTokenAgainstCore({
        provider: {},
        blockTag:
          94709817,
        coreToken:
          CORE,
        candidateAddress:
          EXOTIC,
        candidateDecimals:
          9,
        venueNames: [
          "QUICKSWAP_V2"
        ],
        observeQuoteFn
      });

    assert.equal(
      calls.length,
      2
    );

    assert.equal(
      calls[0].amountIn
        .toString(),
      "1000000"
    );

    assert.equal(
      calls[1].amountIn
        .toString(),
      "1000000000"
    );

    assert.deepEqual(
      calls[0].path.map(
        value =>
          value.toLowerCase()
      ),
      [
        CORE.address
          .toLowerCase(),
        EXOTIC.toLowerCase()
      ]
    );

    assert.deepEqual(
      calls[1].path.map(
        value =>
          value.toLowerCase()
      ),
      [
        EXOTIC.toLowerCase(),
        CORE.address
          .toLowerCase()
      ]
    );

    assert.equal(
      result.hasEntry,
      true
    );

    assert.equal(
      result.hasExit,
      true
    );

    assert.equal(
      result.conclusive,
      true
    );
  }
);

test(
  "token against core is incomplete when one direction has unresolved RPC failure",
  async () => {
    let call = 0;

    const observeQuoteFn =
      async () => {
        call += 1;

        return call === 1
          ? {
              status:
                QUOTE_OK,
              amountOut:
                "100"
            }
          : {
              status:
                RPC_FAILURE,
              errorCode:
                "SERVER_ERROR"
            };
      };

    const result =
      await observeTokenAgainstCore({
        provider: {},
        blockTag:
          94709817,
        coreToken:
          CORE,
        candidateAddress:
          EXOTIC,
        candidateDecimals:
          18,
        venueNames: [
          "QUICKSWAP_V2"
        ],
        observeQuoteFn
      });

    assert.equal(
      result.hasEntry,
      true
    );

    assert.equal(
      result.hasExit,
      null
    );

    assert.equal(
      result.conclusive,
      false
    );
  }
);

