const fs = require('fs/promises');
const path = require('path');

async function check() {
  const file = "apps/api/src/routes/smartImports.ts";
  console.log("await stat:", await fs.stat(file));
}

check();
