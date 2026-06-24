import { statSync } from "fs";
import { stat } from "fs/promises";
import { join } from "path";
import { performance } from "perf_hooks";

async function run() {
  const files = Array.from({ length: 1000 }, (_, i) => __filename);

  const startSync = performance.now();
  for (const f of files) {
    statSync(f);
  }
  const endSync = performance.now();

  const startAsync = performance.now();
  for (const f of files) {
    await stat(f);
  }
  const endAsync = performance.now();

  const startAsyncAll = performance.now();
  await Promise.all(files.map(f => stat(f)));
  const endAsyncAll = performance.now();

  console.log(`statSync: ${endSync - startSync} ms`);
  console.log(`await stat: ${endAsync - startAsync} ms`);
  console.log(`Promise.all(stat): ${endAsyncAll - startAsyncAll} ms`);
}
run();
