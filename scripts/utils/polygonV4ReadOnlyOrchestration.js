"use strict";

const {
  buildExecutionReadinessEvidence
} = require("./polygonV4ExecutionReadinessEvidence");
const {
  acquireCurrentChainIdentityEvidence
} = require("./polygonV4CurrentChainIdentityAcquisitionEvidence");
const {
  acquireCurrentChainTimestampEvidence
} = require("./polygonV4CurrentChainTimestampAcquisitionEvidence");
const {
  buildVerifiedDeploymentAddressEvidence
} = require("./polygonV4VerifiedDeploymentAddressEvidence");
const {
  buildCurrentDeploymentCodeIdentityAcquisitionEvidence
} = require("./polygonV4CurrentDeploymentCodeIdentityAcquisitionEvidence");
const {
  buildCurrentRouteAmountEvidenceComposition
} = require("./polygonV4CurrentRouteAmountEvidenceComposition");
const {
  buildCurrentEconomicsEvidenceComposition
} = require("./polygonV4CurrentEconomicsEvidenceComposition");
const {
  buildCurrentFreshnessEvidenceComposition
} = require("./polygonV4CurrentFreshnessEvidenceComposition");
const {
  buildCurrentStateEvidenceComposition
} = require("./polygonV4CurrentStateEvidenceComposition");
const {
  buildReadOnlyExecutionHandoffComposition
} = require("./polygonV4ReadOnlyExecutionHandoffComposition");

function requireObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

async function buildPolygonV4ReadOnlyOrchestration({
  lifecycleResult,
  provider,
  deploymentProvenance,
  getCallerAddress,
  getExecutorOwner
} = {}) {
  requireObject(lifecycleResult, "Completed lifecycle result");
  const currentProvider = requireObject(provider, "Read-only provider");

  for (const method of [
    "getNetwork",
    "getBlockNumber",
    "getBlock",
    "getCode"
  ]) {
    if (typeof currentProvider[method] !== "function") {
      throw new Error(`Read-only provider ${method} required`);
    }
  }

  requireObject(deploymentProvenance, "Deployment provenance");

  if (typeof getCallerAddress !== "function") {
    throw new Error("getCallerAddress callback required");
  }
  if (typeof getExecutorOwner !== "function") {
    throw new Error("getExecutorOwner callback required");
  }

  const readinessEvidence = buildExecutionReadinessEvidence({
    lifecycleResult
  });

  if (
    readinessEvidence.executionEvidenceReady !== true ||
    readinessEvidence.liveExecutionAuthorized !== false ||
    readinessEvidence.signerAuthorized !== false ||
    readinessEvidence.broadcastAuthorized !== false
  ) {
    throw new Error("Execution readiness must remain unauthorized");
  }

  // Verify chain identity before any other provider acquisition.
  const currentChainIdentityAcquisitionEvidence =
    await acquireCurrentChainIdentityEvidence({
      provider: currentProvider
    });

  const verifiedDeploymentAddressEvidence =
    buildVerifiedDeploymentAddressEvidence({
      deploymentProvenance
    });

  const currentDeploymentCodeIdentityAcquisitionEvidence =
    await buildCurrentDeploymentCodeIdentityAcquisitionEvidence({
      deploymentAddressEvidence:
        verifiedDeploymentAddressEvidence.deploymentAddressEvidence,
      provider: currentProvider
    });

  const currentChainTimestampAcquisitionEvidence =
    await acquireCurrentChainTimestampEvidence({
      provider: currentProvider
    });

  const currentRouteAmountEvidenceComposition =
    buildCurrentRouteAmountEvidenceComposition({
      preparedExecutionContext:
        readinessEvidence.preparedExecutionContext
    });

  const currentEconomicsEvidenceComposition =
    buildCurrentEconomicsEvidenceComposition({
      readinessEvidence
    });

  const currentFreshnessEvidenceComposition =
    buildCurrentFreshnessEvidenceComposition({
      preparedExecutionContext:
        readinessEvidence.preparedExecutionContext,
      currentChainTimestampEvidence:
        currentChainTimestampAcquisitionEvidence.currentChainTimestampEvidence
    });

  const currentStateEvidenceComposition =
    buildCurrentStateEvidenceComposition({
      readinessEvidence,
      currentChainIdentityAcquisitionEvidence,
      currentDeploymentCodeIdentityAcquisitionEvidence,
      currentRouteAmountEvidenceComposition,
      currentEconomicsEvidenceComposition,
      currentFreshnessEvidenceComposition
    });

  const readOnlyExecutionHandoffComposition =
    await buildReadOnlyExecutionHandoffComposition({
      readinessEvidence,
      currentStateEvidenceComposition,
      getCallerAddress,
      getExecutorOwner
    });

  if (
    readOnlyExecutionHandoffComposition.readOnlyExecutionHandoffReady !== true ||
    readOnlyExecutionHandoffComposition.readinessEvidence !== readinessEvidence ||
    readOnlyExecutionHandoffComposition.currentStateEvidenceComposition !==
      currentStateEvidenceComposition ||
    readOnlyExecutionHandoffComposition.liveExecutionAuthorized !== false ||
    readOnlyExecutionHandoffComposition.signerAuthorized !== false ||
    readOnlyExecutionHandoffComposition.broadcastAuthorized !== false
  ) {
    throw new Error("Read-only handoff evidence lineage mismatch");
  }

  return Object.freeze({
    lifecycleResult,
    readinessEvidence,
    currentChainIdentityAcquisitionEvidence,
    currentChainTimestampAcquisitionEvidence,
    verifiedDeploymentAddressEvidence,
    currentDeploymentCodeIdentityAcquisitionEvidence,
    currentRouteAmountEvidenceComposition,
    currentEconomicsEvidenceComposition,
    currentFreshnessEvidenceComposition,
    currentStateEvidenceComposition,
    readOnlyExecutionHandoffComposition,
    unsignedTransactionIntentEvidence:
      readOnlyExecutionHandoffComposition.unsignedTransactionIntentEvidence,
    readOnlyOrchestrationReady: true,
    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  });
}

module.exports = {
  buildPolygonV4ReadOnlyOrchestration
};
