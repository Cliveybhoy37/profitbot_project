"use strict";

const {
  acquireQualificationExecutionContext
} = require(
  "./polygonV4QualificationExecutionContext"
);

const {
  qualifyExecutionPolicyPlan
} = require(
  "./polygonV4ExecutionPolicyPlanQualification"
);

function requireFunction(
  value,
  label
) {
  if (typeof value !== "function") {
    throw new Error(
      `${label} must be a function`
    );
  }

  return value;
}

async function qualifyWithExecutionContext({
  provider,
  operationalResult,
  startToken,
  entryToken,
  exitToken,
  slippageBps,
  maxSlippageBps,
  maxAgeBlocks,
  deadlineSeconds,
  gasEvidence,
  safetyReserveWei,
  minimumNetProfitWei,

  acquireQualificationExecutionContextFn =
    acquireQualificationExecutionContext,

  qualifyExecutionPolicyPlanFn =
    qualifyExecutionPolicyPlan
}) {
  const acquireContext =
    requireFunction(
      acquireQualificationExecutionContextFn,
      "acquireQualificationExecutionContextFn"
    );

  const qualifyPlan =
    requireFunction(
      qualifyExecutionPolicyPlanFn,
      "qualifyExecutionPolicyPlanFn"
    );

  const context =
    await acquireContext({
      provider,
      deadlineSeconds
    });

  if (
    !context ||
    typeof context !== "object"
  ) {
    throw new Error(
      "Qualification execution context required"
    );
  }

  if (
    !context.policySnapshot ||
    typeof context.policySnapshot !==
      "object"
  ) {
    throw new Error(
      "Qualification execution context policySnapshot required"
    );
  }

  if (
    !Number.isSafeInteger(
      context.deadline
    ) ||
    context.deadline <= 0
  ) {
    throw new Error(
      "Qualification execution context deadline must be a positive safe integer"
    );
  }

  return qualifyPlan({
    provider,
    operationalResult,
    startToken,
    entryToken,
    exitToken,
    slippageBps,
    maxSlippageBps,
    maxAgeBlocks,
    deadline:
      context.deadline,
    gasEvidence,
    safetyReserveWei,
    minimumNetProfitWei,
    policySnapshot:
      context.policySnapshot
  });
}

module.exports = {
  qualifyWithExecutionContext
};
