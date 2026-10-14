"use strict";

// Pure STRUCTURAL -> ECONOMICS job construction.
//
// No RPC calls.
// No signer or wallet.
// No transactions.
// No state mutation.
//
// A job represents exactly:
//
//   start
//     -> V4 input currency   [external ENTRY]
//     -> V4 output currency  [V4]
//     -> start               [external EXIT]
//
// Structural one-token observations are used ONLY to determine
// which external venues are known-connected. Their quoted amounts
// are never reused for economics.

const {
  QUOTE_OK
} = require("./polygonV4OuterQuoteObserver");

const ZERO_FOR_ONE =
  "ZERO_FOR_ONE";

const ONE_FOR_ZERO =
  "ONE_FOR_ZERO";

function normalizeAddress(value) {
  if (
    typeof value !== "string" ||
    !/^0x[0-9a-fA-F]{40}$/.test(value)
  ) {
    throw new Error(
      `Invalid address: ${String(value)}`
    );
  }

  return value.toLowerCase();
}

function normalizePoolId(value) {
  if (
    typeof value !== "string" ||
    !/^0x[0-9a-fA-F]{64}$/.test(value)
  ) {
    throw new Error(
      `Invalid PoolId: ${String(value)}`
    );
  }

  return value.toLowerCase();
}

function pairKey(
  start,
  candidate
) {
  return (
    `${normalizeAddress(start)}:` +
    `${normalizeAddress(candidate)}`
  );
}

function orientationTokens({
  poolKey,
  direction
}) {
  if (
    !poolKey ||
    typeof poolKey !== "object"
  ) {
    throw new Error(
      "Economics job requires PoolKey"
    );
  }

  const currency0 =
    normalizeAddress(
      poolKey.currency0
    );

  const currency1 =
    normalizeAddress(
      poolKey.currency1
    );

  if (
    currency0 === currency1
  ) {
    throw new Error(
      "V4 PoolKey currencies must differ"
    );
  }

  if (
    direction === ZERO_FOR_ONE
  ) {
    return {
      zeroForOne: true,
      entryToken: currency0,
      exitToken: currency1
    };
  }

  if (
    direction === ONE_FOR_ZERO
  ) {
    return {
      zeroForOne: false,
      entryToken: currency1,
      exitToken: currency0
    };
  }

  throw new Error(
    `Unsupported V4 direction: ${String(direction)}`
  );
}

function quoteOkVenues(
  directionEvidence
) {
  if (
    !directionEvidence ||
    !Array.isArray(
      directionEvidence.observations
    )
  ) {
    return [];
  }

  const venues = [];

  for (
    const observation of
      directionEvidence.observations
  ) {
    if (
      observation?.status !==
        QUOTE_OK ||
      typeof observation.venue !==
        "string" ||
      observation.venue.length === 0
    ) {
      continue;
    }

    if (
      !venues.includes(
        observation.venue
      )
    ) {
      venues.push(
        observation.venue
      );
    }
  }

  return venues;
}

