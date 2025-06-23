require("dotenv").config();

const networks = process.env.TRADE_TARGETS?.split(",") || ["polygon"];
const scriptName = process.env.TRADE_SCRIPT || "interact_flashloan.js";

module.exports = { networks, scriptName };

