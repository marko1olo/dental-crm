import { statSync } from "fs";
import { stat } from "fs/promises";
import { performance } from "perf_hooks";

async function run() {
  const fileToStat = "apps/api/src/routes/smartImports.ts";
  const numFiles = 10000;

  const startSync = performance.now();
  let blockTimeSync = 0;
  for (let i = 0; i < numFiles; i++) {
    const s = performance.now();
    try {
      statSync(fileToStat);
    } catch {}
    blockTimeSync += (performance.now() - s);
  }
  const endSync = performance.now();

  const startAsync = performance.now();
  let maxBlockAsync = 0;
  for (let i = 0; i < numFiles; i++) {
    const s = performance.now();
    try {
      await stat(fileToStat);
    } catch {}
    const diff = performance.now() - s;
    if (diff > maxBlockAsync) maxBlockAsync = diff;
  }
  const endAsync = performance.now();

  console.log(`Sync mode - Total Time: ${endSync - startSync} ms, Event loop blocked for: ${blockTimeSync} ms`);
  console.log(`Async mode - Total Time: ${endAsync - startAsync} ms, Max single block: ${maxBlockAsync} ms`);
}
run();
