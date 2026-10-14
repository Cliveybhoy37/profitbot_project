"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  acquireExactTransactionSigningEvidence
} = require(
  "../scripts/utils/polygonV4ExactTransactionSigningEvidence"
);

const SIGNER =
  "0x1111111111111111111111111111111111111111";

const EXECUTOR =
  "0x2222222222222222222222222222222222222222";

function makeEnvelope(from = SIGNER) {
  return Object.freeze({
    from,
    to: EXECUTOR,
    data: "0x12345678",
    value: ethers.constants.Zero,
    chainId: 137,
    nonce: 42,
    maxFeePerGas:
      ethers.BigNumber.from("50000000000"),
    maxPriorityFeePerGas:
      ethers.BigNumber.from("30000000000"),
    gasLimit:
      ethers.BigNumber.from("123456")
  });
}

function makeBindingEvidence({
  envelope = makeEnvelope(),
  signerAddress = SIGNER,
  signerCapabilityAddress = SIGNER
} = {}) {
  return Object.freeze({
    signingAuthorizationEvidence:
      Object.freeze({
        transactionEnvelope: envelope,
        signerAddress,
        signingAuthorizationReady: true,
        signerAuthorized: true,
        signingAuthorized: true,
        liveExecutionAuthorized: false,
        broadcastAuthorized: false
      }),

    transactionEnvelope: envelope,
    signerAddress,
    signerCapabilityAddress,

    signerCapabilityBindingReady: true,

    signerAuthorized: true,
    signingAuthorized: true,

    liveExecutionAuthorized: false,
    broadcastAuthorized: false
  });
}

test(
  "1S.39 produces exact independently verified signed transaction evidence without broadcast authorization",
  async () => {
    /*
     * Test-only in-memory wallet.
     * No provider, RPC, environment variable or project key.
     */
    const wallet = ethers.Wallet.createRandom();
    const signerAddress = await wallet.getAddress();

    const envelope =
      makeEnvelope(signerAddress);

    const bindingEvidence =
      makeBindingEvidence({
        envelope,
        signerAddress,
        signerCapabilityAddress: signerAddress
      });

    let signingCalls = 0;
    let observedSignableTransaction = null;

    const result =
      await acquireExactTransactionSigningEvidence({
        signerCapabilityBindingEvidence:
          bindingEvidence,

        signTransaction:
          async signableTransaction => {
            signingCalls += 1;
            observedSignableTransaction =
              signableTransaction;

            return wallet.signTransaction(
              signableTransaction
            );
          }
      });

    assert.equal(signingCalls, 1);

    assert.equal(
      result.signerCapabilityBindingEvidence,
      bindingEvidence
    );

    assert.equal(
      result.transactionEnvelope,
      envelope
    );

    assert.equal(
      result.signerAddress,
      signerAddress
    );

    assert.equal(
      result.signerCapabilityAddress,
      signerAddress
    );

    assert.equal(
      result.signableTransaction,
      observedSignableTransaction
    );

    assert.equal(
      Object.isFrozen(result.signableTransaction),
      true
    );

    assert.deepEqual(
      Object.keys(result.signableTransaction).sort(),
      [
        "type",
        "from",
        "to",
        "data",
        "value",
        "chainId",
        "nonce",
        "maxFeePerGas",
        "maxPriorityFeePerGas",
        "gasLimit"
      ].sort()
    );

    assert.equal(
      result.signableTransaction.type,
      2
    );

    assert.equal(
      result.signableTransaction.from,
      envelope.from
    );

    assert.equal(
      result.signableTransaction.to,
      envelope.to
    );

    assert.equal(
      result.signableTransaction.data,
      envelope.data
    );

    assert.equal(
      result.signableTransaction.value,
      envelope.value
    );

    assert.equal(
      result.signableTransaction.chainId,
      envelope.chainId
    );

    assert.equal(
      result.signableTransaction.nonce,
      envelope.nonce
    );

    assert.equal(
      result.signableTransaction.maxFeePerGas,
      envelope.maxFeePerGas
    );

    assert.equal(
      result.signableTransaction.maxPriorityFeePerGas,
      envelope.maxPriorityFeePerGas
    );

    assert.equal(
      result.signableTransaction.gasLimit,
      envelope.gasLimit
    );

    assert.equal(
      typeof result.signedRawTransaction,
      "string"
    );

    assert.match(
      result.signedRawTransaction,
      /^0x[0-9a-fA-F]+$/
    );

    assert.equal(
      result.signedTransactionHash,
      ethers.utils.keccak256(
        result.signedRawTransaction
      )
    );

    const parsed =
      ethers.utils.parseTransaction(
        result.signedRawTransaction
      );

    assert.equal(parsed.type, 2);
    assert.equal(parsed.chainId, envelope.chainId);
    assert.equal(parsed.nonce, envelope.nonce);

    assert.equal(
      ethers.utils.getAddress(parsed.from),
      ethers.utils.getAddress(signerAddress)
    );

    assert.equal(
      ethers.utils.getAddress(parsed.to),
      ethers.utils.getAddress(envelope.to)
    );

    assert.equal(
      parsed.data,
      envelope.data
    );

    assert.equal(
      parsed.value.eq(envelope.value),
      true
    );

    assert.equal(
      parsed.gasLimit.eq(envelope.gasLimit),
      true
    );

    assert.equal(
      parsed.maxFeePerGas.eq(
        envelope.maxFeePerGas
      ),
      true
    );

    assert.equal(
      parsed.maxPriorityFeePerGas.eq(
        envelope.maxPriorityFeePerGas
      ),
      true
    );

    assert.equal(
      result.transactionSigningReady,
      true
    );

    assert.equal(
      result.signerAuthorized,
      true
    );

    assert.equal(
      result.signingAuthorized,
      true
    );

    assert.equal(
      result.liveExecutionAuthorized,
      false
    );

    assert.equal(
      result.broadcastAuthorized,
      false
    );

    assert.equal(
      Object.isFrozen(result),
      true
    );
  }
);

