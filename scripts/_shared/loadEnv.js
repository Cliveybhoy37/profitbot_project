const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '..', '..', '.env'),
  override: true          // <= NEW: .env always overrides the shell
});
