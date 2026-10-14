"use strict";

function requireObject(
  value,
  label
) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      `${label} must be an object`
    );
  }

  return value;
}

function buildCurrentRouteAmountEvidenceComposition({
  preparedExecutionContext
}) {
  const prepared =
    requireObject(
      preparedExecutionContext,
      "Prepared execution context"
    );

  const candidate =
    requireObject(
      prepared.candidate,
      "Prepared execution context candidate"
    );

  if (!Array.isArray(prepared.executionLegs)) {
    throw new Error(
      "Prepared execution context execution legs required"
    );
  }

  if (
    prepared.executionPlan === null ||
    prepared.executionPlan === undefined
  ) {
    throw new Error(
      "Prepared execution context execution plan required"
    );
  }

  if (
    candidate.amountIn === null ||
    candidate.amountIn === undefined
  ) {
    throw new Error(
      "Prepared execution context candidate amount required"
    );
  }

  const routeAmountEvidence =
    Object.freeze({
      candidate,
      executionLegs:
        prepared.executionLegs,
      executionPlan:
        prepared.executionPlan,
      amountIn:
        candidate.amountIn
    });

  return Object.freeze({
    routeAmountEvidence,
    currentRouteAmountEvidenceCompositionReady:
      true
  });
}

module.exports = {
  buildCurrentRouteAmountEvidenceComposition
};
