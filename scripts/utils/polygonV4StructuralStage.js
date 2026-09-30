"use strict";

// Resumable orchestration helpers for Polygon V4 STRUCTURAL research.
//
// Pure/state-oriented logic lives here so the main research runner remains
// small. RPC-capable functions are injected by the runner/tests.
//
// No signer, wallet, approvals, transaction submission, ProfitBot execution,
// or MetaMask interaction.

const {
  RPC_FAILURE
} = require("./polygonV4OuterQuoteObserver");

const {
  classifyActivePools
} = require("./polygonV4Structural");

function pairKey(
  coreAddress,
  exoticAddress
) {
  return (
    `${String(coreAddress).toLowerCase()}:` +
    `${String(exoticAddress).toLowerCase()}`
  );
}

function getStructuralProgress(state) {
  const existing =
    state?.stages?.STRUCTURAL;

  if (
    !existing ||
    typeof existing !== "object"
  ) {
    return {
      classifications: null,
      metadata: {},
      outerEvidence: {},
      unresolved: []
    };
  }

  return {
    classifications:
      existing.classifications &&
      typeof existing.classifications === "object"
        ? existing.classifications
        : null,

    metadata:
      existing.metadata &&
      typeof existing.metadata === "object"
        ? existing.metadata
        : {},

    outerEvidence:
      existing.outerEvidence &&
      typeof existing.outerEvidence === "object"
        ? existing.outerEvidence
        : {},

    unresolved:
      Array.isArray(existing.unresolved)
        ? existing.unresolved
        : []
  };
}

function buildStructuralClassifications({
  discoveredPools,
  activeObservations
}) {
  return classifyActivePools({
    discoveredPools,
    activeObservations
  });
}

function collectUniqueExoticAddresses(
  classifications
) {
  if (
    !classifications ||
    !Array.isArray(
      classifications.pools
    )
  ) {
    throw new Error(
      "Structural classifications required"
    );
  }

  const seen =
    new Set();

  const result = [];

  for (
    const pool of
    classifications.pools
  ) {
    if (pool.quarantined) {
      continue;
    }

    for (
      const address of
      pool.exoticCurrencies || []
    ) {
      const normalized =
        String(address)
          .toLowerCase();

      if (!seen.has(normalized)) {
        seen.add(normalized);
        result.push(normalized);
      }
    }
  }

  return result;
}

function metadataIsResolved(
  observation
) {
  return Boolean(
    observation &&
    observation.status ===
      "METADATA_OK" &&
    Number.isInteger(
      observation.decimals
    )
  );
}

function evidenceIsConclusive(
  evidence
) {
  if (
    !evidence ||
    typeof evidence !== "object"
  ) {
    return false;
  }

  if (evidence.conclusive !== true) {
    return false;
  }

  return (
    evidence.entry?.summary?.status !==
      RPC_FAILURE &&
    evidence.exit?.summary?.status !==
      RPC_FAILURE
  );
}

