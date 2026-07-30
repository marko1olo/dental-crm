/*
 * REVIEWER hook (read-only): reverts the FF4 fix IN MEMORY at module load time,
 * so the committed test file and my probe can be run against pre-fix behaviour
 * without editing a single byte in the working tree.
 *
 * It undoes exactly the three characters the commit added: `\/|` inside the
 * range-separator alternation. It prints the replacement count so a silent
 * no-op cannot masquerade as "the test passes on the reverted tree".
 */
import { registerHooks } from "node:module";

let patched = 0;

registerHooks({
  load(url, context, nextLoad) {
    const result = nextLoad(url, context);
    if (!url.includes("pricelist/analyzer")) return result;
    const source = typeof result.source === "string" ? result.source : result.source?.toString();
    if (!source) return result;
    const parts = source.split("(?:-|\\/|до)");
    if (parts.length > 1) {
      patched += parts.length - 1;
      process.stderr.write(`[revert-hook] reverted ${parts.length - 1} separator list(s) in ${url}\n`);
      return { ...result, source: parts.join("(?:-|до)") };
    }
    process.stderr.write(`[revert-hook] WARNING: no separator list found in ${url}\n`);
    return result;
  },
});

process.on("exit", () => {
  process.stderr.write(`[revert-hook] total reverted sites: ${patched} (expected 3)\n`);
  if (patched !== 3) process.stderr.write("[revert-hook] REVERT DID NOT APPLY AS EXPECTED\n");
});
