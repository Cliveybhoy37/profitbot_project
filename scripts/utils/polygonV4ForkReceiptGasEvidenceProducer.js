"use strict";

const { ethers } = require("ethers");

const {
  validateForkReceiptGasEvidence
} = require(
  "./polygonV4ForkReceiptGasEvidence"
);

function requireFunction(value, label) {
  if (typeof value !== "function") {
    throw new Error(`${label} is required`);
  }

  return value;
}

function requireProvider(provider) {
  if (
    !provider ||
    typeof provider.getCode !== "function"
  ) {
    throw new Error(
      "Fork provider with getCode is required"
    );
  }

  return provider;
}

function requireExecutor(executor) {
  const methods = [
    "V3_ROUTER",
    "V4_ROUTER",
    "PERMIT2",
    "AAVE_PROVIDER",
    "AAVE_POOL"
  ];

  if (
    !executor ||
    typeof executor !== "object" ||
    typeof executor.address !== "string" ||
    !ethers.utils.isAddress(executor.address) ||
    executor.address === ethers.constants.AddressZero
  ) {
    throw new Error(
      "Deployed PolygonV4CandidateExecutor is required"
    );
  }

  for (const method of methods) {
    if (typeof executor[method] !== "function") {
      throw new Error(
        `Executor ${method} reader is required`
      );
    }
  }

  return executor;
}

async function readExecutorContext({
  provider,
  executor
}) {
  const [
    code,
    v3Router,
    v4Router,
    permit2,
    aaveProvider,
    aavePool
  ] = await Promise.all([
    provider.getCode(executor.address),
    executor.V3_ROUTER(),
    executor.V4_ROUTER(),
    executor.PERMIT2(),
    executor.AAVE_PROVIDER(),
    executor.AAVE_POOL()
  ]);

  if (
    typeof code !== "string" ||
    !ethers.utils.isHexString(code) ||
    code === "0x"
  ) {
    throw new Error(
      "Executor has no deployed runtime bytecode"
    );
  }

  return {
    executorCodeHash:
      ethers.utils.keccak256(code),
    v3Router,
    v4Router,
    permit2,
    aaveProvider,
    aavePool
  };
}

async function produceForkReceiptGasEvidence({
  provider,
  executor,
  candidate,
  executionLegs,
  executionPlan,
  forkProvenance,
  execute
}) {
  requireProvider(provider);
  requireExecutor(executor);

  const executeExactPlan =
    requireFunction(
      execute,
      "Exact fork execution function"
    );

  if (
    !candidate ||
    !Number.isSafeInteger(candidate.blockTag) ||
    candidate.blockTag <= 0
  ) {
    throw new Error(
      "Candidate requires positive safe blockTag"
    );
  }

  if (
    !forkProvenance ||
    forkProvenance.method !== "hardhat_reset" ||
    !Number.isSafeInteger(
      forkProvenance.sourceBlock
    ) ||
    forkProvenance.sourceBlock <= 0
  ) {
    throw new Error(
      "Controlled hardhat_reset fork provenance is required"
    );
  }

  if (
    forkProvenance.sourceBlock !==
    candidate.blockTag
  ) {
    throw new Error(
      "Fork source block does not equal candidate observation block"
    );
  }

  const measurementBlock =
    forkProvenance.sourceBlock;

  const executorContext =
    await readExecutorContext({
      provider,
      executor
    });

  const result =
    await executeExactPlan({
      executor,
      candidate,
      executionLegs,
      executionPlan
    });

  if (
    !result ||
    !result.receipt ||
    result.receipt.status !== 1 ||
    !ethers.BigNumber.isBigNumber(
      result.receipt.gasUsed
    ) ||
    result.receipt.gasUsed.lte(0)
  ) {
    throw new Error(
      "Successful fork transaction receipt with gasUsed is required"
    );
  }

  const evidence = {
    observationBlock:
      candidate.blockTag,
    loanToken:
      executionLegs[0].tokenIn,
    loanAmount:
      candidate.amountIn,
    executionLegs,
    gasUnits:
      result.receipt.gasUsed,
    executionPlanHash:
      ethers.utils.keccak256(
        executionPlan
      ),
    executorContext,
    provenance: {
      method: "FORK_RECEIPT",
      measurementBlock,
      source:
        "controlled historical Polygon fork receipt"
    }
  };

  return validateForkReceiptGasEvidence({
    candidate,
    executionLegs,
    executionPlan,
    evidence
  });
}

module.exports = {
  readExecutorContext,
  produceForkReceiptGasEvidence
};
