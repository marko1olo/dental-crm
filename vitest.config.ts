import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
	test: {
		alias: {
			"node:test": fileURLToPath(new URL("./scripts/vitestNodeTestShim.ts", import.meta.url)),
		},
	},
});
