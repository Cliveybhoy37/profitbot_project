"use strict";

// Read-only Balancer Polygon pool discovery.
// API data proposes candidates; Polygon on-chain state verifies them.
// No signer, wallet, approval, flashloan, or transaction submission.

require("dotenv").config();
const { ethers } = require("ethers");
const TOKENS = require("./utils/polygonScannerTokens");

const ENDPOINT = "https://api-v3.balancer.fi/graphql";
const VAULT = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

const provider =
  new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_POLYGON);

const POOL_ABI = [
  "function getPoolId() view returns (bytes32)"
];

const VAULT_ABI = [
  "function getPoolTokens(bytes32) view returns (address[] tokens,uint256[] balances,uint256 lastChangeBlock)"
];

const knownByAddress = new Map(
  Object.entries(TOKENS).map(([symbol, token]) => [
    token.address.toLowerCase(),
    symbol
  ])
);

async function fetchPools() {
  const query = `
    query {
      poolGetPools(
        where: { chainIn: [POLYGON] }
        first: 100
      ) {
        address
        name
        type
        protocolVersion
        dynamicData {
          totalLiquidity
        }
        poolTokens {
          address
          symbol
          decimals
        }
      }
    }
  `;

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query })
  });

  const body = await response.json();

  if (!response.ok || body.errors) {
    throw new Error(
      `Balancer API failure: HTTP ${response.status} ${JSON.stringify(body.errors || body)}`
    );
  }

  return body.data?.poolGetPools || [];
}

function verifiedOverlap(pool) {
  return [
    ...new Set(
      pool.poolTokens
        .map(token => knownByAddress.get(token.address.toLowerCase()))
        .filter(Boolean)
    )
  ];
}

function combinations3(items) {
  const result = [];

  for (let i = 0; i < items.length - 2; i++) {
    for (let j = i + 1; j < items.length - 1; j++) {
      for (let k = j + 1; k < items.length; k++) {
        result.push([items[i], items[j], items[k]]);
      }
    }
  }

  return result;
}

async function verifyPool(pool, blockTag, vault) {
  const contract = new ethers.Contract(
    pool.address,
    POOL_ABI,
    provider
  );

  const poolId = await contract.getPoolId({ blockTag });

  const onChain = await vault.getPoolTokens(
    poolId,
    { blockTag }
  );

  const apiAddresses = new Set(
    pool.poolTokens.map(t => t.address.toLowerCase())
  );

  const chainAddresses = new Set(
    onChain.tokens.map(t => t.toLowerCase())
  );

  const apiMatchesChain =
    apiAddresses.size === chainAddresses.size &&
    [...apiAddresses].every(address => chainAddresses.has(address));

  const verifiedTokens = [
    ...new Set(
      onChain.tokens
        .map(address => knownByAddress.get(address.toLowerCase()))
        .filter(Boolean)
    )
  ];

  return {
    poolId,
    apiMatchesChain,
    verifiedTokens,
    triangles: combinations3(verifiedTokens),
    lastChangeBlock: onChain.lastChangeBlock
  };
}

(async () => {
  if (!process.env.ALCHEMY_POLYGON) {
    throw new Error("ALCHEMY_POLYGON required");
  }

  const block = await provider.getBlockNumber();
  const vault = new ethers.Contract(VAULT, VAULT_ABI, provider);

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

  for (const pool of candidates) {
    console.log("\n========================================");
    console.log(pool.name);
    console.log("Address:", pool.address);
    console.log("Type:", pool.type);
    console.log("API liquidity:", pool.dynamicData?.totalLiquidity);

    try {
      const result = await verifyPool(pool, block, vault);

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

      if (!result.apiMatchesChain) {
        console.log("REJECTED: API/Vault token mismatch");
        continue;
      }

      if (result.verifiedTokens.length < 3) {
        console.log("REJECTED: insufficient verified tokens");
        continue;
      }

      verifiedCount++;

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
  console.log("Live execution: OFF");
})();
