"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const { ethers } =
  require("ethers");

const {
  exactAmounts,
  requireSnapshot,
  economicRow,
  bestProtectedRow,
  runAmountSurface
} = require(
  "../scripts/research/runPolygonV4AmountSurface"
);

test(
  "amount surface runner reuses exact fine-sweep sizes",
  () => {
    assert.deepEqual(
      exactAmounts().map(
        row => row.amount
      ),
      [
        "100000000000000000",
        "105000000000000000",
        "110000000000000000",
        "115000000000000000",
        "120000000000000000",
        "125000000000000000",
        "130000000000000000",
        "135000000000000000",
        "140000000000000000",
        "145000000000000000",
        "150000000000000000"
      ]
    );
  }
);

test(
  "snapshot validation preserves one block gas price and premium",
  () => {
    const snapshot =
      requireSnapshot({
        blockTag:
          123456,
        gasPriceWei:
          "100",
        premiumBps:
          5
      });

    assert.equal(
      snapshot.blockTag,
      123456
    );

    assert.equal(
      snapshot.gasPriceWei
        .toString(),
      "100"
    );

    assert.equal(
      snapshot.premiumBps,
      5
    );

    assert.throws(
      () =>
        requireSnapshot({
          blockTag: 0,
          gasPriceWei: "100",
          premiumBps: 5
        }),
      /blockTag/
    );

    assert.throws(
      () =>
        requireSnapshot({
          blockTag: 1,
          gasPriceWei: "0",
          premiumBps: 5
        }),
      /gasPriceWei/
    );

    assert.throws(
      () =>
        requireSnapshot({
          blockTag: 1,
          gasPriceWei: "100",
          premiumBps: 10000
        }),
      /premiumBps/
    );
  }
);

test(
  "quoted observation receives protected economics",
  () => {
    const row =
      economicRow({
        display:
          "0.125",
        amount:
          "125000000000000000",
        observation: {
          status:
            "QUOTE_OK",
          amounts: {
            final:
              "144998569388452416"
          },
          grossDelta:
            "19998569388452416"
        },
        snapshot: {
          blockTag:
            94779407,
          gasPriceWei:
            ethers.BigNumber.from(
              "266300438750"
            ),
          premiumBps:
            5
        }
      });

    assert.equal(
      row.protectedGasBudgetWei,
      "13211076541510153"
    );

    assert.equal(
      row.gasPriceCeilingWei,
      "18872966487"
    );

    assert.equal(
      row.economicDeficitWei,
      "173199230583489847"
    );

    assert.equal(
      row.qualifiesAtObservedGas,
      false
    );
  }
);

test(
  "failed quote remains visible without invented economics",
  () => {
    const row =
      economicRow({
        display:
          "0.130",
        amount:
          "130000000000000000",
        observation: {
          status:
            "RPC_FAILURE",
          failedLeg:
            "V4"
        },
        snapshot: {
          blockTag:
            123,
          gasPriceWei:
            ethers.BigNumber.from(
              "100"
            ),
          premiumBps:
            5
        }
      });

    assert.equal(
      row.status,
      "RPC_FAILURE"
    );

    assert.equal(
      row.failedLeg,
      "V4"
    );

    assert.equal(
      row.protectedGasBudgetWei,
      null
    );

    assert.equal(
      row.qualifiesAtObservedGas,
      null
    );
  }
);

test(
  "best protected row ranks protected budget not raw gross",
  () => {
    const rows = [
      {
        startDisplay:
          "0.100",
        status:
          "QUOTE_OK",
        grossDelta:
          "20000",
        protectedGasBudgetWei:
          "9000"
      },
      {
        startDisplay:
          "0.125",
        status:
          "QUOTE_OK",
        grossDelta:
          "30000",
        protectedGasBudgetWei:
          "8000"
      },
      {
        startDisplay:
          "0.150",
        status:
          "RPC_FAILURE",
        grossDelta:
          null,
        protectedGasBudgetWei:
          null
      }
    ];

    assert.equal(
      bestProtectedRow(rows)
        .startDisplay,
      "0.100"
    );
  }
);

test(
  "runner pins every quote to one shared policy snapshot",
  async () => {
    const calls = [];

    const observeFn =
      async args => {
        calls.push(args);

        const start =
          ethers.BigNumber.from(
            args.startAmount
          );

        return {
          status:
            "QUOTE_OK",
          amounts: {
            start:
              start.toString(),
            afterEntry:
              start.toString(),
            afterV4:
              start.toString(),
            final:
              start
                .add(
                  ethers.utils
                    .parseEther(
                      "0.020"
                    )
                )
                .toString()
          },
          grossDelta:
            ethers.utils
              .parseEther(
                "0.020"
              )
              .toString()
        };
      };

    const result =
      await runAmountSurface({
        provider: {},
        blockTag:
          999,
        gasPriceWei:
          "1000000000",
        premiumBps:
          5,
        amounts: [
          {
            display:
              "0.100",
            amount:
              "100000000000000000"
          },
          {
            display:
              "0.125",
            amount:
              "125000000000000000"
          }
        ],
        observeFn
      });

    assert.equal(
      calls.length,
      2
    );

    assert.deepEqual(
      calls.map(
        call => call.blockTag
      ),
      [
        999,
        999
      ]
    );

    assert.deepEqual(
      calls.map(
        call => call.startAmount
      ),
      [
        "100000000000000000",
        "125000000000000000"
      ]
    );

    assert.equal(
      result.snapshot.blockTag,
      999
    );

    assert.equal(
      result.snapshot.gasPriceWei,
      "1000000000"
    );

    assert.equal(
      result.snapshot.premiumBps,
      5
    );

    assert.equal(
      result.rows.length,
      2
    );
  }
);
