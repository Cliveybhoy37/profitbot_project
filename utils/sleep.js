// utils/sleep.js
// ─────────────────────────────────────────────────────────────
// Simple promise-based sleep for retry/back-off
module.exports = ms => new Promise(r => setTimeout(r, ms));