function supportedOrientationsForPool({
  pool,
  outerEvidence,
  coreTokens
}) {
  if (
    !pool ||
    typeof pool !== "object"
  ) {
    throw new Error(
      "Structural pool required"
    );
  }

  if (!Array.isArray(coreTokens)) {
    throw new Error(
      "Core token list required"
    );
  }

  if (pool.quarantined) {
    return [];
  }

  const c0 =
    pool.currency0;

  const c1 =
    pool.currency1;

  if (!c0 || !c1) {
    throw new Error(
      "Structural pool currencies required"
    );
  }

  const orientations = [];

  for (const core of coreTokens) {
    const coreAddress =
      String(core.address)
        .toLowerCase();

    const start = {
      symbol: core.symbol,
      address: coreAddress,
      decimals: core.decimals
    };

    // Forward orientation:
    // core -> currency0 ->V4-> currency1 -> core
    let forwardEntry = true;
    let forwardExit = true;

    if (
      String(c0.address)
        .toLowerCase() !==
      coreAddress
    ) {
      if (c0.kind !== "EXOTIC") {
        forwardEntry = false;
      } else {
        const evidence =
          outerEvidence[
            pairKey(
              coreAddress,
              c0.address
            )
          ];

        forwardEntry =
          evidenceIsConclusive(
            evidence
          ) &&
          evidence.hasEntry === true;
      }
    }

    if (
      String(c1.address)
        .toLowerCase() !==
      coreAddress
    ) {
      if (c1.kind !== "EXOTIC") {
        forwardExit = false;
      } else {
        const evidence =
          outerEvidence[
            pairKey(
              coreAddress,
              c1.address
            )
          ];

        forwardExit =
          evidenceIsConclusive(
            evidence
          ) &&
          evidence.hasExit === true;
      }
    }

    if (
      forwardEntry &&
      forwardExit
    ) {
      orientations.push({
        direction:
          "ZERO_FOR_ONE",
        start
      });
    }

    // Reverse orientation:
    // core -> currency1 ->V4-> currency0 -> core
    let reverseEntry = true;
    let reverseExit = true;

    if (
      String(c1.address)
        .toLowerCase() !==
      coreAddress
    ) {
      if (c1.kind !== "EXOTIC") {
        reverseEntry = false;
      } else {
        const evidence =
          outerEvidence[
            pairKey(
              coreAddress,
              c1.address
            )
          ];

        reverseEntry =
          evidenceIsConclusive(
            evidence
          ) &&
          evidence.hasEntry === true;
      }
    }

    if (
      String(c0.address)
        .toLowerCase() !==
      coreAddress
    ) {
      if (c0.kind !== "EXOTIC") {
        reverseExit = false;
      } else {
        const evidence =
          outerEvidence[
            pairKey(
              coreAddress,
              c0.address
            )
          ];

        reverseExit =
          evidenceIsConclusive(
            evidence
          ) &&
          evidence.hasExit === true;
      }
    }

    if (
      reverseEntry &&
      reverseExit
    ) {
      orientations.push({
        direction:
          "ONE_FOR_ZERO",
        start
      });
    }
  }

  return orientations;
}

function buildStructuralResults({
  classifications,
  outerEvidence,
  coreTokens
}) {
  if (
    !classifications ||
    !Array.isArray(
      classifications.pools
    )
  ) {
    throw new Error(
      "Structural classifications required"
    );
  }

  const pools =
    classifications.pools.map(
      pool => {
        if (pool.quarantined) {
          return {
            poolId:
              pool.poolId,
            category:
              pool.category,
            quarantined: true,
            quarantineReason:
              "NATIVE_POL",
            orientations: []
          };
        }

        // CORE_CORE needs a third start asset to preserve the
        // exact three-distinct-swap topology:
        //
        // startCore -> currency0 ->V4-> currency1 -> startCore
        //
        // This stage does not yet hold core-to-core outer quote evidence,
        // so preserve the market for later probing instead of fabricating
        // an identity leg or falsely rejecting it.
        if (pool.category === "CORE_CORE") {
          return {
            poolId:
              pool.poolId,
            category:
              pool.category,
            quarantined: false,
            deferredCoreCore: true,
            orientations: []
          };
        }

        const orientations =
          supportedOrientationsForPool({
            pool,
            outerEvidence,
            coreTokens
          });

        return {
          poolId:
            pool.poolId,
          category:
            pool.category,
          quarantined: false,
          deferredCoreCore: false,
          orientations
        };
      }
    );

  return {
    pools,
    counts: {
      totalActive:
        classifications.counts
          .totalActive,

      quarantined:
        pools.filter(
          pool =>
            pool.quarantined
        ).length,

      deferredCoreCore:
        pools.filter(
          pool =>
            pool.deferredCoreCore === true
        ).length,

      withOrientation:
        pools.filter(
          pool =>
            !pool.quarantined &&
            pool.deferredCoreCore !== true &&
            pool.orientations.length > 0
        ).length,

      withoutOrientation:
        pools.filter(
          pool =>
            !pool.quarantined &&
            pool.deferredCoreCore !== true &&
            pool.orientations.length === 0
        ).length
    }
  };
}

module.exports = {
  pairKey,
  getStructuralProgress,
  buildStructuralClassifications,
  collectUniqueExoticAddresses,
  metadataIsResolved,
  evidenceIsConclusive,
  supportedOrientationsForPool,
  buildStructuralResults
};
