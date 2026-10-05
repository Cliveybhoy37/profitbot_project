"use strict";

const { ethers } = require("ethers");

const PROFITBOT_ABI = [
  "function initiateFlashloan(address token,uint256 amount,bytes params)"
];

function requireObject(value, label) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      `${label} object required`
    );
  }

  return value;
}

function requireAddress(value, label) {
  if (
    typeof value !== "string" ||
    !ethers.utils.isAddress(value) ||
    value === ethers.constants.AddressZero
  ) {
    throw new Error(
      `${label} must be a valid nonzero address`
    );
  }

  return value;
}

function sameAddress(left, right) {
  return (
    left.toLowerCase() ===
    right.toLowerCase()
  );
}

function buildUnsignedExactTransactionIntentEvidence({
  accountCallerIdentityEvidence
}) {
  const evidence =
    requireObject(
      accountCallerIdentityEvidence,
      "Account/caller identity evidence"
    );

  if (
    evidence.accountCallerIdentityReady !==
    true
  ) {
    throw new Error(
      "Account/caller identity evidence must be ready"
    );
  }

  if (
    evidence.liveExecutionAuthorized !==
      false ||
    evidence.signerAuthorized !== false ||
    evidence.broadcastAuthorized !== false
  ) {
    throw new Error(
      "Upstream execution authorization must remain false"
    );
  }

  const preflight =
    requireObject(
      evidence.currentStatePreflightEvidence,
      "Current-state preflight evidence"
    );

  if (
    preflight.currentStatePreflightReady !==
    true
  ) {
    throw new Error(
      "Current-state preflight evidence must be ready"
    );
  }

  if (
    preflight.liveExecutionAuthorized !==
      false ||
    preflight.signerAuthorized !== false ||
    preflight.broadcastAuthorized !== false
  ) {
    throw new Error(
      "Current-state execution authorization must remain false"
    );
  }

  const account =
    requireObject(
      evidence.accountIdentityEvidence,
      "Account identity evidence"
    );

  const candidate =
    requireObject(
      evidence.candidate,
      "Preserved candidate"
    );

  if (preflight.candidate !== candidate) {
    throw new Error(
      "Candidate identity mismatch"
    );
  }

  const executionLegs =
    evidence.executionLegs;

  if (
    !Array.isArray(executionLegs) ||
    executionLegs.length !== 3
  ) {
    throw new Error(
      "Exactly three preserved execution legs required"
    );
  }

  if (
    preflight.executionLegs !==
    executionLegs
  ) {
    throw new Error(
      "Execution legs identity mismatch"
    );
  }

  const executionPlan =
    evidence.executionPlan;

  if (
    preflight.executionPlan !==
    executionPlan
  ) {
    throw new Error(
      "Execution plan identity mismatch"
    );
  }

  if (
    typeof executionPlan !== "string" ||
    executionPlan === "0x" ||
    !ethers.utils.isHexString(
      executionPlan
    )
  ) {
    throw new Error(
      "Preserved execution plan must be nonempty hex data"
    );
  }

  if (
    !ethers.BigNumber.isBigNumber(
      candidate.amountIn
    ) ||
    candidate.amountIn.lte(0)
  ) {
    throw new Error(
      "Flashloan amount must be positive"
    );
  }

  for (
    let index = 0;
    index < executionLegs.length;
    index += 1
  ) {
    const leg =
      requireObject(
        executionLegs[index],
        `Execution leg ${index}`
      );

    requireAddress(
      leg.tokenIn,
      `Execution leg ${index} tokenIn`
    );

    requireAddress(
      leg.tokenOut,
      `Execution leg ${index} tokenOut`
    );

    if (
      sameAddress(
        leg.tokenIn,
        leg.tokenOut
      )
    ) {
      throw new Error(
        "Preserved route requires distinct leg tokens"
      );
    }

    if (index > 0) {
      const previous =
        executionLegs[index - 1];

      if (
        !sameAddress(
          previous.tokenOut,
          leg.tokenIn
        )
      ) {
        throw new Error(
          "Preserved route is not contiguous"
        );
      }
    }
  }

  if (
    !sameAddress(
      executionLegs[2].tokenOut,
      executionLegs[0].tokenIn
    )
  ) {
    throw new Error(
      "Preserved route does not close"
    );
  }

  const flashloanToken =
    requireAddress(
      executionLegs[0].tokenIn,
      "Flashloan token"
    );

  const callerAddress =
    requireAddress(
      account.callerAddress,
      "Caller address"
    );

  const ownerAddress =
    requireAddress(
      account.ownerAddress,
      "Owner address"
    );

  if (
    !sameAddress(
      callerAddress,
      ownerAddress
    )
  ) {
    throw new Error(
      "Caller owner identity mismatch"
    );
  }

  const executorAddress =
    requireAddress(
      account.executorAddress,
      "Executor address"
    );

  const currentStateEvidence =
    requireObject(
      preflight.currentStateEvidence,
      "Current-state evidence"
    );

  const preflightDeployment =
    requireObject(
      currentStateEvidence.deploymentEvidence,
      "Deployment evidence"
    );

  const deployedExecutor =
    requireAddress(
      preflightDeployment.executorAddress,
      "Deployed executor address"
    );

  if (
    !sameAddress(
      executorAddress,
      deployedExecutor
    )
  ) {
    throw new Error(
      "Executor deployment identity mismatch"
    );
  }

  const iface =
    new ethers.utils.Interface(
      PROFITBOT_ABI
    );

  const data =
    iface.encodeFunctionData(
      "initiateFlashloan",
      [
        flashloanToken,
        candidate.amountIn,
        executionPlan
      ]
    );

  const transactionIntent =
    Object.freeze({
      from: callerAddress,
      to: executorAddress,
      data,
      value: ethers.constants.Zero
    });

  return Object.freeze({
    accountCallerIdentityEvidence:
      evidence,

    candidate,
    executionLegs,
    executionPlan,

    flashloanToken,
    flashloanAmount:
      candidate.amountIn,

    transactionIntent,

    unsignedTransactionIntentReady: true,

    liveExecutionAuthorized: false,
    signerAuthorized: false,
    broadcastAuthorized: false
  });
}

module.exports = {
  buildUnsignedExactTransactionIntentEvidence
};
