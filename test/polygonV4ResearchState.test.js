"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  SCHEMA_VERSION,
  createResearchState,
  assertCompatibleState,
  completeStage,
  nextIncompleteStage,
  saveResearchState,
  loadResearchState,
  loadOrCreateResearchState
} = require("../scripts/utils/polygonV4ResearchState");

const IDENTITY = Object.freeze({
  chainId: 137,
  pinnedBlock: 94700000,
  discoveryFromBlock: 94200001,
  poolManager:
    "0x67366782805870060151383f4bbff9dab53e5cd6"
});

function tempStatePath() {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), "apollo-v4-state-")
  );

  return {
    dir,
    file: path.join(dir, "state.json")
  };
}

test("creates deterministic Polygon research state", () => {
  const state = createResearchState(IDENTITY);

  assert.equal(state.schemaVersion, SCHEMA_VERSION);
  assert.deepEqual(state.identity, IDENTITY);
  assert.deepEqual(state.completedStages, []);
  assert.equal(nextIncompleteStage(state), "PINNED");
});

test("enforces stage ordering", () => {
  const state = createResearchState(IDENTITY);

  assert.throws(
    () => completeStage(state, "DISCOVERY", {}),
    /before PINNED/
  );

  completeStage(state, "PINNED", {
    pinnedBlock: IDENTITY.pinnedBlock
  });

  assert.equal(nextIncompleteStage(state), "DISCOVERY");

  completeStage(state, "DISCOVERY", {
    verifiedPools: 234
  });

  assert.equal(nextIncompleteStage(state), "ACTIVE");
});

test("stage completion is idempotent", () => {
  const state = createResearchState(IDENTITY);

  completeStage(state, "PINNED", {
    first: true
  });

  completeStage(state, "PINNED", {
    first: false
  });

  assert.deepEqual(state.completedStages, ["PINNED"]);
  assert.deepEqual(state.stages.PINNED, {
    first: false
  });
});

test("atomically saves and reloads state", () => {
  const { dir, file } = tempStatePath();

  try {
    const state = createResearchState(IDENTITY);

    completeStage(state, "PINNED", {
      pinnedBlock: IDENTITY.pinnedBlock
    });

    saveResearchState(file, state);

    const loaded =
      loadResearchState(file, IDENTITY);

    assert.deepEqual(loaded, state);

    const leftovers =
      fs.readdirSync(dir)
        .filter(name => name.includes(".tmp-"));

    assert.deepEqual(leftovers, []);
  } finally {
    fs.rmSync(dir, {
      recursive: true,
      force: true
    });
  }
});

test("loadOrCreate distinguishes fresh and resumed state", () => {
  const { dir, file } = tempStatePath();

  try {
    const fresh =
      loadOrCreateResearchState(file, IDENTITY);

    assert.equal(fresh.resumed, false);

    completeStage(fresh.state, "PINNED", {
      ok: true
    });

    saveResearchState(file, fresh.state);

    const resumed =
      loadOrCreateResearchState(file, IDENTITY);

    assert.equal(resumed.resumed, true);
    assert.deepEqual(
      resumed.state.completedStages,
      ["PINNED"]
    );
  } finally {
    fs.rmSync(dir, {
      recursive: true,
      force: true
    });
  }
});

test("rejects resume against a different pinned block", () => {
  const state = createResearchState(IDENTITY);

  assert.throws(
    () =>
      assertCompatibleState(state, {
        ...IDENTITY,
        pinnedBlock: IDENTITY.pinnedBlock + 1
      }),
    /identity mismatch: pinnedBlock/
  );
});

test("rejects sensitive fields anywhere in persisted payload", () => {
  const state = createResearchState(IDENTITY);

  completeStage(state, "PINNED", {
    ok: true
  });

  assert.throws(
    () =>
      completeStage(state, "DISCOVERY", {
        metadata: {
          rpcUrl: "must-never-be-written"
        }
      }),
    /sensitive field/
  );

  assert.throws(
    () =>
      completeStage(state, "DISCOVERY", {
        metadata: {
          privateKey: "must-never-be-written"
        }
      }),
    /sensitive field/
  );
});

test("requires Polygon chain identity", () => {
  assert.throws(
    () =>
      createResearchState({
        ...IDENTITY,
        chainId: 1
      }),
    /Polygon chainId 137/
  );
});