function findClassification({
  poolId,
  classifications
}) {
  if (
    !classifications ||
    !Array.isArray(
      classifications.pools
    )
  ) {
    throw new Error(
      "STRUCTURAL classifications.pools missing"
    );
  }

  const wanted =
    normalizePoolId(poolId);

  const matches =
    classifications.pools.filter(
      pool =>
        normalizePoolId(
          pool.poolId
        ) === wanted
    );

  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one classification for ${wanted}; found ${matches.length}`
    );
  }

  return matches[0];
}

function jobId({
  poolId,
  direction,
  startToken,
  entryVenue,
  exitVenue
}) {
  return [
    normalizePoolId(poolId),
    direction,
    normalizeAddress(startToken),
    entryVenue,
    exitVenue
  ].join(":");
}

function buildOrientationJobs({
  resultPool,
  orientation,
  classification,
  outerEvidence
}) {
  if (
    !resultPool ||
    !orientation ||
    !classification
  ) {
    throw new Error(
      "Economics orientation job input missing"
    );
  }

  if (
    !outerEvidence ||
    typeof outerEvidence !== "object"
  ) {
    throw new Error(
      "STRUCTURAL outerEvidence missing"
    );
  }

  const resultPoolId =
    normalizePoolId(
      resultPool.poolId
    );

  const classificationPoolId =
    normalizePoolId(
      classification.poolId
    );

  if (
    resultPoolId !==
    classificationPoolId
  ) {
    throw new Error(
      "Result/classification PoolId mismatch"
    );
  }

  if (
    classification.quarantined
  ) {
    return [];
  }

  const start =
    orientation.start;

  if (
    !start ||
    typeof start !== "object"
  ) {
    throw new Error(
      "Orientation start token missing"
    );
  }

  const startToken =
    normalizeAddress(
      start.address
    );

  const {
    zeroForOne,
    entryToken,
    exitToken
  } =
    orientationTokens({
      poolKey:
        classification.poolKey,
      direction:
        orientation.direction
    });

  // Exact-three-leg invariant:
  // neither external leg may collapse
  // into start -> start identity.
  if (
    startToken === entryToken ||
    startToken === exitToken
  ) {
    return [];
  }

  const entryEvidence =
    outerEvidence[
      pairKey(
        startToken,
        entryToken
      )
    ];

  const exitEvidence =
    outerEvidence[
      pairKey(
        startToken,
        exitToken
      )
    ];

  // Structural evidence must be fully
  // conclusive before economics can
  // turn it into executable quote jobs.
  if (
    !entryEvidence?.conclusive ||
    !exitEvidence?.conclusive
  ) {
    return [];
  }

  const entryVenues =
    quoteOkVenues(
      entryEvidence.entry
    );

  const exitVenues =
    quoteOkVenues(
      exitEvidence.exit
    );

  if (
    entryVenues.length === 0 ||
    exitVenues.length === 0
  ) {
    return [];
  }

  const jobs = [];

  for (
    const entryVenue of
      entryVenues
  ) {
    for (
      const exitVenue of
        exitVenues
    ) {
      jobs.push({
        id: jobId({
          poolId:
            resultPoolId,
          direction:
            orientation.direction,
          startToken,
          entryVenue,
          exitVenue
        }),

        poolId:
          resultPoolId,

        direction:
          orientation.direction,

        zeroForOne,

        start: {
          symbol:
            start.symbol ?? null,
          address:
            startToken,
          decimals:
            start.decimals
        },

        entryToken,
        exitToken,

        entryVenue,
        exitVenue,

        poolKey: {
          currency0:
            normalizeAddress(
              classification
                .poolKey
                .currency0
            ),
          currency1:
            normalizeAddress(
              classification
                .poolKey
                .currency1
            ),
          fee:
            classification
              .poolKey
              .fee,
          tickSpacing:
            classification
              .poolKey
              .tickSpacing,
          hooks:
            normalizeAddress(
              classification
                .poolKey
                .hooks
            )
        }
      });
    }
  }

  return jobs;
}

function buildEconomicsJobs({
  structural
}) {
  if (
    !structural ||
    typeof structural !== "object"
  ) {
    throw new Error(
      "STRUCTURAL stage missing"
    );
  }

  const resultPools =
    structural.results?.pools;

  if (
    !Array.isArray(resultPools)
  ) {
    throw new Error(
      "STRUCTURAL results.pools missing"
    );
  }

  const jobs = [];

  for (
    const resultPool of
      resultPools
  ) {
    if (
      resultPool.quarantined ||
      !Array.isArray(
        resultPool.orientations
      ) ||
      resultPool.orientations
        .length === 0
    ) {
      continue;
    }

    const classification =
      findClassification({
        poolId:
          resultPool.poolId,
        classifications:
          structural
            .classifications
      });

    for (
      const orientation of
        resultPool.orientations
    ) {
      jobs.push(
        ...buildOrientationJobs({
          resultPool,
          orientation,
          classification,
          outerEvidence:
            structural
              .outerEvidence
        })
      );
    }
  }

  return jobs;
}

module.exports = {
  ZERO_FOR_ONE,
  ONE_FOR_ZERO,
  normalizeAddress,
  normalizePoolId,
  pairKey,
  orientationTokens,
  quoteOkVenues,
  findClassification,
  jobId,
  buildOrientationJobs,
  buildEconomicsJobs
};
