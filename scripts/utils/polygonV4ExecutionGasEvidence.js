"use strict";

const { ethers } = require("ethers");

const GAS_EVIDENCE_METHODS = Object.freeze([
  "FORK_RECEIPT"
]);

function requirePositiveSafeInteger(value, label) {
  if (
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `${label} must be a positive safe integer`
    );
  }

  return value;
}

function requireAddress(value, label) {
  if (
    !ethers.utils.isAddress(value) ||
    value === ethers.constants.AddressZero
  ) {
    throw new Error(
      `${label} must be a valid nonzero address`
    );
  }

  return value;
}

function requirePositiveBigNumber(value, label) {
  let parsed;

  try {
    parsed = ethers.BigNumber.from(value);
  } catch {
    throw new Error(
      `${label} must be a positive BigNumber`
    );
  }

  if (parsed.lte(0)) {
    throw new Error(
      `${label} must be a positive BigNumber`
    );
  }

  return parsed;
}

function requireHexBytes(value, label) {
  if (
    typeof value !== "string" ||
    !ethers.utils.isHexString(value)
  ) {
    throw new Error(
      `${label} must be valid hex bytes`
    );
  }

  return value;
}

function normalizeExecutionLeg(leg, index) {
  if (!leg || typeof leg !== "object") {
    throw new Error(
      `Execution leg ${index} must be an object`
    );
  }

  if (
    !Number.isSafeInteger(leg.venue) ||
    leg.venue < 0
  ) {
    throw new Error(
      `Execution leg ${index} venue must be a nonnegative safe integer`
    );
  }

  return {
    venue: leg.venue,
    tokenIn: requireAddress(
      leg.tokenIn,
      `Execution leg ${index} tokenIn`
    ),
    tokenOut: requireAddress(
      leg.tokenOut,
      `Execution leg ${index} tokenOut`
    ),
    minAmountOut: requirePositiveBigNumber(
      leg.minAmountOut,
      `Execution leg ${index} minAmountOut`
    ),
    venueData: requireHexBytes(
      leg.venueData,
      `Execution leg ${index} venueData`
    )
  };
}

function normalizeExecutionLegs(legs) {
  if (
    !Array.isArray(legs) ||
    legs.length !== 3
  ) {
    throw new Error(
      "Exactly three execution legs required"
    );
  }

  const normalized =
    legs.map(normalizeExecutionLeg);

  for (let i = 1; i < normalized.length; i++) {
    if (
      normalized[i - 1].tokenOut.toLowerCase() !==
      normalized[i].tokenIn.toLowerCase()
    ) {
      throw new Error(
        "Execution gas evidence route is not contiguous"
      );
    }
  }

  if (
    normalized[2].tokenOut.toLowerCase() !==
    normalized[0].tokenIn.toLowerCase()
  ) {
    throw new Error(
      "Execution gas evidence route must close to the starting token"
    );
  }

  return normalized;
}

function normalizeProvenance(provenance) {
  if (
    !provenance ||
    typeof provenance !== "object"
  ) {
    throw new Error(
      "Gas evidence provenance is required"
    );
  }

  if (
    !GAS_EVIDENCE_METHODS.includes(
      provenance.method
    )
  ) {
    throw new Error(
      "Unsupported gas evidence method"
    );
  }

  const measurementBlock =
    requirePositiveSafeInteger(
      provenance.measurementBlock,
      "Gas evidence measurementBlock"
    );

  if (
    typeof provenance.source !== "string" ||
    provenance.source.trim().length === 0
  ) {
    throw new Error(
      "Gas evidence source is required"
    );
  }

  return {
    method: provenance.method,
    measurementBlock,
    source: provenance.source
  };
}

function validateExecutionGasEvidence({
  candidate,
  executionLegs,
  evidence
}) {
  if (!candidate || typeof candidate !== "object") {
    throw new Error("Candidate is required");
  }

  const observationBlock =
    requirePositiveSafeInteger(
      candidate.blockTag,
      "Candidate blockTag"
    );

  const loanAmount =
    requirePositiveBigNumber(
      candidate.amountIn,
      "Candidate amountIn"
    );

  const expectedLegs =
    normalizeExecutionLegs(
      executionLegs
    );

  if (!evidence || typeof evidence !== "object") {
    throw new Error(
      "Execution gas evidence is required"
    );
  }

  if (
    requirePositiveSafeInteger(
      evidence.observationBlock,
      "Gas evidence observationBlock"
    ) !== observationBlock
  ) {
    throw new Error(
      "Gas evidence observation block mismatch"
    );
  }

  const loanToken =
    requireAddress(
      evidence.loanToken,
      "Gas evidence loanToken"
    );

  if (
    loanToken.toLowerCase() !==
    expectedLegs[0].tokenIn.toLowerCase()
  ) {
    throw new Error(
      "Gas evidence loan token mismatch"
    );
  }

  const evidenceLoanAmount =
    requirePositiveBigNumber(
      evidence.loanAmount,
      "Gas evidence loanAmount"
    );

  if (!evidenceLoanAmount.eq(loanAmount)) {
    throw new Error(
      "Gas evidence loan amount mismatch"
    );
  }

  const evidenceLegs =
    normalizeExecutionLegs(
      evidence.executionLegs
    );

  for (let i = 0; i < 3; i++) {
    const expected = expectedLegs[i];
    const actual = evidenceLegs[i];

    if (actual.venue !== expected.venue) {
      throw new Error(
        `Gas evidence execution leg ${i} venue mismatch`
      );
    }

    if (
      actual.tokenIn.toLowerCase() !==
      expected.tokenIn.toLowerCase()
    ) {
      throw new Error(
        `Gas evidence execution leg ${i} tokenIn mismatch`
      );
    }

    if (
      actual.tokenOut.toLowerCase() !==
      expected.tokenOut.toLowerCase()
    ) {
      throw new Error(
        `Gas evidence execution leg ${i} tokenOut mismatch`
      );
    }

    if (
      !actual.minAmountOut.eq(
        expected.minAmountOut
      )
    ) {
      throw new Error(
        `Gas evidence execution leg ${i} minAmountOut mismatch`
      );
    }

    if (
      actual.venueData.toLowerCase() !==
      expected.venueData.toLowerCase()
    ) {
      throw new Error(
        `Gas evidence execution leg ${i} venueData mismatch`
      );
    }
  }

  const gasUnits =
    requirePositiveBigNumber(
      evidence.gasUnits,
      "Gas evidence gasUnits"
    );

  const provenance =
    normalizeProvenance(
      evidence.provenance
    );

  return {
    observationBlock,
    loanToken,
    loanAmount,
    executionLegs: evidenceLegs,
    gasUnits,
    provenance
  };
}

module.exports = {
  GAS_EVIDENCE_METHODS,
  validateExecutionGasEvidence
};
