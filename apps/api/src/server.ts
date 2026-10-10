import "dotenv/config";
import "./env/assertEnvOnBoot.js";
import { pathToFileURL } from "node:url";
import { startDenteApiServer } from "./serverModules/index.js";

export {
	createDenteApiApp,
	startDenteApiServer,
	setupProxyAndTunnels,
} from "./serverModules/index.js";
export type * from "./serverModules/types.js";

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	await startDenteApiServer();
}
