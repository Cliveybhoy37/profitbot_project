"use strict";

// Shared read-only Balancer Polygon discovery helpers.
// API data proposes candidates; pinned Polygon state verifies them.
// No signer, wallet, approval, flashloan, or transaction submission.

const { ethers } = require("ethers");
const TOKENS = require("./polygonScannerTokens");

const ENDPOINT = "https://api-v3.balancer.fi/graphql";
const VAULT =
  "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

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
        .map(token =>
          knownByAddress.get(token.address.toLowerCase())
        )
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

function mapBalancesByAddress(tokens, balances) {
  if (!Array.isArray(tokens) || !Array.isArray(balances)) {
    throw new Error("Balancer tokens and balances must be arrays");
  }

  if (tokens.length !== balances.length) {
    throw new Error("Balancer token/balance length mismatch");
  }

  return Object.freeze(
    Object.fromEntries(
      tokens.map((address, index) => [
        address.toLowerCase(),
        balances[index]
      ])
    )
  );
}

async function verifyPool({
  pool,
  blockTag,
  provider,
  vault
}) {
  if (!provider) {
    throw new Error("Balancer verification requires provider");
  }

  if (!vault) {
    throw new Error("Balancer verification requires vault");
  }

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
    pool.poolTokens.map(token =>
      token.address.toLowerCase()
    )
  );

  const chainAddresses = new Set(
    onChain.tokens.map(address =>
      address.toLowerCase()
    )
  );

  const apiMatchesChain =
    apiAddresses.size === chainAddresses.size &&
    [...apiAddresses].every(address =>
      chainAddresses.has(address)
    );

  const verifiedTokens = [
    ...new Set(
      onChain.tokens
        .map(address =>
          knownByAddress.get(address.toLowerCase())
        )
        .filter(Boolean)
    )
  ];

  const balancesByAddress = mapBalancesByAddress(
    onChain.tokens,
    onChain.balances
  );

  return {
    poolId,
    apiMatchesChain,
    verifiedTokens,
    triangles: combinations3(verifiedTokens),
    balancesByAddress,
    lastChangeBlock: onChain.lastChangeBlock
  };
}


async function discoverVerifiedCandidates({
  provider,
  blockTag
}) {
  if (!provider) {
    throw new Error("Balancer discovery requires provider");
  }

  if (blockTag === undefined || blockTag === null) {
    throw new Error("Balancer discovery requires pinned blockTag");
  }

  const pools = await fetchPools();
  const vault = createVault(provider);

  const candidates = pools.filter(pool =>
    Number(pool.protocolVersion) === 2 &&
    verifiedOverlap(pool).length >= 3
  );

  const verified = [];

  for (const pool of candidates) {
    try {
      const verification = await verifyPool({
        pool,
        blockTag,
        provider,
        vault
      });

      verified.push({
        candidate: pool,
        verification
      });
    } catch (error) {
      verified.push({
        candidate: pool,
        verification: null,
        error: error.message
      });
    }
  }

  return {
    blockTag,
    apiPoolCount: pools.length,
    candidateCount: candidates.length,
    verified
  };
}

function createVault(provider) {
  if (!provider) {
    throw new Error("Balancer Vault requires provider");
  }

  return new ethers.Contract(
    VAULT,
    VAULT_ABI,
    provider
  );
}

module.exports = {
  ENDPOINT,
  VAULT,
  POOL_ABI,
  VAULT_ABI,
  fetchPools,
  verifiedOverlap,
  combinations3,
  mapBalancesByAddress,
  verifyPool,
  discoverVerifiedCandidates,
  createVault
};