async function makeRealHarness() {
  const wallet = ethers.Wallet.createRandom();
  const signerAddress = await wallet.getAddress();
  const envelope = makeEnvelope(signerAddress);

  return {
    wallet,
    signerAddress,
    envelope,
    evidence: makeBindingEvidence({
      envelope,
      signerAddress,
      signerCapabilityAddress: signerAddress
    })
  };
}

async function signModified(wallet, tx, changes) {
  return wallet.signTransaction({
    ...tx,
    ...changes
  });
}

test(
  "1S.39 rejects upstream signing-evidence ownership before invoking signing capability",
  async () => {
    for (const field of [
      "transactionSigningReady",
      "signedRawTransaction",
      "signedTransactionHash",
      "signableTransaction"
    ]) {
      const h = await makeRealHarness();

      const contaminated = Object.freeze({
        ...h.evidence,
        [field]: undefined
      });

      let calls = 0;

      await assert.rejects(
        acquireExactTransactionSigningEvidence({
          signerCapabilityBindingEvidence:
            contaminated,
          signTransaction: async tx => {
            calls += 1;
            return h.wallet.signTransaction(tx);
          }
        }),
        /must not contain/
      );

      assert.equal(calls, 0);
    }
  }
);

test(
  "1S.39 requires exact upstream authorization and capability-binding state before signing",
  async () => {
    const mutations = [
      { signerCapabilityBindingReady: false },
      { signerAuthorized: false },
      { signingAuthorized: false },
      { liveExecutionAuthorized: true },
      { broadcastAuthorized: true }
    ];

    for (const mutation of mutations) {
      const h = await makeRealHarness();

      const evidence = Object.freeze({
        ...h.evidence,
        ...mutation
      });

      let calls = 0;

      await assert.rejects(
        acquireExactTransactionSigningEvidence({
          signerCapabilityBindingEvidence:
            evidence,
          signTransaction: async tx => {
            calls += 1;
            return h.wallet.signTransaction(tx);
          }
        })
      );

      assert.equal(calls, 0);
    }
  }
);

