"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  MICRO_START_WEI,
  MICRO_END_WEI,
  MICRO_STEP_WEI,
  microProtectedAmounts,
  runProtectedMicroSurface
} = require(
  "../scripts/research/runPolygonV4ProtectedMicroSurface"
);

test(
  "micro protected surface uses exact 0.1210 through 0.1250 WPOL grid",
  () => {
    const amounts =
      microProtectedAmounts();

    assert.equal(
      amounts.length,
      41
    );

    assert.deepEqual(
      amounts.map(row => row.display),
      Array.from(
        { length: 41 },
        (_, index) =>
          ethers.utils.formatEther(
            MICRO_START_WEI.add(
              MICRO_STEP_WEI.mul(index)
            )
          )
      )
    );

    assert.equal(
      amounts[0].amount,
      ethers.utils
        .parseEther("0.1210")
        .toString()
    );

    assert.equal(
      amounts[20].amount,
      ethers.utils
        .parseEther("0.1230")
        .toString()
    );

    assert.equal(
      amounts[40].amount,
      ethers.utils
        .parseEther("0.1250")
        .toString()
    );

    assert.equal(
      MICRO_END_WEI.toString(),
      amounts[40].amount
    );
  }
);

test(
  "micro protected amount generator rejects invalid ranges and steps",
  () => {
    assert.throws(
      () =>
        microProtectedAmounts({
          startWei: 0,
          endWei: 1,
          stepWei: 1
        }),
      /startWei must be positive/
    );

    assert.throws(
      () =>
        microProtectedAmounts({
          startWei: 2,
          endWei: 1,
          stepWei: 1
        }),
      /endWei must be greater/
    );

    assert.throws(
      () =>
        microProtectedAmounts({
          startWei: 1,
          endWei: 2,
          stepWei: 0
        }),
      /stepWei must be positive/
    );
  }
);

test(
  "micro protected runner delegates exact amounts and shared snapshot",
  async () => {
    const provider = {};

    const gasPriceWei =
      ethers.BigNumber.from(
        "277605756458"
      );

    const amounts = [
      {
        display: "0.1229",
        amount:
          ethers.utils
            .parseEther("0.1229")
            .toString()
      },
      {
        display: "0.123",
        amount:
          ethers.utils
            .parseEther("0.1230")
            .toString()
      }
    ];

    let captured = null;

    const expected = {
      snapshot: {
        blockTag: 94833132
      },
      rows: [],
      bestProtected: null
    };

    const result =
      await runProtectedMicroSurface({
        provider,
        blockTag: 94833132,
        gasPriceWei,
        premiumBps: 5,
        amounts,
        runFineSurfaceFn:
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
      94833132
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
