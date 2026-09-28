"use strict";

// READ-ONLY Polygon token candidate validation.
// Historical/public addresses are proposals only.
// No signer, wallet, approvals, flashloans, or transaction submission.

require("dotenv").config();

const { ethers } = require("ethers");

const RPC_URL = process.env.ALCHEMY_POLYGON;
if (!RPC_URL) throw new Error("Missing ALCHEMY_POLYGON");

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function name() view returns (string)"
];

const CANDIDATES = Object.freeze({
  USDT_A: "0x3813e82e6f7098b9583FC0F33a962D02018B6803",
  USDT_B: "0xC2132D05D31c914A87C6611C10748AaCbA5E262",
  FRAX: "0x45c32fA6DF82ead1e2EF74d17b76547EDdFaFF89",
  AAVE: "0xD6DF932A45C0f255f85145f286eA0b292B21C90B",
  LINK: "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39",
  GHO: "0x3F56e0c36d275367b8C502090EDF38289b3dEa0d",
  LUSD: "0x93b346b6BC2548dA6A1E7d98E9a421B42541425b",
  CRV: "0x172370d5Cd63279eFa6d502DAB29171933a610AF",
  BAL: "0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3",
  MKR: "0x6f7C932e7684666C9fd1d44527765433e01fF61d",
  GHST: "0x385EeAC5CB85A38A9A07A70C73E0A3271CFB54A7",
  XSGD: "0x6F3F3F07F7C56A24C2E6D8E7B7545F1C5EDB866F",
  EURE: "0x6E2F2ACA7E5D4E8E4D273BF2C1E85B86AFCDBD0D",
  JEUR: "0x4E3FBD56CD56C3E72C1403E103B45DB9DA5B9D2B",
  WSTETH: "0x7F39c581f595B53c5cBf6846C5a1B4d57C0bfAB0",
  CBETH: "0x1E0B299207B77EEC4AD1E5D6A97A9363AE6A9EB5",
  RETH: "0xEABFAB88F209C4F9E5F4DF2DE32B32D46E4CDCC8",
  MATICX: "0xFA68FB4628DFF1028CFEC22B4162FCCD0D45EFB6",
  OLD_WPOL_CANDIDATE: "0xAA9654BECCA45B5BDFA5AC646C939C62B527D394",
  TEL: "0xD1D2EB1B1E90B638588728B4130137D262C87CAE",
  MTLSTR: "0x4D295F2D1F5A580D924F6FBC1FEF2C1A6FE2CE65",
  EGX: "0x984A67F1A0D87073E32FBBD5F107CEB1D01F67F0",
  MSGLD: "0x42AF526F7B3622E3E78B54F4E10983741EE5A1E1",
  TRUMATIC: "0x77151BE8D6D0C91EB9C5CF7E57F0FD1F88A8E199",
  GYD: "0x4F5744D07B9C114B18C1D93B8A9EF6AFBD06E71D",
  TETU: "0x255707B70BF90AA112006E1B07B9AEA6DE021424",
  OLAS: "0xD6AFC86A8F58414D8C8A05B6E3417F7C7C6ADC9A",
  APE: "0xDF9C0B82A0BB1B1A7F8C568D43DD168AE0E3CE3A",
  PAR: "0x68037790A0229e9Ce6EaA8A99ea92964106C4703",
  ONEINCH: "0x9c2C5fd7b07E95EE044DDeba0E97a665F142394f"
});

async function validateCandidate(label, rawAddress, blockTag) {
  let address;

  try {
    address = ethers.utils.getAddress(rawAddress);
  } catch (error) {
    return {
      label,
      rawAddress,
      status: "INVALID_ADDRESS",
      error: error.message
    };
  }

  const code = await provider.getCode(address, blockTag);

  if (!code || code === "0x") {
    return {
      label,
      address,
      status: "NO_CODE"
    };
  }

  const token = new ethers.Contract(address, ERC20_ABI, provider);

  try {
    const [symbol, decimals, name] = await Promise.all([
      token.symbol({ blockTag }),
      token.decimals({ blockTag }),
      token.name({ blockTag })
    ]);

    return {
      label,
      address,
      status: "ERC20_READABLE",
      symbol,
      decimals: Number(decimals),
      name,
      codeBytes: (code.length - 2) / 2
    };
  } catch (error) {
    return {
      label,
      address,
      status: "CONTRACT_METADATA_FAILED",
      codeBytes: (code.length - 2) / 2,
      error: error.message
    };
  }
}

async function main() {
  const blockTag = await provider.getBlockNumber();

  console.log(`Polygon snapshot block: ${blockTag}`);
  console.log("Mode: READ-ONLY token candidate validation");
  console.log("Live execution: OFF\n");

  const results = [];

  for (const [label, address] of Object.entries(CANDIDATES)) {
    results.push(
      await validateCandidate(label, address, blockTag)
    );
  }

  for (const result of results) {
    if (result.status === "ERC20_READABLE") {
      console.log(
        `OK   ${result.label.padEnd(20)} ` +
        `${result.address} | ${result.symbol} | ` +
        `${result.decimals} decimals | ${result.name}`
      );
    } else {
      console.log(
        `SKIP ${result.label.padEnd(20)} ` +
        `${result.address || result.rawAddress} | ${result.status}`
      );
    }
  }

  const valid = results.filter(
    result => result.status === "ERC20_READABLE"
  );

  console.log("\n========================================");
  console.log("SUMMARY");
  console.log("========================================");
  console.log(`Candidates: ${results.length}`);
  console.log(`ERC20-readable: ${valid.length}`);
  console.log(`Rejected/unreadable: ${results.length - valid.length}`);
  console.log("Live execution: OFF");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