test(
  "1S.39 requires signer, signer capability and envelope from identity before signing",
  async () => {
    const h = await makeRealHarness();

    const other =
      ethers.Wallet.createRandom().address;

    const variants = [
      Object.freeze({
        ...h.evidence,
        signerAddress: other
      }),

      Object.freeze({
        ...h.evidence,
        signerCapabilityAddress: other
      }),

      Object.freeze({
        ...h.evidence,
        transactionEnvelope:
          Object.freeze({
            ...h.envelope,
            from: other
          })
      })
    ];

    for (const evidence of variants) {
      let calls = 0;

      await assert.rejects(
        acquireExactTransactionSigningEvidence({
          signerCapabilityBindingEvidence:
            evidence,
          signTransaction: async tx => {
            calls += 1;
            return h.wallet.signTransaction(tx);
          }
        }),
        /identity|signer|envelope/i
      );

      assert.equal(calls, 0);
    }
  }
);

test(
  "1S.39 requires a signing function",
  async () => {
    const h = await makeRealHarness();

    await assert.rejects(
      acquireExactTransactionSigningEvidence({
        signerCapabilityBindingEvidence:
          h.evidence,
        signTransaction: null
      }),
      /function/
    );
  }
);

test(
  "1S.39 rejects malformed signed transaction output",
  async () => {
    const h = await makeRealHarness();

    for (const result of [
      null,
      123,
      "",
      "not-hex",
      "0xz123"
    ]) {
      let calls = 0;

      await assert.rejects(
        acquireExactTransactionSigningEvidence({
          signerCapabilityBindingEvidence:
            h.evidence,
          signTransaction: async () => {
            calls += 1;
            return result;
          }
        })
      );

      assert.equal(calls, 1);
    }
  }
);

test(
  "1S.39 rejects a signed transaction from the wrong signer",
  async () => {
    const h = await makeRealHarness();
    const wrongWallet =
      ethers.Wallet.createRandom();

    let calls = 0;

    await assert.rejects(
      acquireExactTransactionSigningEvidence({
        signerCapabilityBindingEvidence:
          h.evidence,
        signTransaction: async tx => {
          calls += 1;

          /*
           * Remove the from constraint so the deliberately
           * wrong test signer can produce valid raw bytes.
           * 1S.39 must reject them after independent recovery.
           */
          const wrongTx = { ...tx };
          delete wrongTx.from;

          return wrongWallet.signTransaction(
            wrongTx
          );
        }
      }),
      /recovered signer/
    );

    assert.equal(calls, 1);
  }
);

test(
  "1S.39 rejects every security-critical signed transaction field mutation",
  async () => {
    const cases = [
      {
        name: "chainId",
        change: () => ({ chainId: 1 }),
        pattern: /chainId/
      },
      {
        name: "nonce",
        change: tx => ({
          nonce: tx.nonce + 1
        }),
        pattern: /nonce/
      },
      {
        name: "to",
        change: () => ({
          to:
            "0x3333333333333333333333333333333333333333"
        }),
        pattern: /recipient/
      },
      {
        name: "data",
        change: () => ({
          data: "0x87654321"
        }),
        pattern: /data/
      },
      {
        name: "value",
        change: () => ({
          value: ethers.BigNumber.from(1)
        }),
        pattern: /value/
      },
      {
        name: "gasLimit",
        change: tx => ({
          gasLimit: tx.gasLimit.add(1)
        }),
        pattern: /gasLimit/
      },
      {
        name: "maxFeePerGas",
        change: tx => ({
          maxFeePerGas:
            tx.maxFeePerGas.add(1)
        }),
        pattern: /maxFeePerGas/
      },
      {
        name: "maxPriorityFeePerGas",
        change: tx => ({
          maxPriorityFeePerGas:
            tx.maxPriorityFeePerGas.add(1)
        }),
        pattern: /maxPriorityFeePerGas/
      }
    ];

    for (const c of cases) {
      const h = await makeRealHarness();
      let calls = 0;

      await assert.rejects(
        acquireExactTransactionSigningEvidence({
          signerCapabilityBindingEvidence:
            h.evidence,

          signTransaction: async tx => {
            calls += 1;

            return signModified(
              h.wallet,
              tx,
              c.change(tx)
            );
          }
        }),
        c.pattern,
        c.name
      );

      assert.equal(
        calls,
        1,
        c.name
      );
    }
  }
);

