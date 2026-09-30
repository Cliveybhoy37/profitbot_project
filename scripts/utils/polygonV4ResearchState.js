"use strict";

// Durable, resumable state for Polygon V4 research.
//
// This module performs filesystem persistence only.
// It has no provider, signer, wallet, RPC, approvals, or transaction logic.

const fs = require("node:fs");
const path = require("node:path");

const SCHEMA_VERSION = 1;

const STAGES = Object.freeze([
  "PINNED",
  "DISCOVERY",
  "ACTIVE",
  "STRUCTURAL",
  "ECONOMICS",
  "RANKED"
]);

const FORBIDDEN_KEY_PATTERN =
  /(private.?key|seed|mnemonic|password|secret|api.?key|rpc.?url|infura|alchemy)/i;

function assertSafeValue(value, trail = "root") {
  if (value === null || value === undefined) return;

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertSafeValue(item, `${trail}[${index}]`)
    );
    return;
  }

  if (typeof value !== "object") return;

  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEY_PATTERN.test(key)) {
      throw new Error(
        `Refusing to persist sensitive field: ${trail}.${key}`
      );
    }

    assertSafeValue(child, `${trail}.${key}`);
  }
}

function validateIdentity(identity) {
  if (!identity || typeof identity !== "object") {
    throw new Error("Research state requires identity");
  }

  if (identity.chainId !== 137) {
    throw new Error("Research state requires Polygon chainId 137");
  }

  if (!Number.isInteger(identity.pinnedBlock) || identity.pinnedBlock <= 0) {
    throw new Error("Research state requires positive pinnedBlock");
  }

  if (
    !Number.isInteger(identity.discoveryFromBlock) ||
    identity.discoveryFromBlock < 0
  ) {
    throw new Error("Research state requires discoveryFromBlock");
  }

  if (identity.discoveryFromBlock > identity.pinnedBlock) {
    throw new Error(
      "discoveryFromBlock cannot exceed pinnedBlock"
    );
  }

  if (
    typeof identity.poolManager !== "string" ||
    !/^0x[0-9a-fA-F]{40}$/.test(identity.poolManager)
  ) {
    throw new Error("Research state requires PoolManager address");
  }
}

function createResearchState(identity) {
  validateIdentity(identity);
  assertSafeValue(identity, "identity");

  return {
    schemaVersion: SCHEMA_VERSION,

    identity: {
      chainId: identity.chainId,
      pinnedBlock: identity.pinnedBlock,
      discoveryFromBlock: identity.discoveryFromBlock,
      poolManager: identity.poolManager
    },

    completedStages: [],

    stages: {
      PINNED: null,
      DISCOVERY: null,
      ACTIVE: null,
      STRUCTURAL: null,
      ECONOMICS: null,
      RANKED: null
    }
  };
}

function assertCompatibleState(state, expectedIdentity = null) {
  if (!state || typeof state !== "object") {
    throw new Error("Invalid research state");
  }

  if (state.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `Unsupported research state schema: ${state.schemaVersion}`
    );
  }

  validateIdentity(state.identity);
  assertSafeValue(state);

  if (!Array.isArray(state.completedStages)) {
    throw new Error("Research state completedStages must be an array");
  }

  for (const stage of state.completedStages) {
    if (!STAGES.includes(stage)) {
      throw new Error(`Unknown completed research stage: ${stage}`);
    }
  }

  if (!state.stages || typeof state.stages !== "object") {
    throw new Error("Research state requires stages");
  }

  for (const stage of STAGES) {
    if (!(stage in state.stages)) {
      throw new Error(`Research state missing stage: ${stage}`);
    }
  }

  if (expectedIdentity) {
    validateIdentity(expectedIdentity);

    const fields = [
      "chainId",
      "pinnedBlock",
      "discoveryFromBlock"
    ];

    for (const field of fields) {
      if (state.identity[field] !== expectedIdentity[field]) {
        throw new Error(
          `Research state identity mismatch: ${field}`
        );
      }
    }

    if (
      state.identity.poolManager.toLowerCase() !==
      expectedIdentity.poolManager.toLowerCase()
    ) {
      throw new Error(
        "Research state identity mismatch: poolManager"
      );
    }
  }

  return state;
}

function completeStage(state, stage, payload) {
  assertCompatibleState(state);

  if (!STAGES.includes(stage)) {
    throw new Error(`Unknown research stage: ${stage}`);
  }

  const stageIndex = STAGES.indexOf(stage);

  if (stageIndex > 0) {
    const previous = STAGES[stageIndex - 1];

    if (!state.completedStages.includes(previous)) {
      throw new Error(
        `Cannot complete ${stage} before ${previous}`
      );
    }
  }

  assertSafeValue(payload, `stages.${stage}`);

  state.stages[stage] = payload ?? {};

  if (!state.completedStages.includes(stage)) {
    state.completedStages.push(stage);
  }

  return state;
}

function nextIncompleteStage(state) {
  assertCompatibleState(state);

  return (
    STAGES.find(stage => !state.completedStages.includes(stage)) ||
    null
  );
}

function saveResearchState(filePath, state) {
  assertCompatibleState(state);
  assertSafeValue(state);

  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });

  const tempPath =
    `${filePath}.tmp-${process.pid}`;

  const json =
    `${JSON.stringify(state, null, 2)}\n`;

  try {
    fs.writeFileSync(tempPath, json, {
      encoding: "utf8",
      mode: 0o600
    });

    fs.renameSync(tempPath, filePath);
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.rmSync(tempPath, { force: true });
    }
  }
}

function loadResearchState(filePath, expectedIdentity = null) {
  const raw = fs.readFileSync(filePath, "utf8");
  const state = JSON.parse(raw);

  return assertCompatibleState(state, expectedIdentity);
}

function loadOrCreateResearchState(filePath, identity) {
  if (fs.existsSync(filePath)) {
    return {
      state: loadResearchState(filePath, identity),
      resumed: true
    };
  }

  return {
    state: createResearchState(identity),
    resumed: false
  };
}

module.exports = {
  SCHEMA_VERSION,
  STAGES,
  createResearchState,
  assertCompatibleState,
  completeStage,
  nextIncompleteStage,
  saveResearchState,
  loadResearchState,
  loadOrCreateResearchState
};
