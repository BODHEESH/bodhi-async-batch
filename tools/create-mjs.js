const fs = require('fs');
const path = require('path');

// Read the CommonJS version
const cjsContent = fs.readFileSync(path.join(__dirname, '../dist/index.js'), 'utf8');

// Convert to ESM
const esmContent = cjsContent
  .replace('module.exports = { asyncBatch };', 'export { asyncBatch };');

// Write ESM version
fs.writeFileSync(path.join(__dirname, '../dist/index.mjs'), esmContent);
