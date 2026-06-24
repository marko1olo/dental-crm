import { statSync } from "fs";
import { stat } from "fs/promises";
import { performance } from "perf_hooks";

async function run() {
  const fileToStat = "apps/api/src/routes/smartImports.ts";
  const files = Array.from({ length: 10000 }, (_, i) => fileToStat);

  const startSync = performance.now();
  for (const f of files) {
    try {
      statSync(f);
    } catch {}
  }
  const endSync = performance.now();

  const startAsync = performance.now();
  for (const f of files) {
    try {
      await stat(f);
    } catch {}
  }
  const endAsync = performance.now();

  const startAsyncAll = performance.now();
  await Promise.all(files.map(async f => {
      try {
          await stat(f);
      } catch {}
  }));
  const endAsyncAll = performance.now();

  console.log(`statSync: ${endSync - startSync} ms`);
  console.log(`await stat: ${endAsync - startAsync} ms`);
  console.log(`Promise.all(stat): ${endAsyncAll - startAsyncAll} ms`);
}
run();
