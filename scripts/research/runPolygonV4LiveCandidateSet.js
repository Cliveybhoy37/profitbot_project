"use strict";

// Current-state qualification of the historically meaningful
// Polygon V4 candidate cluster.
//
// Provider only.
// No signer.
// No wallet.
// No transaction.
// No broadcast.

const { ethers } =
  require("ethers");

const {
  CHAIN_ID,
  WPOL,
  DAI,
  APEPE,
  qualifyLiveRoute
} = require(
  "./runPolygonV4LiveQualification"
);

const {
  POOL_ID,
  POOL_KEY
} = require(
  "./runPolygonV4TargetedSweep"
);

const {
  resolveAaveEconomics
} = require(
  "../utils/polygonAaveEconomics"
);

const CANDIDATES =
  Object.freeze([
    {
      id: "V3_075",
      amount:
        ethers.utils.parseEther(
          "0.075"
        ),
      entryVenue:
        "UNISWAP_V3"
    },
    {
      id: "SUSHI_V2_075",
      amount:
        ethers.utils.parseEther(
          "0.075"
        ),
      entryVenue:
        "SUSHISWAP_V2"
    },
    {
      id: "QUICK_V2_075",
      amount:
        ethers.utils.parseEther(
          "0.075"
        ),
      entryVenue:
        "QUICKSWAP_V2"
    },
    {
      id: "V3_125_OPTIMIZED",
      amount:
        ethers.utils.parseEther(
          "0.125"
        ),
      entryVenue:
        "UNISWAP_V3"
    }
  ]);

function ether(value) {
  return ethers.utils.formatEther(
    value
  );
}

async function qualifyCandidateSet({
  provider,
  blockTag = null
}) {
  const quoteBlock =
    blockTag == null
      ? await provider.getBlockNumber()
      : blockTag;

  const [
    gasPriceWei,
    aave
  ] =
    await Promise.all([
      provider.getGasPrice(),
      resolveAaveEconomics(
        provider,
        undefined,
        quoteBlock
      )
    ]);

  const premiumBps =
    Number(
      aave.premiumBps
    );

  if (
    !Number.isSafeInteger(
      premiumBps
    )
  ) {
    throw new Error(
      "Aave premium does not fit safe integer"
    );
  }

  // Use the quote block itself as the shared policy head.
  // Every candidate is quoted against this exact block, so age=0
  // regardless of how many RPC calls later candidates require.
  const policySnapshot = {
    currentBlock:
      quoteBlock,
    gasPriceWei,
    premiumBps
  };

  const rows = [];

  for (
    const spec of CANDIDATES
  ) {
    let result;

    try {
      result =
        await qualifyLiveRoute({
          provider,
          blockTag:
            quoteBlock,
          startAmount:
            spec.amount,
          entryVenue:
            spec.entryVenue,
          startToken:
            WPOL,
          entryToken:
            DAI,
          poolKey:
            POOL_KEY,
          zeroForOne:
            true,
          exitToken:
            APEPE,
          exitVenue:
            "UNISWAP_V3",
          poolId:
            POOL_ID,
          policySnapshot
        });
    } catch (error) {
      result = {
        liveReady: false,
        stage: "ERROR",
        blockTag:
          quoteBlock,
        reason:
          error?.message ||
          "UNKNOWN_FAILURE"
      };
    }

    rows.push({
      spec,
      result
    });
  }

  return {
    quoteBlock,
    policySnapshot,
    rows
  };
}

async function main() {
  const rpc =
    process.env.INFURA_POLYGON;

  if (!rpc) {
    throw new Error(
      "INFURA_POLYGON is not set"
    );
  }

  const provider =
    new ethers.providers
      .JsonRpcProvider(
        rpc,
        CHAIN_ID
      );

  console.log(
    "===== POLYGON V4 LIVE CANDIDATE SET ====="
  );

  console.log(
    "Provider only / NO SIGNER / NO TRANSACTION"
  );

  console.log(
    "Route family: WPOL -> DAI -> APEPE -> WPOL"
  );

  const qualification =
    await qualifyCandidateSet({
      provider
    });

  console.log(
    "Shared quote block:",
    qualification.quoteBlock
  );

  console.log(
    "Shared policy block:",
    qualification.policySnapshot
      .currentBlock
  );

  console.log(
    "Shared gas price gwei:",
    ethers.utils.formatUnits(
      qualification.policySnapshot
        .gasPriceWei,
      "gwei"
    )
  );

  console.log(
    "Shared Aave premium bps:",
    qualification.policySnapshot
      .premiumBps
  );

  let readyCount = 0;

  for (
    const {
      spec,
      result
    } of qualification.rows
  ) {
    console.log();
    console.log(
      `===== ${spec.id} =====`
    );

    console.log(
      "Amount WPOL:",
      ether(spec.amount)
    );

    console.log(
      "Entry venue:",
      spec.entryVenue
    );

    console.log(
      "Stage:",
      result.stage
    );

    if (
      result.observation?.status ===
        "QUOTE_OK"
    ) {
      console.log(
        "Fresh final WPOL:",
        ether(
          ethers.BigNumber.from(
            result.observation
              .amounts.final
          )
        )
      );

      console.log(
        "Fresh gross WPOL:",
        ether(
          ethers.BigNumber.from(
            result.observation
              .grossDelta
          )
        )
      );
    }

    if (
      result.gasPriceWei
    ) {
      console.log(
        "Gas price gwei:",
        ethers.utils.formatUnits(
          result.gasPriceWei,
          "gwei"
        )
      );
    }

    if (
      result.preflight
    ) {
      console.log(
        "Expected net WPOL:",
        ether(
          result.preflight
            .expectedNetProfit
        )
      );

      console.log(
        "Worst-case net WPOL:",
        ether(
          result.preflight
            .worstCaseNetProfit
        )
      );
    }

    if (
      result.liveReady
    ) {
      readyCount += 1;

      console.log(
        "LIVE_READY=true"
      );

      console.log(
        "Encoded plan bytes:",
        ethers.utils.arrayify(
          result.params
        ).length
      );
    } else {
      console.log(
        "LIVE_READY=false"
      );

      console.log(
        "Reason:",
        result.reason ||
        result.status ||
        result.failedLeg ||
        "NOT_QUALIFIED"
      );
    }
  }

  console.log();
  console.log(
    "===== SUMMARY ====="
  );

  console.log(
    "Candidates checked:",
    qualification.rows.length
  );

  console.log(
    "LIVE_READY count:",
    readyCount
  );

  console.log(
    "BROADCAST=false"
  );
}

if (require.main === module) {
  main().catch(error => {
    console.error(
      "CANDIDATE_SET_FAILED",
      error?.code ||
      error?.name ||
      "UNKNOWN"
    );

    console.error(
      error?.message ||
      "Unknown failure"
    );

    process.exitCode = 1;
  });
}

module.exports = {
  CANDIDATES,
  qualifyCandidateSet
};
