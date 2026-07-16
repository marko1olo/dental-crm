import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DB path resolver as in client.ts (which is in src/db/client.ts, which is nested 1 level deeper than src/scripts/)
const dbPathFromScripts = path.resolve(__dirname, "../db/client.ts");
console.log("Scripts dirname:", __dirname);
console.log("Resolved client.ts path:", dbPathFromScripts);

// Mimic client.ts:
const clientDirname = path.dirname(dbPathFromScripts);
const dbPath = path.resolve(clientDirname, "../../dente-db");
console.log("Resolved dente-db path:", dbPath);
