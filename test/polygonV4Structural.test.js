"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  NATIVE_POL,
  classifyCurrency,
  classifyActivePool,
  classifyActivePools
} = require(
  "../scripts/utils/polygonV4Structural"
);

const tokens =
  require(
    "../scripts/utils/polygonScannerTokens"
  );

function pool({
  idByte,
  currency0,
  currency1
}) {
  return {
    poolId:
      `0x${idByte.repeat(64)}`,
    poolKey: {
      currency0,
      currency1,
      fee: 500,
      tickSpacing: 10,
      hooks:
        "0x0000000000000000000000000000000000000000"
    }
  };
}

const EXOTIC_A =
  "0x1111111111111111111111111111111111111111";

const EXOTIC_B =
  "0x2222222222222222222222222222222222222222";

test(
  "recognizes explicit scanner core tokens",
  () => {
    const result =
      classifyCurrency(
        tokens.USDC_NATIVE.address
      );

    assert.equal(
      result.kind,
      "CORE"
    );

    assert.equal(
      result.symbol,
      "USDC_NATIVE"
    );

    assert.equal(
      result.decimals,
      6
    );
  }
);

test(
  "keeps USDC native and bridged USDC distinct",
  () => {
    const native =
      classifyCurrency(
        tokens.USDC_NATIVE.address
      );

    const bridged =
      classifyCurrency(
        tokens.USDC_E.address
      );

    assert.equal(
      native.symbol,
      "USDC_NATIVE"
    );

    assert.equal(
      bridged.symbol,
      "USDC_E"
    );

    assert.notEqual(
      native.address,
      bridged.address
    );
  }
);

test(
  "recognizes native POL separately from WPOL",
  () => {
    const native =
      classifyCurrency(
        NATIVE_POL
      );

    const wrapped =
      classifyCurrency(
        tokens.WPOL.address
      );

    assert.equal(
      native.kind,
      "NATIVE_POL"
    );

    assert.equal(
      wrapped.kind,
      "CORE"
    );

    assert.equal(
      wrapped.symbol,
      "WPOL"
    );
  }
);

test(
  "classifies core-core active pool",
  () => {
    const result =
      classifyActivePool(
        pool({
          idByte: "1",
          currency0:
            tokens.USDC_NATIVE.address,
          currency1:
            tokens.DAI.address
        })
      );

    assert.equal(
      result.category,
      "CORE_CORE"
    );

    assert.equal(
      result.quarantined,
      false
    );
  }
);

test(
  "classifies core-exotic active pool",
  () => {
    const result =
      classifyActivePool(
        pool({
          idByte: "2",
          currency0:
            tokens.WETH.address,
          currency1:
            EXOTIC_A
        })
      );

    assert.equal(
      result.category,
      "CORE_EXOTIC"
    );

    assert.deepEqual(
      result.exoticCurrencies,
      [
        EXOTIC_A.toLowerCase()
      ]
    );
  }
);

test(
  "classifies exotic-exotic active pool",
  () => {
    const result =
      classifyActivePool(
        pool({
          idByte: "3",
          currency0:
            EXOTIC_A,
          currency1:
            EXOTIC_B
        })
      );

    assert.equal(
      result.category,
      "EXOTIC_EXOTIC"
    );

    assert.equal(
      result.exoticCurrencies.length,
      2
    );
  }
);

test(
  "quarantines native POL pools",
  () => {
    const result =
      classifyActivePool(
        pool({
          idByte: "4",
          currency0:
            NATIVE_POL,
          currency1:
            tokens.WETH.address
        })
      );

    assert.equal(
      result.category,
      "NATIVE_POL_QUARANTINED"
    );

    assert.equal(
      result.quarantined,
      true
    );
  }
);

test(
  "only ACTIVE observations enter structural classification",
  () => {
    const a =
      pool({
        idByte: "5",
        currency0:
          tokens.WETH.address,
        currency1:
          EXOTIC_A
      });

    const b =
      pool({
        idByte: "6",
        currency0:
          tokens.DAI.address,
        currency1:
          EXOTIC_B
      });

    const result =
      classifyActivePools({
        discoveredPools:
          [a, b],
        activeObservations: [
          {
            poolId: a.poolId,
            ok: true,
            active: true
          },
          {
            poolId: b.poolId,
            ok: true,
            active: false
          }
        ]
      });

    assert.equal(
      result.pools.length,
      1
    );

    assert.equal(
      result.counts.totalActive,
      1
    );

    assert.equal(
      result.counts.coreExotic,
      1
    );
  }
);

test(
  "rejects ACTIVE PoolId absent from verified discovery",
  () => {
    assert.throws(
      () =>
        classifyActivePools({
          discoveredPools: [],
          activeObservations: [
            {
              poolId:
                `0x${"7".repeat(64)}`,
              ok: true,
              active: true
            }
          ]
        }),
      /missing from DISCOVERY/
    );
  }
);

test(
  "aggregate counts preserve all active pools",
  () => {
    const pools = [
      pool({
        idByte: "8",
        currency0:
          tokens.USDC_NATIVE.address,
        currency1:
          tokens.DAI.address
      }),
      pool({
        idByte: "9",
        currency0:
          tokens.WETH.address,
        currency1:
          EXOTIC_A
      }),
      pool({
        idByte: "a",
        currency0:
          EXOTIC_A,
        currency1:
          EXOTIC_B
      }),
      pool({
        idByte: "b",
        currency0:
          NATIVE_POL,
        currency1:
          tokens.WPOL.address
      })
    ];

    const result =
      classifyActivePools({
        discoveredPools:
          pools,
        activeObservations:
          pools.map(
            item => ({
              poolId:
                item.poolId,
              ok: true,
              active: true
            })
          )
      });

    assert.deepEqual(
      result.counts,
      {
        totalActive: 4,
        coreCore: 1,
        coreExotic: 1,
        exoticExotic: 1,
        nativePolQuarantined: 1
      }
    );

    assert.equal(
      result.pools.length,
      4
    );
  }
);
