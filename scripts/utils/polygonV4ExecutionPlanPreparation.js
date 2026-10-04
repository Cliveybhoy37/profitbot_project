"use strict";

const {
  selectProtectedPeakHandoff
} = require(
  "./polygonV4ProtectedPeakHandoff"
);

const {
  buildObservedV4Candidate
} = require(
  "./polygonV4ObservedCandidate"
);

const {
  buildV4ExecutionLegs,
  encodeV4ExecutionPlan
} = require(
  "./polygonV4ExecutionRoute"
);

function requireFunction(value, label) {
  if (typeof value !== "function") {
    throw new Error(
      `${label} must be a function`
    );
  }

  return value;
}

function prepareExactExecutionPlan({
  operationalResult,
  startToken,
  entryToken,
  exitToken,
  slippageBps,
  deadline,
  minimumNetProfitWei,

  selectProtectedPeakHandoffFn =
    selectProtectedPeakHandoff,

  buildObservedCandidateFn =
    buildObservedV4Candidate,

  buildV4ExecutionLegsFn =
    buildV4ExecutionLegs,

  encodeV4ExecutionPlanFn =
    encodeV4ExecutionPlan
}) {
  const selectHandoff =
    requireFunction(
      selectProtectedPeakHandoffFn,
      "selectProtectedPeakHandoffFn"
    );

  const buildCandidate =
    requireFunction(
      buildObservedCandidateFn,
      "buildObservedCandidateFn"
    );

  const buildExecutionLegs =
    requireFunction(
      buildV4ExecutionLegsFn,
      "buildV4ExecutionLegsFn"
    );

  const encodeExecutionPlan =
    requireFunction(
      encodeV4ExecutionPlanFn,
      "encodeV4ExecutionPlanFn"
    );

  const handoff =
    selectHandoff(
      operationalResult
    );

  const candidate =
    buildCandidate({
      observation:
        handoff.observation,
      startToken,
      entryToken,
      exitToken
    });

  const executionLegs =
    buildExecutionLegs(
      candidate.legs,
      slippageBps
    );

  const executionPlan =
    encodeExecutionPlan({
      legs: executionLegs,
      deadline,
      minimumProfit:
        minimumNetProfitWei
    });

  return {
    handoff,
    candidate,
    executionLegs,
    executionPlan,
    deadline,
    minimumNetProfitWei
  };
}

module.exports = {
  prepareExactExecutionPlan
};
