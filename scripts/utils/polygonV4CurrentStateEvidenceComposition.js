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

function requireReady(
  evidence,
  readyField,
  label
) {
  if (evidence[readyField] !== true) {
    throw new Error(
      `${label} is not ready`
    );
  }
}

function buildCurrentStateEvidenceComposition({
  readinessEvidence,
  currentChainIdentityAcquisitionEvidence,
  currentDeploymentCodeIdentityAcquisitionEvidence,
  currentRouteAmountEvidenceComposition,
  currentEconomicsEvidenceComposition,
  currentFreshnessEvidenceComposition
} = {}) {
  const readiness =
    requireObject(
      readinessEvidence,
      "Readiness evidence"
    );

  if (
    readiness.executionEvidenceReady !==
      true
  ) {
    throw new Error(
      "Execution evidence is not ready"
    );
  }

  const chainAcquisition =
    requireObject(
      currentChainIdentityAcquisitionEvidence,
      "Current chain identity acquisition evidence"
    );

  const deploymentAcquisition =
    requireObject(
      currentDeploymentCodeIdentityAcquisitionEvidence,
      "Current deployment code identity acquisition evidence"
    );

  const routeComposition =
    requireObject(
      currentRouteAmountEvidenceComposition,
      "Current route amount evidence composition"
    );

  const economicsComposition =
    requireObject(
      currentEconomicsEvidenceComposition,
      "Current economics evidence composition"
    );

  const freshnessComposition =
    requireObject(
      currentFreshnessEvidenceComposition,
      "Current freshness evidence composition"
    );

  requireReady(
    chainAcquisition,
    "currentChainIdentityAcquisitionReady",
    "Current chain identity acquisition evidence"
  );

  requireReady(
    deploymentAcquisition,
    "currentDeploymentCodeIdentityAcquisitionReady",
    "Current deployment code identity acquisition evidence"
  );

  requireReady(
    routeComposition,
    "currentRouteAmountEvidenceCompositionReady",
    "Current route amount evidence composition"
  );

  requireReady(
    economicsComposition,
    "currentEconomicsEvidenceCompositionReady",
    "Current economics evidence composition"
  );

  requireReady(
    freshnessComposition,
    "currentFreshnessEvidenceCompositionReady",
    "Current freshness evidence composition"
  );

  const chainEvidence =
    requireObject(
      chainAcquisition.chainEvidence,
      "Chain evidence"
    );

  const deploymentEvidence =
    requireObject(
      deploymentAcquisition.deploymentEvidence,
      "Deployment evidence"
    );

  const routeAmountEvidence =
    requireObject(
      routeComposition.routeAmountEvidence,
      "Route amount evidence"
    );

  const economicsEvidence =
    requireObject(
      economicsComposition.economicsEvidence,
      "Economics evidence"
    );

  const freshnessEvidence =
    requireObject(
      freshnessComposition.freshnessEvidence,
      "Freshness evidence"
    );

  const qualifiedContext =
    requireObject(
      readiness.qualifiedContext,
      "Readiness qualified context"
    );

  const qualificationResult =
    requireObject(
      qualifiedContext.qualificationResult,
      "Readiness qualification result"
    );

  const preflightEvidence =
    requireObject(
      qualificationResult.preflight,
      "Readiness qualification preflight"
    );

  const currentStateEvidence =
    Object.freeze({
      chainEvidence,
      deploymentEvidence,
      routeAmountEvidence,
      economicsEvidence,
      freshnessEvidence,
      preflightEvidence
    });

  return Object.freeze({
    currentStateEvidence,
    currentStateEvidenceCompositionReady:
      true
  });
}

module.exports = {
  buildCurrentStateEvidenceComposition
};
