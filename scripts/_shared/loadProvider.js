require('./loadEnv');              // ensures .env is loaded first
const { ethers } = require('ethers');

const url = process.env.RPC_URL;
if (!url) throw new Error('🚨  RPC_URL not set.  Set it in .env or export it.');

module.exports = new ethers.providers.JsonRpcProvider(url, 137); // 137 = Polygon
