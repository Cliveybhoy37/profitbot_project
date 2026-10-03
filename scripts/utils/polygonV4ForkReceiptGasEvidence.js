"use strict";

const { ethers } = require("ethers");

const {
  validateExecutionGasEvidence
} = require("./polygonV4ExecutionGasEvidence");

const REQUIRED_METHOD = "FORK_RECEIPT";

function requireAddress(value, label) {
  if (
    !ethers.utils.isAddress(value) ||
    value === ethers.constants.AddressZero
  ) {
    throw new Error(
      `${label} must be a valid nonzero address`
    );
  }

  return ethers.utils.getAddress(value);
}

function requireHash(value, label) {
  if (
    typeof value !== "string" ||
    !ethers.utils.isHexString(value, 32)
  ) {
    throw new Error(
      `${label} must be a bytes32 hash`
    );
  }

  return value.toLowerCase();
}

function requireContext(context) {
  if (!context || typeof context !== "object") {
    throw new Error(
      "Gas evidence executorContext is required"
    );
  }

  return {
    executorCodeHash: requireHash(
      context.executorCodeHash,
      "Gas evidence executorCodeHash"
    ),
    v3Router: requireAddress(
      context.v3Router,
      "Gas evidence V3 router"
    ),
    v4Router: requireAddress(
      context.v4Router,
      "Gas evidence V4 router"
    ),
    permit2: requireAddress(
      context.permit2,
      "Gas evidence Permit2"
    ),
    aaveProvider: requireAddress(
      context.aaveProvider,
      "Gas evidence Aave provider"
    ),
    aavePool: requireAddress(
      context.aavePool,
      "Gas evidence Aave pool"
    )
  };
}

function validateForkReceiptGasEvidence({
  candidate,
  executionLegs,
  executionPlan,
  evidence
}) {
  const validated =
    validateExecutionGasEvidence({
      candidate,
      executionLegs,
      evidence
    });

  if (
    validated.provenance.method !==
    REQUIRED_METHOD
  ) {
    throw new Error(
      "Fork receipt gas evidence requires FORK_RECEIPT provenance"
    );
  }

  if (
    validated.provenance.measurementBlock !==
    validated.observationBlock
  ) {
    throw new Error(
      "Fork receipt measurement block must equal observation block"
    );
  }

  if (
    typeof executionPlan !== "string" ||
    !ethers.utils.isHexString(executionPlan) ||
    executionPlan === "0x"
  ) {
    throw new Error(
      "Exact encoded execution plan is required"
    );
  }

  const expectedPlanHash =
    ethers.utils.keccak256(executionPlan);

  const actualPlanHash =
    requireHash(
      evidence.executionPlanHash,
      "Gas evidence executionPlanHash"
    );

  if (
    actualPlanHash !==
    expectedPlanHash.toLowerCase()
  ) {
    throw new Error(
      "Gas evidence execution plan mismatch"
    );
  }

  const executorContext =
    requireContext(
      evidence.executorContext
    );

  return {
    ...validated,
    executionPlanHash: actualPlanHash,
    executorContext
  };
}

module.exports = {
  REQUIRED_METHOD,
  validateForkReceiptGasEvidence
};