test(
  "1S.39 rejects a valid signed transaction of the wrong transaction type",
  async () => {
    const h = await makeRealHarness();
    let calls = 0;

    await assert.rejects(
      acquireExactTransactionSigningEvidence({
        signerCapabilityBindingEvidence:
          h.evidence,

        signTransaction: async tx => {
          calls += 1;

          /*
           * Build a valid legacy transaction carrying the
           * same identity-bearing transaction intent.
           * It must not satisfy the required EIP-1559 type.
           */
          return h.wallet.signTransaction({
            from: tx.from,
            to: tx.to,
            data: tx.data,
            value: tx.value,
            chainId: tx.chainId,
            nonce: tx.nonce,
            gasLimit: tx.gasLimit,
            gasPrice: tx.maxFeePerGas,
            type: 0
          });
        }
      }),
      /type/
    );

    assert.equal(calls, 1);
  }
);

test(
  "1S.39 does not grant execution or broadcast authorization",
  async () => {
    const h = await makeRealHarness();

    const result =
      await acquireExactTransactionSigningEvidence({
        signerCapabilityBindingEvidence:
          h.evidence,
        signTransaction:
          tx => h.wallet.signTransaction(tx)
      });

    assert.equal(
      result.transactionSigningReady,
      true
    );

    assert.equal(
      result.liveExecutionAuthorized,
      false
    );

    assert.equal(
      result.broadcastAuthorized,
      false
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        result,
        "executionAuthorized"
      ),
      false
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        result,
        "transactionBroadcastReady"
      ),
      false
    );
  }
);

test(
  "1S.39 production utility owns signing evidence only and contains no key acquisition or broadcast capability",
  () => {
    const fs = require("node:fs");
    const path = require("node:path");

    const source =
      fs.readFileSync(
        path.join(
          __dirname,
          "../scripts/utils/polygonV4ExactTransactionSigningEvidence.js"
        ),
        "utf8"
      );

    const forbidden = [
      "PRIVATE_KEY",
      "process.env",
      "new ethers.Wallet",
      "new Wallet",
      "getSigner(",
      "getSigners(",
      "sendTransaction",
      "sendRawTransaction",
      "broadcastTransaction",
      "provider.send",
      "provider.call"
    ];

    for (const token of forbidden) {
      assert.equal(
        source.includes(token),
        false,
        token
      );
    }

    assert.equal(
      (
        source.match(
          /await sign\(signableTransaction\)/g
        ) || []
      ).length,
      1
    );
  }
);

test(
  "1S.39 rejects a non-empty signed EIP-1559 access list even when all authorized envelope fields match",
  async () => {
    const h = await makeRealHarness();
    let calls = 0;

    await assert.rejects(
      acquireExactTransactionSigningEvidence({
        signerCapabilityBindingEvidence:
          h.evidence,

        signTransaction: async tx => {
          calls += 1;

          return h.wallet.signTransaction({
            ...tx,
            accessList: [
              {
                address: EXECUTOR,
                storageKeys: []
              }
            ]
          });
        }
      }),
      /accessList/
    );

    assert.equal(calls, 1);
  }
);

test(
  "1S.39 requires signed raw transaction to contain non-empty hex bytes",
  async () => {
    const h = await makeRealHarness();
    let calls = 0;

    await assert.rejects(
      acquireExactTransactionSigningEvidence({
        signerCapabilityBindingEvidence:
          h.evidence,

        signTransaction: async () => {
          calls += 1;
          return "0x";
        }
      }),
      /raw signed transaction/
    );

    assert.equal(calls, 1);
  }
);

test(
  "1S.39 binds signed transaction hash to parsed raw transaction with an empty access list",
  async () => {
    const h = await makeRealHarness();

    const result =
      await acquireExactTransactionSigningEvidence({
        signerCapabilityBindingEvidence:
          h.evidence,

        signTransaction:
          tx => h.wallet.signTransaction(tx)
      });

    const parsed =
      ethers.utils.parseTransaction(
        result.signedRawTransaction
      );

    assert.equal(
      result.signedTransactionHash,
      parsed.hash
    );

    assert.deepEqual(
      parsed.accessList,
      []
    );
  }
);
