import { client } from "../db/client.js";

console.log("PGlite dataDir:", (client as any).dataDir);
console.log("PGlite options:", (client as any).options);
