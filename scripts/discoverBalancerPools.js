"use strict";

// Read-only Balancer Polygon pool discovery.
// API data proposes candidates; Polygon on-chain state verifies them.
// No signer, wallet, approval, flashloan, or transaction submission.

require("dotenv").config();
const { ethers } = require("ethers");
const {
  fetchPools,
  verifiedOverlap,
  verifyPool,
  createVault
} = require("./utils/polygonBalancerDiscovery");
const {
  blocksSinceChange,
  rankCandidates
} = require("./utils/polygonBalancerCandidateRanking");

const provider =
  new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_POLYGON);

(async () => {
  if (!process.env.ALCHEMY_POLYGON) {
    throw new Error("ALCHEMY_POLYGON required");
  }

  const block = await provider.getBlockNumber();
  const vault = createVault(provider);

  console.log("Polygon snapshot block:", block);
  console.log("Live execution: OFF\n");

  const pools = await fetchPools();

  const candidates = pools
    .filter(pool => Number(pool.protocolVersion) === 2)
    .map(pool => ({
      ...pool,
      overlap: verifiedOverlap(pool)
    }))
    .filter(pool => pool.overlap.length >= 3);

  console.log("API pools returned:", pools.length);
  console.log(
    "Candidates with >=3 verified scanner tokens:",
    candidates.length
  );

  let verifiedCount = 0;
  let triangleCount = 0;
  const verifiedCandidates = [];

  for (const pool of candidates) {
    console.log("\n========================================");
    console.log(pool.name);
    console.log("Address:", pool.address);
    console.log("Type:", pool.type);
    console.log("API liquidity:", pool.dynamicData?.totalLiquidity);

    try {
      const result = await verifyPool({
        pool,
        blockTag: block,
        provider,
        vault
      });

      console.log("Pool ID:", result.poolId);
      console.log(
        "API/Vault token set:",
        result.apiMatchesChain ? "MATCH" : "MISMATCH"
      );
      console.log(
        "Verified tokens:",
        result.verifiedTokens.join("/")
      );
      console.log(
        "lastChangeBlock:",
        result.lastChangeBlock.toString()
      );

      const activityAge = blocksSinceChange(
        block,
        result.lastChangeBlock.toNumber()
      );

      console.log(
        "Blocks since last change:",
        activityAge
      );

      if (!result.apiMatchesChain) {
        console.log("REJECTED: API/Vault token mismatch");
        continue;
      }

      if (result.verifiedTokens.length < 3) {
        console.log("REJECTED: insufficient verified tokens");
        continue;
      }

      verifiedCount++;

      verifiedCandidates.push({
        name: pool.name,
        address: pool.address,
        poolId: result.poolId,
        type: pool.type,
        liquidity: pool.dynamicData?.totalLiquidity,
        blocksSinceChange: activityAge,
        verifiedTokens: result.verifiedTokens,
        triangleCount: result.triangles.length
      });

      for (const triangle of result.triangles) {
        triangleCount++;
        console.log("Triangle:", triangle.join(" -> "));
      }
    } catch (err) {
      console.log(
        "REJECTED:",
        err?.reason || err?.message || String(err)
      );
    }
  }

  console.log("\n========================================");
  console.log("On-chain verified candidate pools:", verifiedCount);
  console.log("Generated verified-token triangles:", triangleCount);

  console.log("\nRESEARCH PRIORITY");
  console.log("========================================");

  const ranked = rankCandidates(verifiedCandidates);

  for (const [index, candidate] of ranked.entries()) {
    console.log(
      `${index + 1}. [${candidate.priority}] ${candidate.name}`
    );
    console.log("   Type:", candidate.type);
    console.log("   Liquidity:", candidate.liquidity);
    console.log(
      "   Blocks since last change:",
      candidate.blocksSinceChange
    );
    console.log(
      "   Verified tokens:",
      candidate.verifiedTokens.join("/")
    );
    console.log("   Triangles:", candidate.triangleCount);
    console.log(
      "   Flags:",
      candidate.reasons.length
        ? candidate.reasons.join(", ")
        : "none"
    );
  }

  console.log("\nPriority is for research ordering only.");
  console.log("No candidate is removed by ranking.");
  console.log("Live execution: OFF");
})();
