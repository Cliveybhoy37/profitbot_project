"use strict";

const {
  validateMinimumBlockGap
} = require(
  "./runPolygonV4ProtectedPeakBlockSeparation"
);

function validateBlockTag(
  blockTag,
  name
) {
  if (
    !Number.isSafeInteger(blockTag) ||
    blockTag <= 0
  ) {
    throw new Error(
      `${name} must be a positive safe integer`
    );
  }

  return blockTag;
}

function validateMaxAttempts(
  maxAttempts
) {
  if (
    !Number.isSafeInteger(maxAttempts) ||
    maxAttempts <= 0
  ) {
    throw new Error(
      "maxAttempts must be a positive safe integer"
    );
  }

  return maxAttempts;
}

async function observeProtectedPeakBlockAdvancement({
  previousBlockTag,
  minimumBlockGap,
  maxAttempts,
  observeBlockFn
}) {
  validateBlockTag(
    previousBlockTag,
    "previousBlockTag"
  );

  validateMinimumBlockGap(
    minimumBlockGap
  );

  validateMaxAttempts(
    maxAttempts
  );

  if (
    typeof observeBlockFn !==
    "function"
  ) {
    throw new Error(
      "observeBlockFn must be a function"
    );
  }

  const requiredBlockTag =
    previousBlockTag +
    minimumBlockGap;

  if (
    !Number.isSafeInteger(
      requiredBlockTag
    )
  ) {
    throw new Error(
      "required blockTag exceeds safe integer range"
    );
  }

  const observations = [];

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt += 1
  ) {
    const observedBlockTag =
      await observeBlockFn();

    validateBlockTag(
      observedBlockTag,
      "observedBlockTag"
    );

    observations.push(
      observedBlockTag
    );

    if (
      observedBlockTag >=
      requiredBlockTag
    ) {
      return {
        advanced: true,
        previousBlockTag,
        minimumBlockGap,
        requiredBlockTag,
        observedBlockTag,
        attemptsUsed: attempt,
        maxAttempts,
        observations
      };
    }
  }

  return {
    advanced: false,
    previousBlockTag,
    minimumBlockGap,
    requiredBlockTag,
    observedBlockTag:
      observations[
        observations.length - 1
      ],
    attemptsUsed:
      observations.length,
    maxAttempts,
    observations
  };
}

module.exports = {
  validateBlockTag,
  validateMaxAttempts,
  observeProtectedPeakBlockAdvancement
};
