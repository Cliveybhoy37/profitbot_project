"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  START_WEI,
  END_WEI,
  STEP_WEI,
  fineProtectedAmounts,
  runProtectedFineSurface
} = require(
  "../scripts/research/runPolygonV4ProtectedFineSurface"
);

test(
  "fine protected surface uses exact 0.105 through 0.130 WPOL grid",
  () => {
    const amounts =
      fineProtectedAmounts();

    assert.equal(
      amounts.length,
      26
    );

    assert.deepEqual(
      amounts.map(row => row.display),
      Array.from(
        { length: 26 },
        (_, index) =>
          ethers.utils.formatEther(
            START_WEI.add(
              STEP_WEI.mul(index)
            )
          )
      )
    );

    assert.equal(
      amounts[0].amount,
      ethers.utils
        .parseEther("0.105")
        .toString()
    );

    assert.equal(
      amounts[10].amount,
      ethers.utils
        .parseEther("0.115")
        .toString()
    );

    assert.equal(
      amounts[25].amount,
      ethers.utils
        .parseEther("0.130")
        .toString()
    );

    assert.equal(
      END_WEI.toString(),
      amounts[25].amount
    );
  }
);

test(
  "fine protected amount generator rejects invalid ranges and steps",
  () => {
    assert.throws(
      () =>
        fineProtectedAmounts({
          startWei: 0,
          endWei: 1,
          stepWei: 1
        }),
      /startWei must be positive/
    );

    assert.throws(
      () =>
        fineProtectedAmounts({
          startWei: 2,
          endWei: 1,
          stepWei: 1
        }),
      /endWei must be greater/
    );

    assert.throws(
      () =>
        fineProtectedAmounts({
          startWei: 1,
          endWei: 2,
          stepWei: 0
        }),
      /stepWei must be positive/
    );
  }
);

test(
  "fine protected runner delegates exact amounts and shared snapshot",
  async () => {
    const provider = {};
    const gasPriceWei =
      ethers.BigNumber.from(
        "275399891388"
      );

    const amounts = [
      {
        display: "0.114",
        amount:
          ethers.utils
            .parseEther("0.114")
            .toString()
      },
      {
        display: "0.115",
        amount:
          ethers.utils
            .parseEther("0.115")
            .toString()
      }
    ];

    let captured = null;

    const expected = {
      snapshot: {
        blockTag: 94830650
      },
      rows: [],
      bestProtected: null
    };

    const result =
      await runProtectedFineSurface({
        provider,
        blockTag: 94830650,
        gasPriceWei,
        premiumBps: 5,
        amounts,
        runSurfaceFn:
          async args => {
            captured = args;
            return expected;
          }
      });

    assert.equal(
      result,
      expected
    );

    assert.equal(
      captured.provider,
      provider
    );

    assert.equal(
      captured.blockTag,
      94830650
    );

    assert.equal(
      captured.gasPriceWei,
      gasPriceWei
    );

    assert.equal(
      captured.premiumBps,
      5
    );

    assert.deepEqual(
      captured.amounts,
      amounts
    );
  }
);
