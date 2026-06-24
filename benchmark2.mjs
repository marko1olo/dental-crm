import { statSync } from "fs";
import { stat } from "fs/promises";
import { performance } from "perf_hooks";

async function run() {
  const fileToStat = "apps/api/src/routes/smartImports.ts";
  const files = Array.from({ length: 100 }, (_, i) => fileToStat);

  // Real-world scenario simulation. A lot of other work can be blocked by statSync.
  // Wait, the prompt says "Replace statSync with await stat from fs/promises".
  // But my benchmark showed await stat to be slower? Let's check node versions or context.

  // Node.js sync methods are blocking event loop, while async methods are not.
  // Although the micro-benchmark showed async taking longer in total execution time due to Promise overhead,
  // sync methods block the Node.js event loop, preventing concurrent connections from being processed.
  // We'll write a better benchmark simulating event loop blocking.
}
run();
