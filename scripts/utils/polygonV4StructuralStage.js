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

function endpointEvidence({
  startCore,
  endpoint,
  outerEvidence
}) {
  const startAddress =
    String(startCore.address)
      .toLowerCase();

  const endpointAddress =
    String(endpoint.address)
      .toLowerCase();

  // Exact-three-swap structural routes cannot use an
  // identity leg. If a V4 endpoint equals the flashloan
  // start asset, this orientation has only two real swaps.
  if (
    startAddress ===
    endpointAddress
  ) {
    return null;
  }

  return outerEvidence[
    pairKey(
      startAddress,
      endpointAddress
    )
  ] || null;
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

    const c0Address =
      String(c0.address)
        .toLowerCase();

    const c1Address =
      String(c1.address)
        .toLowerCase();

    // Either equality would make one external leg an
    // identity operation, leaving only two actual swaps.
    if (
      c0Address === coreAddress ||
      c1Address === coreAddress
    ) {
      continue;
    }

    const c0Evidence =
      endpointEvidence({
        startCore: core,
        endpoint: c0,
        outerEvidence
      });

    const c1Evidence =
      endpointEvidence({
        startCore: core,
        endpoint: c1,
        outerEvidence
      });

    const start = {
      symbol: core.symbol,
      address: coreAddress,
      decimals: core.decimals
    };

    // startCore -> currency0 ->V4-> currency1 -> startCore
    if (
      evidenceIsConclusive(
        c0Evidence
      ) &&
      c0Evidence.hasEntry === true &&
      evidenceIsConclusive(
        c1Evidence
      ) &&
      c1Evidence.hasExit === true
    ) {
      orientations.push({
        direction:
          "ZERO_FOR_ONE",
        start
      });
    }

    // startCore -> currency1 ->V4-> currency0 -> startCore
    if (
      evidenceIsConclusive(
        c1Evidence
      ) &&
      c1Evidence.hasEntry === true &&
      evidenceIsConclusive(
        c0Evidence
      ) &&
      c0Evidence.hasExit === true
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

      withOrientation:
        pools.filter(
          pool =>
            !pool.quarantined &&
            pool.orientations.length > 0
        ).length,

      withoutOrientation:
        pools.filter(
          pool =>
            !pool.quarantined &&
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
  endpointEvidence,
  supportedOrientationsForPool,
  buildStructuralResults
};
